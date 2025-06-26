/**
 * Drizzle ORM detector implementation
 * Detects Drizzle projects by looking for drizzle.config.ts/js files and schema patterns
 */

import { BaseORMDetector } from './base-detector.js'
import { DrizzleConfig } from '@driftjs/core'
import { DatabaseConfig, DetectionResult } from '@driftjs/core'
import path from 'path'
import fs from 'fs-extra'

export class DrizzleDetector extends BaseORMDetector {
  name = 'drizzle'
  
  async detect(projectPath: string): Promise<DetectionResult> {
    const evidence: string[] = []
    
    try {
      console.log(`🔍 Drizzle Detection starting in: ${projectPath}`)
      
      // Check for drizzle.config.ts/js files in root and common monorepo patterns
      const configFiles = [
        'drizzle.config.ts',
        'drizzle.config.js',
        'drizzle.config.mjs'
      ]
      
      // Also check in common monorepo locations
      const monorepoConfigFiles = [
        ...configFiles, // root level
        ...configFiles.map(f => `apps/server/${f}`),
        ...configFiles.map(f => `apps/api/${f}`),
        ...configFiles.map(f => `packages/server/${f}`),
        ...configFiles.map(f => `packages/api/${f}`),
        ...configFiles.map(f => `backend/${f}`),
        ...configFiles.map(f => `server/${f}`)
      ]
      
      console.log(`🔍 Searching for config files:`, monorepoConfigFiles)
      
      const { existing: configFilesFound } = await this.checkFiles(projectPath, monorepoConfigFiles)
      console.log(`✅ Config files found:`, configFilesFound.map(f => f.relative))
      evidence.push(...configFilesFound.map(f => `Found config file: ${f.relative}`))
       
       // Check for package.json with drizzle dependencies - check root and config directories
       console.log(`🔍 Checking root dependencies in: ${projectPath}`)
       let deps = await this.checkPackageJsonDependencies(projectPath, ['drizzle-orm', 'drizzle-kit'])
       console.log(`📦 Root dependencies found:`, deps.found)
       evidence.push(...deps.found.map(dep => `Found dependency: ${dep} (root)`))
       
       // Also check for dependencies in the same directory as any found config files
       for (const configFile of configFilesFound) {
         const configDir = path.dirname(configFile.absolute)
         console.log(`🔍 Checking dependencies in config dir: ${configDir}`)
         const configDeps = await this.checkPackageJsonDependencies(configDir, ['drizzle-orm', 'drizzle-kit'])
         console.log(`📦 Config dir dependencies found:`, configDeps.found)
         evidence.push(...configDeps.found.map(dep => `Found dependency: ${dep} (${configFile.relative})`))
         // Merge the found dependencies
         deps.found = [...new Set([...deps.found, ...configDeps.found])]
       }
       
       console.log(`📦 Total dependencies found:`, deps.found)
       
       // Check for common schema file patterns
       const schemaPatterns = [
         'src/db/schema.ts',
         'src/schema.ts',
         'db/schema.ts',
         'schema.ts',
         'src/lib/db/schema.ts'
       ]
       
       const { existing: schemaFiles } = await this.checkFiles(projectPath, schemaPatterns)
       evidence.push(...schemaFiles.map(f => `Found schema file: ${f.relative}`))
       
       // Check for migrations directory
       const migrationDirs = ['drizzle', 'migrations', 'drizzle/migrations']
       const { existing: migrationDirsFound } = await this.checkFiles(projectPath, migrationDirs)
       evidence.push(...migrationDirsFound.map(f => `Found migration directory: ${f.relative}`))
      
      // Calculate confidence using helper
      const confidenceInput = {
        required: { 
          found: deps.found.length > 0 ? 1 : 0, 
          total: 1 
        },
        optional: { 
          found: (configFilesFound.length > 0 ? 1 : 0) + (schemaFiles.length > 0 ? 1 : 0) + (migrationDirsFound.length > 0 ? 1 : 0), 
          total: 3  // config files, schema files, migration dirs
        },
        negative: 0
      }
      
      console.log(`🎯 Confidence calculation input:`, confidenceInput)
      
      const confidence = this.calculateConfidence(confidenceInput)
      
      console.log(`🎯 Final confidence: ${confidence} (${Math.round(confidence * 100)}%)`)
      console.log(`🎯 Detection threshold: 30%`)
      console.log(`🎯 Will detect: ${confidence > 0.3}`)
      
      return {
        found: confidence > 0.3,
        confidence: Math.round(confidence * 100),
        evidence
      }
    } catch (error) {
      return {
        found: false,
        confidence: 0,
        evidence: [`Error detecting Drizzle: ${error}`]
      }
    }
  }
  
