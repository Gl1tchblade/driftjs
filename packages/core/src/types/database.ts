/**
 * Database analysis and connection types
 */

import { DatabaseType } from './common.js'

/**
 * Database connection interface
 */
export interface DatabaseConnection {
  type: DatabaseType
  isConnected: boolean
  connect(): Promise<void>
  disconnect(): Promise<void>
  query<T = any>(sql: string, params?: any[]): Promise<T[]>
  transaction<T>(callback: (connection: DatabaseConnection) => Promise<T>): Promise<T>
}

/**
 * Table metadata from database analysis
 */
export interface TableMetadata {
  name: string
  schema?: string
  rowCount: number
  sizeBytes: number
  columns: ColumnMetadata[]
  indexes: IndexMetadata[]
  constraints: ConstraintMetadata[]
  dependencies: TableDependency[]
}

/**
 * Column metadata
 */
export interface ColumnMetadata {
  name: string
  type: string
  nullable: boolean
  defaultValue?: any
  isPrimary: boolean
  isUnique: boolean
  references?: {
    table: string
    column: string
  }
}

/**
 * Index metadata
 */
export interface IndexMetadata {
  name: string
  columns: string[]
  unique: boolean
  type: string
  sizeBytes?: number
}

/**
 * Constraint metadata
 */
export interface ConstraintMetadata {
  name: string
  type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK'
  columns: string[]
  referencedTable?: string
  referencedColumns?: string[]
  definition?: string
}

/**
 * Table dependency information
 */
export interface TableDependency {
  table: string
  dependsOn: string[]
  dependedOnBy: string[]
}

/**
 * Database analysis result
 */
export interface DatabaseAnalysis {
  tables: TableMetadata[]
  totalSize: number
  version: string
  features: string[]
  performance: {
    avgQueryTime: number
    connectionCount: number
    cacheHitRatio?: number
  }
} 