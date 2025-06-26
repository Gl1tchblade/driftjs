/**
 * Prisma ORM detector implementation
 */

import { join } from 'path'
import { BaseORMDetector } from './base-detector.js'
import { PrismaConfig } from '../../core/index.js'
import { DatabaseConfig, DetectionResult } from '../../core/index.js'
import { readFileContent, createFilePath } from '../../core/index.js'

export class PrismaDetector extends BaseORMDetector {
  name = 'prisma'
  
  /**
   * Detect Prisma in the project
   */
  async detect(projectPath: string): Promise<DetectionResult> {
    const evidence: string[] = []
    const warnings: string[] = []
    
    // Check for Prisma dependencies
    const { found: foundDeps, missing: missingDeps } = await this.checkPackageJsonDependencies(
      projectPath,
      ['prisma', '@prisma/client']
    )
    
    evidence.push(...foundDeps.map(dep => `Found dependency: ${dep}`))
    
    // Check for Prisma schema file
    const { existing: schemaFiles } = await this.checkFiles(projectPath, [
      'prisma/schema.prisma',
      'schema.prisma'
    ])
    
    if (schemaFiles.length > 0) {
      evidence.push(`Found schema file: ${schemaFiles[0].relative}`)
    }
    
    // Check for migration directory
    const { existing: migrationDirs } = await this.checkFiles(projectPath, [
      'prisma/migrations'
    ])
    
    if (migrationDirs.length > 0) {
      evidence.push(`Found migrations directory: ${migrationDirs[0].relative}`)
    }
    
    // Look for generated Prisma client
    const generatedFiles = await this.findFilesByPattern(
      projectPath,
      [/node_modules\/@prisma\/client/],
      ['node_modules']
    )
    
    if (generatedFiles.length > 0) {
      evidence.push('Found generated Prisma client')
    }
    
    // Calculate confidence
    const confidence = this.calculateConfidence({
      required: { found: foundDeps.length, total: 2 }, // prisma + @prisma/client
      optional: { found: schemaFiles.length + migrationDirs.length, total: 2 },
      negative: 0
    })
    
    // Add warnings for incomplete setup
    if (foundDeps.length > 0 && schemaFiles.length === 0) {
      warnings.push('Prisma dependency found but no schema.prisma file detected')
    }
    
    if (schemaFiles.length > 0 && !foundDeps.includes('@prisma/client')) {
      warnings.push('Schema file found but @prisma/client not installed')
    }
    
    return {
      found: confidence > 0.5,
      confidence,
      evidence,
      warnings: warnings.length > 0 ? warnings : undefined
    }
  }
  
  /**
   * Extract Prisma configuration
   */
  async extractConfig(projectPath: string): Promise<PrismaConfig | null> {
    // Find schema file
    const { existing: schemaFiles } = await this.checkFiles(projectPath, [
      'prisma/schema.prisma',
      'schema.prisma'
    ])
    
    if (schemaFiles.length === 0) {
      return null
    }
    
    const schemaFile = schemaFiles[0]
    const migrationDirectory = await createFilePath('prisma/migrations', projectPath)
    
    // Parse schema file for generator and database info
    const schemaResult = await readFileContent(schemaFile.absolute)
    if (!schemaResult.success) {
      return null
    }
    
    // Extract client generator config
    let clientGenerator: PrismaConfig['clientGenerator']
    const generatorMatch = schemaResult.data.match(/generator\s+client\s*{([^}]+)}/s)
    if (generatorMatch) {
      const generatorConfig = generatorMatch[1]
      const providerMatch = generatorConfig.match(/provider\s*=\s*"([^"]+)"/)
      const outputMatch = generatorConfig.match(/output\s*=\s*"([^"]+)"/)
      
      clientGenerator = {
        provider: providerMatch?.[1] || 'prisma-client-js',
        output: outputMatch?.[1]
      }
    }
    
    return {
      type: 'prisma',
      configFile: schemaFile,
      migrationDirectory,
      schemaFile,
      dependencies: ['prisma', '@prisma/client'],
      clientGenerator
    }
  }
  
  /**
   * Extract database configuration from Prisma schema
   */
  async getDatabaseConfig(projectPath: string): Promise<DatabaseConfig | null> {
    const config = await this.extractConfig(projectPath)
    if (!config) {
      return null
    }
    
    // Read schema file
    const schemaResult = await readFileContent(config.schemaFile.absolute)
    if (!schemaResult.success) {
      return null
    }
    
    // Parse datasource block
    const datasourceMatch = schemaResult.data.match(/datasource\s+\w+\s*{([^}]+)}/s)
    if (!datasourceMatch) {
      return null
    }
    
    const datasourceConfig = datasourceMatch[1]
    
    // Extract provider
    const providerMatch = datasourceConfig.match(/provider\s*=\s*"([^"]+)"/)
    const provider = providerMatch?.[1]
    
    // Extract URL
    const urlMatch = datasourceConfig.match(/url\s*=\s*env\("([^"]+)"\)/) ||
                    datasourceConfig.match(/url\s*=\s*"([^"]+)"/)
    
    if (!urlMatch) {
      return null
    }
    
    let databaseUrl: string
    if (urlMatch[0].includes('env(')) {
      // Environment variable reference
      const envVar = urlMatch[1]
      databaseUrl = process.env[envVar] || ''
      
      if (!databaseUrl) {
        // Return basic config with type only
        return {
          type: this.mapPrismaProviderToType(provider),
          database: 'unknown'
        }
      }
    } else {
      // Direct URL
      databaseUrl = urlMatch[1]
    }
    
    // Parse the database URL
    const dbConfig = this.parseDatabaseUrl(databaseUrl)
    if (dbConfig) {
      return dbConfig
    }
    
    // Fallback to provider-based detection
    return {
      type: this.mapPrismaProviderToType(provider),
      database: 'unknown'
    }
  }
  
  /**
   * Map Prisma provider to database type
   */
  private mapPrismaProviderToType(provider?: string): DatabaseConfig['type'] {
    switch (provider) {
      case 'postgresql':
        return 'postgresql'
      case 'mysql':
        return 'mysql'
      case 'sqlite':
        return 'sqlite'
      default:
        return 'postgresql' // Default assumption
    }
  }
} 