  async extractConfig(projectPath: string): Promise<DrizzleConfig | null> {
    try {
      // Try to find drizzle config file in root and common monorepo patterns
      const configFiles = [
        'drizzle.config.ts',
        'drizzle.config.js',
        'drizzle.config.mjs'
      ]
      
      // Also check in common monorepo locations
      const monorepoConfigFiles = [
        ...configFiles, // root level
        ...configFiles.map(f => `apps/server/${f}`),
        ...configFiles.map(f => `apps/api/${f}`),
        ...configFiles.map(f => `packages/server/${f}`),
        ...configFiles.map(f => `packages/api/${f}`),
        ...configFiles.map(f => `backend/${f}`),
        ...configFiles.map(f => `server/${f}`)
      ]
      
      const { existing: configFilesFound } = await this.checkFiles(projectPath, monorepoConfigFiles)
      if (configFilesFound.length === 0) {
        return null
      }
      
      const configFile = configFilesFound[0]
      const configContent = await fs.readFile(configFile.absolute, 'utf-8')
      
      // Basic config parsing - in production, we'd use a proper TS/JS parser
      const driver = this.extractConfigValue(configContent, 'dialect') || 'pg'
      const validDrivers = ['pg', 'mysql2', 'better-sqlite3', 'sqlite'] as const
      const mappedDriver = validDrivers.includes(driver as any) ? driver as typeof validDrivers[number] : 'pg'
      const outDir = this.extractConfigValue(configContent, 'out') || './drizzle'
      const migrationDirAbsolute = path.resolve(projectPath, outDir)
      
      const config: DrizzleConfig = {
        type: 'drizzle',
        configFile,
        driver: mappedDriver,
        schemaPath: this.extractConfigValue(configContent, 'schema') || './src/db/schema.ts',
        outDir: outDir,
        migrationDirectory: {
          absolute: migrationDirAbsolute,
          relative: outDir,
          exists: await fs.pathExists(migrationDirAbsolute)
        },
        dependencies: ['drizzle-orm', 'drizzle-kit']
      }
      
      return config
    } catch (error) {
      console.warn(`Failed to extract Drizzle config: ${error}`)
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
        const dbUrl = this.extractEnvValue(envContent, 'DATABASE_URL')
        if (dbUrl) {
          const parsed = this.parseDatabaseUrl(dbUrl)
          if (parsed) return parsed
        }
      }
      
      // Fallback: try to extract from drizzle config
      const drizzleConfig = await this.extractConfig(projectPath)
      if (!drizzleConfig) return null
      
      // Map Drizzle driver to database type
      const driverMap: Record<string, 'postgresql' | 'mysql' | 'sqlite'> = {
        'pg': 'postgresql',
        'mysql2': 'mysql',
        'better-sqlite3': 'sqlite'
      }
      
      const dbType = driverMap[drizzleConfig.driver] || 'postgresql'
      
      return {
        type: dbType,
        host: 'localhost',
        port: dbType === 'postgresql' ? 5432 : dbType === 'mysql' ? 3306 : undefined,
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
  
  private extractEnvValue(content: string, key: string): string | undefined {
    const regex = new RegExp(`^${key}\\s*=\\s*(.+)$`, 'm')
    const match = content.match(regex)
    return match?.[1]?.replace(/['"]/g, '').trim()
  }
} 