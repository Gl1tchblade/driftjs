/**
 * Migration analysis and enhancement types
 */

import { DatabaseType } from './common.js'

/**
 * Parsed migration operation
 */
export interface MigrationOperation {
  type: OperationType
  table?: string
  column?: string
  sql: string
  metadata: OperationMetadata
  risks: RiskAssessment[]
  estimatedDuration?: number
}

/**
 * Types of migration operations
 */
export type OperationType = 
  | 'CREATE_TABLE'
  | 'DROP_TABLE'
  | 'ADD_COLUMN'
  | 'DROP_COLUMN'
  | 'ALTER_COLUMN'
  | 'RENAME_COLUMN'
  | 'ADD_INDEX'
  | 'DROP_INDEX'
  | 'ADD_CONSTRAINT'
  | 'DROP_CONSTRAINT'
  | 'RAW_SQL'

/**
 * Operation metadata for analysis
 */
export interface OperationMetadata {
  affectedRows?: number
  lockLevel: 'NONE' | 'SHARED' | 'EXCLUSIVE'
  reversible: boolean
  dataLoss: boolean
  performance: 'LOW' | 'MEDIUM' | 'HIGH'
}

/**
 * Risk assessment for operations
 */
export interface RiskAssessment {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  category: RiskCategory
  description: string
  mitigation?: string
}

/**
 * Risk categories
 */
export type RiskCategory = 
  | 'DATA_LOSS'
  | 'DOWNTIME'
  | 'PERFORMANCE'
  | 'CONSTRAINT_VIOLATION'
  | 'LOCK_TIMEOUT'
  | 'DISK_SPACE'

/**
 * Migration file representation
 */
export interface MigrationFile {
  path: string
  name: string
  timestamp: Date
  operations: MigrationOperation[]
  up: string
  down?: string
  checksum: string
}

/**
 * Enhanced migration with safety features
 */
export interface EnhancedMigration {
  original: MigrationFile
  enhanced: {
    up: string
    down: string
    preFlightChecks: string[]
    postMigrationValidation: string[]
    rollbackStrategy: string[]
  }
  estimatedDuration: number
  maintenanceWindow?: {
    required: boolean
    estimatedMinutes: number
  }
}

/**
 * Migration enhancement strategy
 */
export interface EnhancementStrategy {
  name: string
  description: string
  applies: (operation: MigrationOperation, context: MigrationContext) => boolean
  enhance: (operation: MigrationOperation, context: MigrationContext) => MigrationOperation[]
  risks: RiskAssessment[]
}

/**
 * Context for migration enhancement
 */
export interface MigrationContext {
  database: DatabaseType
  tableSize?: number
  hasData: boolean
  indexes: string[]
  constraints: string[]
  dependencies: string[]
} 