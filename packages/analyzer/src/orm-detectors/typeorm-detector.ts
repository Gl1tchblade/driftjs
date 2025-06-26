/**
 * TypeORM detector implementation
 * Detects TypeORM projects by looking for ormconfig files, entity patterns, and migrations
 */

import { BaseORMDetector } from './base-detector.js'
import { TypeORMConfig } from '@driftjs/core'
import { DatabaseConfig, DetectionResult } from '@driftjs/core'
import path from 'path'
import fs from 'fs/promises'

export class TypeORMDetector extends BaseORMDetector {
  name = 'typeorm'
  
  async detect(projectPath: string): Promise<DetectionResult> {
    const evidence: string[] = []
    
    try {
      // Check for TypeORM config files
      const configFiles = [
        'ormconfig.ts',
        'ormconfig.js',
        'ormconfig.json',
        'typeorm.config.ts',
        'typeorm.config.js',
        'src/data-source.ts',
        'src/data-source.js'
      ]
      
      const { existing: configFilesFound } = await this.checkFiles(projectPath, configFiles)
      evidence.push(...configFilesFound.map(f => `Found config file: ${f.relative}`))
      
      // Check for package.json with TypeORM dependencies
      const deps = await this.checkPackageJsonDependencies(projectPath, ['typeorm', '@nestjs/typeorm'])
      evidence.push(...deps.found.map(dep => `Found dependency: ${dep}`))
      
      // Check for common entity file patterns
      const entityPatterns = await this.findFilesByPattern(
        projectPath,
        [/\.entity\.(ts|js)$/, /@Entity\(/],
        ['src', 'entities', 'entity']
      )
      if (entityPatterns.length > 0) {
        evidence.push(`Found ${entityPatterns.length} entity files`)
      }
      
      // Check for migrations directory
      const migrationDirs = ['src/migrations', 'migrations', 'database/migrations']
      const { existing: migrationDirsFound } = await this.checkFiles(projectPath, migrationDirs)
      evidence.push(...migrationDirsFound.map(f => `Found migration directory: ${f.relative}`))
      
      // Check for migration files
      const migrationPatterns = await this.findFilesByPattern(
        projectPath,
        [/\d+.*\.(ts|js)$/],
        ['src/migrations', 'migrations', 'database/migrations']
      )
      if (migrationPatterns.length > 0) {
        evidence.push(`Found ${migrationPatterns.length} migration files`)
      }
      
      // Calculate confidence using helper
      const confidence = this.calculateConfidence({
        required: { 
          found: deps.found.length > 0 ? 1 : 0, 
          total: 1 
        },
        optional: { 
          found: configFilesFound.length + (entityPatterns.length > 0 ? 1 : 0) + migrationDirsFound.length + (migrationPatterns.length > 0 ? 1 : 0), 
          total: 4 
        },
        negative: 0
      })
      
      return {
        found: confidence > 0.3,
        confidence: Math.round(confidence * 100),
        evidence
      }
    } catch (error) {
      return {
        found: false,
        confidence: 0,
        evidence: [`Error detecting TypeORM: ${error}`]
      }
    }
  }
  
  async extractConfig(projectPath: string): Promise<TypeORMConfig | null> {
    try {
      // Try to find TypeORM config file
      const configFiles = [
        'ormconfig.ts',
        'ormconfig.js',
        'ormconfig.json',
        'typeorm.config.ts',
        'typeorm.config.js',
        'src/data-source.ts',
        'src/data-source.js'
      ]
      
      const { existing: configFilesFound } = await this.checkFiles(projectPath, configFiles)
      if (configFilesFound.length === 0) {
        return null
      }
      
      const configFile = configFilesFound[0]
      let entities: string[] = []
      let migrations: string[] = []
      
      if (configFile.relative.endsWith('.json')) {
        // Parse JSON config
        const configContent = await fs.readFile(configFile.absolute, 'utf-8')
        const jsonConfig = JSON.parse(configContent)
        entities = Array.isArray(jsonConfig.entities) ? jsonConfig.entities : ['src/**/*.entity.{ts,js}']
        migrations = Array.isArray(jsonConfig.migrations) ? jsonConfig.migrations : ['src/migrations/*.{ts,js}']
      } else {
        // Parse TypeScript/JavaScript config (basic parsing)
        const configContent = await fs.readFile(configFile.absolute, 'utf-8')
        entities = this.extractArrayValue(configContent, 'entities') || ['src/**/*.entity.{ts,js}']
        migrations = this.extractArrayValue(configContent, 'migrations') || ['src/migrations/*.{ts,js}']
      }
      
      const config: TypeORMConfig = {
        type: 'typeorm',
        configFile,
        entities,
        migrations,
        migrationDirectory: configFile, // Will be updated with proper migration directory  
        dependencies: ['typeorm'],
        cli: {
          migrationsDir: 'src/migrations',
          entitiesDir: 'src/entities'
        }
      }
      
      return config
    } catch (error) {
      console.warn(`Failed to extract TypeORM config: ${error}`)
      return null
    }
  }
  
  async getDatabaseConfig(projectPath: string): Promise<DatabaseConfig | null> {
    try {
      // Look for database URL in various places
      const envFiles = ['.env', '.env.local', '.env.development']
      const { existing: envFilesFound } = await this.checkFiles(projectPath, envFiles)
      
      for (const envFile of envFilesFound) {
        const envContent = await fs.readFile(envFile.absolute, 'utf-8')
        const dbUrl = this.extractEnvValue(envContent, 'DATABASE_URL') || 
                      this.extractEnvValue(envContent, 'DB_URL') ||
                      this.extractEnvValue(envContent, 'TYPEORM_URL')
        if (dbUrl) {
          const parsed = this.parseDatabaseUrl(dbUrl)
          if (parsed) return parsed
        }
      }
      
      // Try to extract from TypeORM config
      const typeormConfig = await this.extractConfig(projectPath)
      if (typeormConfig?.configFile) {
        const configContent = await fs.readFile(typeormConfig.configFile.absolute, 'utf-8')
        
        // Extract database configuration from config file
        const type = this.extractConfigValue(configContent, 'type')
        const host = this.extractConfigValue(configContent, 'host')
        const port = this.extractConfigValue(configContent, 'port')
        const database = this.extractConfigValue(configContent, 'database')
        const username = this.extractConfigValue(configContent, 'username')
        const password = this.extractConfigValue(configContent, 'password')
        
        if (type && database) {
          const dbTypeMap: Record<string, 'postgresql' | 'mysql' | 'sqlite'> = {
            'postgres': 'postgresql',
            'postgresql': 'postgresql',
            'mysql': 'mysql',
            'mariadb': 'mysql',
            'sqlite': 'sqlite'
          }
          
          const mappedType = dbTypeMap[type] || 'postgresql'
          
          return {
            type: mappedType,
            host: host || 'localhost',
            port: port ? parseInt(port) : (mappedType === 'postgresql' ? 5432 : mappedType === 'mysql' ? 3306 : undefined),
            database,
            username,
            password
          }
        }
      }
      
      // Fallback defaults
      return {
        type: 'postgresql',
        host: 'localhost',
        port: 5432,
        database: 'main'
      }
    } catch (error) {
      console.warn(`Failed to extract database config: ${error}`)
      return null
    }
  }
  
  private extractConfigValue(content: string, key: string): string | undefined {
    // Simple regex-based extraction - in production, use proper AST parsing
    const regex = new RegExp(`${key}:\\s*['"]([^'"]+)['"]`)
    const match = content.match(regex)
    return match?.[1]
  }
  
  private extractArrayValue(content: string, key: string): string[] | undefined {
    // Basic array extraction - in production, use proper AST parsing
    const regex = new RegExp(`${key}:\\s*\\[([^\\]]+)\\]`)
    const match = content.match(regex)
    if (!match) return undefined
    
    return match[1]
      .split(',')
      .map(item => item.trim().replace(/['"]/g, ''))
      .filter(item => item.length > 0)
  }
  
  private extractEnvValue(content: string, key: string): string | undefined {
    const regex = new RegExp(`^${key}\\s*=\\s*(.+)$`, 'm')
    const match = content.match(regex)
    return match?.[1]?.replace(/['"]/g, '').trim()
  }
} 