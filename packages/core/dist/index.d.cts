/**
 * Common types used across DriftJS packages
 */
type DatabaseType = 'postgresql' | 'mysql' | 'sqlite' | 'mariadb';
type ORMType = 'prisma' | 'drizzle' | 'typeorm';
/**
 * Generic result type for operations that can fail
 */
type Result<T, E = Error> = {
    success: true;
    data: T;
} | {
    success: false;
    error: E;
};
/**
 * Configuration for database connection
 */
interface DatabaseConfig {
    type: DatabaseType;
    host?: string;
    port?: number;
    database: string;
    username?: string;
    password?: string;
    url?: string;
    ssl?: boolean | object;
}
/**
 * File path utilities
 */
interface FilePath {
    absolute: string;
    relative: string;
    exists: boolean;
}
/**
 * Detection result for file/directory analysis
 */
interface DetectionResult {
    found: boolean;
    confidence: number;
    evidence: string[];
    warnings?: string[];
}
/**
 * Base configuration interface
 */
interface BaseConfig {
    version: string;
    verbose?: boolean;
    dryRun?: boolean;
}

/**
 * ORM-specific types and interfaces
 */

/**
 * ORM detection and configuration
 */
interface ORMConfig {
    type: string;
    version?: string;
    configFile?: FilePath;
    migrationDirectory: FilePath;
    schemaFile?: FilePath;
    dependencies: string[];
}
/**
 * ORM detector interface - implemented by each ORM detector
 */
interface ORMDetector {
    name: string;
    detect(projectPath: string): Promise<DetectionResult>;
    extractConfig(projectPath: string): Promise<ORMConfig | null>;
    getDatabaseConfig(projectPath: string): Promise<DatabaseConfig | null>;
}
/**
 * Prisma-specific configuration
 */
interface PrismaConfig extends ORMConfig {
    type: 'prisma';
    schemaFile: FilePath;
    clientGenerator?: {
        provider: string;
        output?: string;
    };
}
/**
 * Drizzle-specific configuration
 */
interface DrizzleConfig extends ORMConfig {
    type: 'drizzle';
    configFile: FilePath;
    driver: 'pg' | 'mysql2' | 'better-sqlite3';
    schemaPath: string;
    outDir: string;
}
/**
 * TypeORM-specific configuration
 */
interface TypeORMConfig extends ORMConfig {
    type: 'typeorm';
    entities: string[];
    migrations: string[];
    subscribers?: string[];
    cli?: {
        migrationsDir: string;
        entitiesDir: string;
    };
}

/**
 * Database analysis and connection types
 */

/**
 * Database connection interface
 */
interface DatabaseConnection {
    type: DatabaseType;
    isConnected: boolean;
    connect(): Promise<void>;
    disconnect(): Promise<void>;
    query<T = any>(sql: string, params?: any[]): Promise<T[]>;
    transaction<T>(callback: (connection: DatabaseConnection) => Promise<T>): Promise<T>;
}
/**
 * Table metadata from database analysis
 */
interface TableMetadata {
    name: string;
    schema?: string;
    rowCount: number;
    sizeBytes: number;
    columns: ColumnMetadata[];
    indexes: IndexMetadata[];
    constraints: ConstraintMetadata[];
    dependencies: TableDependency[];
}
/**
 * Column metadata
 */
interface ColumnMetadata {
    name: string;
    type: string;
    nullable: boolean;
    defaultValue?: any;
    isPrimary: boolean;
    isUnique: boolean;
    references?: {
        table: string;
        column: string;
    };
}
/**
 * Index metadata
 */
interface IndexMetadata {
    name: string;
    columns: string[];
    unique: boolean;
    type: string;
    sizeBytes?: number;
}
/**
 * Constraint metadata
 */
interface ConstraintMetadata {
    name: string;
    type: 'PRIMARY KEY' | 'FOREIGN KEY' | 'UNIQUE' | 'CHECK';
    columns: string[];
    referencedTable?: string;
    referencedColumns?: string[];
    definition?: string;
}
/**
 * Table dependency information
 */
interface TableDependency {
    table: string;
    dependsOn: string[];
    dependedOnBy: string[];
}
/**
 * Database analysis result
 */
interface DatabaseAnalysis {
    tables: TableMetadata[];
    totalSize: number;
    version: string;
    features: string[];
    performance: {
        avgQueryTime: number;
        connectionCount: number;
        cacheHitRatio?: number;
    };
}

/**
 * Migration analysis and enhancement types
 */

/**
 * Parsed migration operation
 */
