export interface FlowConfig {
  /**
   * Version of configuration schema, useful for migrations
   */
  version?: string
  /**
   * List of environments (e.g. development, staging, production)
   */
  environments: Record<string, EnvironmentConfig>
  /**
   * Name of the default environment to use when none is specified
   */
  defaultEnvironment: string
  /**
   * Safety thresholds that control when Drift Flow will warn or abort
   */
  safety: SafetyThresholds
  /**
   * Database-specific optimisation settings keyed by connection name
   */
  database: Record<string, DatabaseOptimisationSettings>
  /**
   * Optional team collaboration configuration
   */
  teams?: TeamSettings
}

/**
 * Environment-level configuration overrides
 */
export interface EnvironmentConfig {
  /** The database connection string for this environment */
  databaseUrl: string
  /** Relative or absolute path to the migrations directory */
  migrationsPath?: string
  /** Pattern toggles allowing specific categories to be disabled */
  patterns?: PatternToggles
}

/** Safety/operational limits  */
export interface SafetyThresholds {
  /** Cancel operations that would lock a table for longer than this */
  maxLockTimeMs?: number
  /** Abort when table size exceeds this value (in MB) for destructive operations */
  maxTableSizeMB?: number
  /** Stop when estimated duration is above this */
  maxOperationDurationMs?: number
}

/** DB optimisation knobs */
export interface DatabaseOptimisationSettings {
  type: import('./common.js').DatabaseType
  statementTimeoutMs?: number
  lockTimeoutMs?: number
  /** PostgreSQL parallel workers, MySQL equivalent, etc. */
  maxParallelWorkers?: number
}

/** Collaboration / approvals  */
export interface TeamSettings {
  approvers: string[]
  requireCodeReview: boolean
  slackWebhookUrl?: string
}

/** Enable/disable categories of patterns */
export interface PatternToggles {
  column?: boolean
  constraint?: boolean
  index?: boolean
} 