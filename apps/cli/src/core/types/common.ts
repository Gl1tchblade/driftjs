/**
 * Common types used across DriftJS packages
 */

export type DatabaseType = 'postgresql' | 'mysql' | 'sqlite' | 'mariadb'
export type ORMType = 'prisma' | 'drizzle' | 'typeorm'

/**
 * Generic result type for operations that can fail
 */
export type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E }

/**
 * Configuration for database connection
 */
export interface DatabaseConfig {
  type: DatabaseType
  host?: string
  port?: number
  database: string
  username?: string
  password?: string
  url?: string
  ssl?: boolean | object
}

/**
 * File path utilities
 */
export interface FilePath {
  absolute: string
  relative: string
  exists: boolean
}

/**
 * Detection result for file/directory analysis
 */
export interface DetectionResult {
  found: boolean
  confidence: number // 0-1 score
  evidence: string[]
  warnings?: string[]
}

/**
 * Base configuration interface
 */
export interface BaseConfig {
  version: string
  verbose?: boolean
  dryRun?: boolean
} 