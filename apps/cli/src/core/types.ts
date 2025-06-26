/**
 * Core types for the Flow enhancement system
 * Defines the structure for migrations, enhancements, and results
 */

export interface MigrationFile {
  /** Full path to the migration file */
  path: string;
  /** File name */
  name: string;
  /** Up migration SQL content */
  up: string;
  /** Down migration SQL content (if available) */
  down: string;
  /** Migration timestamp */
  timestamp: Date;
  /** Parsed SQL operations */
  operations: SqlOperation[];
  /** File checksum for integrity */
  checksum: string;
}

export interface SqlOperation {
  /** Type of SQL operation */
  type: 'CREATE_TABLE' | 'DROP_TABLE' | 'ALTER_TABLE' | 'CREATE_INDEX' | 'DROP_INDEX' | 'INSERT' | 'UPDATE' | 'DELETE' | 'OTHER';
  /** Table name being operated on */
  table?: string;
  /** Column name (for column operations) */
  column?: string;
  /** Index name (for index operations) */
  index?: string;
  /** Raw SQL statement */
  sql: string;
  /** Line number in the file */
  line: number;
}

export interface Enhancement {
  /** Unique identifier for the enhancement */
  id: string;
  /** Human-readable name */
  name: string;
  /** Detailed description of what this enhancement does */
  description: string;
  /** Category: 'safety' or 'speed' */
  category: 'safety' | 'speed';
  /** Priority level (1-10, higher = more important) */
  priority: number;
  /** Whether this enhancement requires user confirmation */
  requiresConfirmation: boolean;
  /** Tags for categorization */
  tags: string[];
}

export interface EnhancementResult {
  /** The enhancement that was applied */
  enhancement: Enhancement;
  /** Whether the enhancement was successfully applied */
  applied: boolean;
  /** The modified SQL content */
  modifiedContent: string;
  /** Any warnings or notes about the application */
  warnings: string[];
  /** Detailed changes made */
  changes: EnhancementChange[];
}

export interface EnhancementChange {
  /** Type of change made */
  type: 'ADDED' | 'MODIFIED' | 'REMOVED' | 'WRAPPED';
  /** Original SQL line/statement */
  original: string;
  /** New SQL line/statement */
  modified: string;
  /** Line number affected */
  line: number;
  /** Reason for the change */
  reason: string;
}

export interface EnhancementDetector {
  /** Detect if this enhancement applies to the migration */
  detect(migration: MigrationFile): Promise<boolean>;
  /** Get details about what this enhancement would do */
  analyze(migration: MigrationFile): Promise<EnhancementAnalysis>;
}

export interface EnhancementApplicator {
  /** Apply the enhancement to the migration content */
  apply(content: string, migration: MigrationFile): Promise<EnhancementResult>;
}

export interface EnhancementAnalysis {
  /** Whether this enhancement is applicable */
  applicable: boolean;
  /** Confidence level (0-1) */
  confidence: number;
  /** Issues found that this enhancement addresses */
  issues: EnhancementIssue[];
  /** Expected impact of applying this enhancement */
  impact: EnhancementImpact;
}

export interface EnhancementIssue {
  /** Severity level */
  severity: 'low' | 'medium' | 'high' | 'critical';
  /** Issue description */
  description: string;
  /** SQL statement or line causing the issue */
  location: string;
  /** Line number */
  line: number;
  /** Recommended action */
  recommendation: string;
}

export interface EnhancementImpact {
  /** Estimated risk reduction (0-1) */
  riskReduction: number;
  /** Estimated performance improvement (0-1) */
  performanceImprovement: number;
  /** Estimated complexity added (0-1) */
  complexityAdded: number;
  /** Brief description of the impact */
  description: string;
}

export interface EnhancementModule {
  /** The enhancement definition */
  enhancement: Enhancement;
  /** Detector for this enhancement */
  detector: EnhancementDetector;
  /** Applicator for this enhancement */
  applicator: EnhancementApplicator;
}

export interface FlowConfig {
  /** Default environment to use */
  defaultEnvironment: string;
  /** Environment configurations */
  environments: Record<string, EnvironmentConfig>;
  /** Enhancement settings */
  enhancements: EnhancementConfig;
}

export interface EnvironmentConfig {
  /** Database connection string */
  databaseUrl?: string;
  /** Path to migrations directory */
  migrationsPath: string;
  /** Database type */
  databaseType: 'postgresql' | 'mysql' | 'sqlite' | 'sqlserver';
  /** Custom enhancement settings for this environment */
  customEnhancements?: Partial<EnhancementConfig>;
}

export interface EnhancementConfig {
  /** Whether to enable safety enhancements by default */
  enableSafetyEnhancements: boolean;
  /** Whether to enable speed enhancements by default */
  enableSpeedEnhancements: boolean;
  /** Default confirmation setting for safety enhancements */
  defaultConfirmSafety: boolean;
  /** Default confirmation setting for speed enhancements */
  defaultConfirmSpeed: boolean;
  /** Disabled enhancement IDs */
  disabledEnhancements: string[];
  /** Custom enhancement priorities */
  customPriorities: Record<string, number>;
}

export interface ValidationResult {
  /** Whether the migration is valid */
  valid: boolean;
  /** List of issues found */
  issues: ValidationIssue[];
  /** Warnings that don't prevent execution */
  warnings: ValidationWarning[];
  /** Overall safety score (0-10) */
  safetyScore: number;
  /** Overall performance score (0-10) */
  performanceScore: number;
}

export interface ValidationIssue {
  /** Issue severity */
  severity: 'error' | 'warning' | 'info';
  /** Issue category */
  category: 'safety' | 'performance' | 'syntax' | 'best-practice';
  /** Issue description */
  message: string;
  /** Location in the file */
  location: string;
  /** Line number */
  line: number;
  /** Suggested fix */
  suggestion?: string;
  /** Enhancement that could fix this */
  fixableBy?: string;
}

export interface ValidationWarning {
  /** Warning message */
  message: string;
  /** Location in the file */
  location: string;
  /** Line number */
  line: number;
  /** Recommendation */
  recommendation: string;
} 