interface MigrationOperation {
    type: OperationType;
    table?: string;
    column?: string;
    sql: string;
    metadata: OperationMetadata;
    risks: RiskAssessment[];
    estimatedDuration?: number;
}
/**
 * Types of migration operations
 */
type OperationType = 'CREATE_TABLE' | 'DROP_TABLE' | 'ADD_COLUMN' | 'DROP_COLUMN' | 'ALTER_COLUMN' | 'RENAME_COLUMN' | 'ADD_INDEX' | 'DROP_INDEX' | 'ADD_CONSTRAINT' | 'DROP_CONSTRAINT' | 'RAW_SQL';
/**
 * Operation metadata for analysis
 */
interface OperationMetadata {
    affectedRows?: number;
    lockLevel: 'NONE' | 'SHARED' | 'EXCLUSIVE';
    reversible: boolean;
    dataLoss: boolean;
    performance: 'LOW' | 'MEDIUM' | 'HIGH';
}
/**
 * Risk assessment for operations
 */
interface RiskAssessment {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    category: RiskCategory;
    description: string;
    mitigation?: string;
}
/**
 * Risk categories
 */
type RiskCategory = 'DATA_LOSS' | 'DOWNTIME' | 'PERFORMANCE' | 'CONSTRAINT_VIOLATION' | 'LOCK_TIMEOUT' | 'DISK_SPACE';
/**
 * Migration file representation
 */
interface MigrationFile {
    path: string;
    name: string;
    timestamp: Date;
    operations: MigrationOperation[];
    up: string;
    down?: string;
    checksum: string;
}
/**
 * Enhanced migration with safety features
 */
interface EnhancedMigration {
    original: MigrationFile;
    enhanced: {
        up: string;
        down: string;
        preFlightChecks: string[];
        postMigrationValidation: string[];
        rollbackStrategy: string[];
    };
    estimatedDuration: number;
    maintenanceWindow?: {
        required: boolean;
        estimatedMinutes: number;
    };
}
/**
 * Migration enhancement strategy
 */
interface EnhancementStrategy {
    name: string;
    description: string;
    applies: (operation: MigrationOperation, context: MigrationContext) => boolean;
    enhance: (operation: MigrationOperation, context: MigrationContext) => MigrationOperation[];
    risks: RiskAssessment[];
}
/**
 * Context for migration enhancement
 */
interface MigrationContext {
    database: DatabaseType;
    tableSize?: number;
    hasData: boolean;
    indexes: string[];
    constraints: string[];
    dependencies: string[];
}

interface FlowConfig {
    /**
     * Version of configuration schema, useful for migrations
     */
    version?: string;
    /**
     * List of environments (e.g. development, staging, production)
     */
    environments: Record<string, EnvironmentConfig>;
    /**
     * Name of the default environment to use when none is specified
     */
    defaultEnvironment: string;
    /**
     * Safety thresholds that control when Drift Flow will warn or abort
     */
    safety: SafetyThresholds;
    /**
     * Database-specific optimisation settings keyed by connection name
     */
    database: Record<string, DatabaseOptimisationSettings>;
    /**
     * Optional team collaboration configuration
     */
    teams?: TeamSettings;
}
/**
 * Environment-level configuration overrides
 */
interface EnvironmentConfig {
    /** The database connection string for this environment */
    databaseUrl: string;
    /** Relative or absolute path to the migrations directory */
    migrationsPath?: string;
    /** Pattern toggles allowing specific categories to be disabled */
    patterns?: PatternToggles;
}
/** Safety/operational limits  */
interface SafetyThresholds {
    /** Cancel operations that would lock a table for longer than this */
    maxLockTimeMs?: number;
    /** Abort when table size exceeds this value (in MB) for destructive operations */
    maxTableSizeMB?: number;
    /** Stop when estimated duration is above this */
    maxOperationDurationMs?: number;
}
/** DB optimisation knobs */
interface DatabaseOptimisationSettings {
    type: DatabaseType;
    statementTimeoutMs?: number;
    lockTimeoutMs?: number;
    /** PostgreSQL parallel workers, MySQL equivalent, etc. */
    maxParallelWorkers?: number;
}
/** Collaboration / approvals  */
interface TeamSettings {
    approvers: string[];
    requireCodeReview: boolean;
    slackWebhookUrl?: string;
}
/** Enable/disable categories of patterns */
interface PatternToggles {
    column?: boolean;
    constraint?: boolean;
    index?: boolean;
}

/**
 * File system utilities for DriftJS
 */

/**
 * Check if a file or directory exists
 */
declare function exists(path: string): Promise<boolean>;
/**
 * Create a FilePath object with absolute and relative paths
 */
