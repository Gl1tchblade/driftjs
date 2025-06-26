/**
 * ORM-specific types and interfaces
 */

import { DatabaseConfig, FilePath, DetectionResult } from './common.js'

/**
 * ORM detection and configuration
 */
export interface ORMConfig {
  type: string
  version?: string
  configFile?: FilePath
  migrationDirectory: FilePath
  schemaFile?: FilePath
  dependencies: string[]
}

/**
 * ORM detector interface - implemented by each ORM detector
 */
export interface ORMDetector {
  name: string
  detect(projectPath: string): Promise<DetectionResult>
  extractConfig(projectPath: string): Promise<ORMConfig | null>
  getDatabaseConfig(projectPath: string): Promise<DatabaseConfig | null>
}

/**
 * Prisma-specific configuration
 */
export interface PrismaConfig extends ORMConfig {
  type: 'prisma'
  schemaFile: FilePath
  clientGenerator?: {
    provider: string
    output?: string
  }
}

/**
 * Drizzle-specific configuration
 */
export interface DrizzleConfig extends ORMConfig {
  type: 'drizzle'
  configFile: FilePath
  driver: 'pg' | 'mysql2' | 'better-sqlite3' | 'sqlite'
  schemaPath: string
  outDir: string
}

/**
 * TypeORM-specific configuration  
 */
export interface TypeORMConfig extends ORMConfig {
  type: 'typeorm'
  entities: string[]
  migrations: string[]
  subscribers?: string[]
  cli?: {
    migrationsDir: string
    entitiesDir: string
  }
} 