declare function createFilePath(path: string, basePath?: string): Promise<FilePath>;
/**
 * Read file content with error handling
 */
declare function readFileContent(path: string): Promise<Result<string>>;
/**
 * Write file content with error handling
 */
declare function writeFileContent(path: string, content: string): Promise<Result<void>>;
/**
 * Get file statistics
 */
declare function getFileStats(path: string): Promise<Result<{
    size: number;
    modified: Date;
    isDirectory: boolean;
}>>;
/**
 * Find files matching a pattern in a directory
 */
declare function findFiles(directory: string, pattern: RegExp, recursive?: boolean): Promise<string[]>;
/**
 * Check if a directory contains any files matching a pattern
 */
declare function hasFilesMatching(directory: string, pattern: RegExp): Promise<boolean>;
/**
 * Parse JSON file with error handling
 */
declare function readJsonFile<T = any>(path: string): Promise<Result<T>>;

/**
 * Async utilities for DriftJS
 */

/**
 * Retry a function with exponential backoff
 */
declare function retry<T>(fn: () => Promise<T>, options?: {
    maxAttempts: number;
    delay: number;
    backoff: number;
}): Promise<T>;
/**
 * Sleep for a specified number of milliseconds
 */
declare function sleep(ms: number): Promise<void>;
/**
 * Timeout wrapper for promises
 */
declare function withTimeout<T>(promise: Promise<T>, timeoutMs: number, timeoutMessage?: string): Promise<T>;
/**
 * Execute functions in parallel with concurrency limit
 */
declare function parallelLimit<T, R>(items: T[], fn: (item: T) => Promise<R>, limit?: number): Promise<R[]>;
/**
 * Convert callback-style function to promise
 */
declare function promisify<T>(fn: (callback: (error: Error | null, result?: T) => void) => void): Promise<T>;
/**
 * Safe async function wrapper that returns Result type
 */
declare function safeAsync<T>(fn: () => Promise<T>): Promise<Result<T>>;

/**
 * Validation utilities for DriftJS
 */

/**
 * Validate database configuration
 */
declare function validateDatabaseConfig(config: Partial<DatabaseConfig>): {
    valid: boolean;
    errors: string[];
};
/**
 * Check if a string is a valid database type
 */
declare function isValidDatabaseType(type: string): type is DatabaseType;
/**
 * Basic validation for database connection strings
 */
declare function isValidConnectionString(url: string): boolean;
/**
 * Validate file path
 */
declare function isValidFilePath(path: string): boolean;
/**
 * Validate version string (semver-like)
 */
declare function isValidVersion(version: string): boolean;
/**
 * Sanitize user input
 */
declare function sanitizeInput(input: string): string;
/**
 * Validate SQL identifier (table/column names)
 */
declare function isValidSQLIdentifier(identifier: string): boolean;

/**
 * Load the first configuration file found in the current working directory hierarchy.
 * @param cwd Directory to start the search from (defaults to process.cwd())
 * @param explicitPath Optional explicit path passed by CLI flag
 */
declare function loadFlowConfig(cwd?: string, explicitPath?: string): Promise<FlowConfig>;
interface ValidationResult {
    valid: boolean;
    errors: string[];
    config?: FlowConfig;
}
/**
 * Perform structural validation of FlowConfig instance.
 * We purposefully avoid pulling in a JSON-schema validator to keep deps light.
 */
declare function validateFlowConfig(input: unknown): ValidationResult;

export { type BaseConfig, type ColumnMetadata, type ConstraintMetadata, type DatabaseAnalysis, type DatabaseConfig, type DatabaseConnection, type DatabaseOptimisationSettings, type DatabaseType, type DetectionResult, type DrizzleConfig, type EnhancedMigration, type EnhancementStrategy, type EnvironmentConfig, type FilePath, type FlowConfig, type IndexMetadata, type MigrationContext, type MigrationFile, type MigrationOperation, type ORMConfig, type ORMDetector, type ORMType, type OperationMetadata, type OperationType, type PatternToggles, type PrismaConfig, type Result, type RiskAssessment, type RiskCategory, type SafetyThresholds, type TableDependency, type TableMetadata, type TeamSettings, type TypeORMConfig, type ValidationResult, createFilePath, exists, findFiles, getFileStats, hasFilesMatching, isValidConnectionString, isValidDatabaseType, isValidFilePath, isValidSQLIdentifier, isValidVersion, loadFlowConfig, parallelLimit, promisify, readFileContent, readJsonFile, retry, safeAsync, sanitizeInput, sleep, validateDatabaseConfig, validateFlowConfig, withTimeout, writeFileContent };
