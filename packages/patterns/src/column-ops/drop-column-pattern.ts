/**
 * Configuration for dropping columns safely
 */
export interface DropColumnPatternConfig {
  tableName: string;
  columnName: string;
  createBackup: boolean;
  backupTableName?: string;
  confirmDataLoss: boolean;
  timeoutMs?: number;
}

/**
 * Safe column drop pattern result
 */
export interface DropColumnPatternResult {
  steps: SafeDropStep[];
  estimatedDurationMs: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rollbackSteps: SafeDropStep[];
  preflightChecks: string[];
  warnings: string[];
  dataLossWarnings: string[];
}

/**
 * Individual step in safe column drop
 */
export interface SafeDropStep {
  id: string;
  description: string;
  sql: string;
  estimatedDurationMs: number;
  canRollback: boolean;
  requiresMaintenanceWindow: boolean;
  isDestructive: boolean;
  validationQuery?: string;
  expectedResult?: any;
}

/**
 * Safe Column Drop Pattern
 * Implements the safest way to drop columns with data preservation options
 */
export class DropColumnPattern {
  /**
   * Generate safe column drop steps
   */
  public generateSafeSteps(config: DropColumnPatternConfig): DropColumnPatternResult {
    const steps: SafeDropStep[] = [];
    const rollbackSteps: SafeDropStep[] = [];
    const preflightChecks: string[] = [];
    const warnings: string[] = [];
    const dataLossWarnings: string[] = [];

    // Assess risk level
    const riskLevel = this.assessRiskLevel(config);

    // Add preflight checks
    this.addPreflightChecks(config, preflightChecks);

    // Add data loss warnings
    this.addDataLossWarnings(config, dataLossWarnings);

    if (config.createBackup) {
      // High-safety pattern: Create backup before dropping
      this.generateBackupAndDropSteps(config, steps, rollbackSteps, warnings);
    } else {
      // Standard pattern: Direct drop (requires confirmation)
      this.generateDirectDropSteps(config, steps, rollbackSteps, warnings);
    }

    const estimatedDurationMs = steps.reduce((total, step) => total + step.estimatedDurationMs, 0);

    return {
      steps,
      estimatedDurationMs,
      riskLevel,
      rollbackSteps: rollbackSteps.reverse(), // Reverse for proper rollback order
      preflightChecks,
      warnings,
      dataLossWarnings
    };
  }

  /**
   * Assess risk level for column drop
   */
  private assessRiskLevel(config: DropColumnPatternConfig): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (!config.confirmDataLoss) {
      return 'CRITICAL'; // Cannot proceed without data loss confirmation
    }
    if (!config.createBackup) {
      return 'HIGH'; // No backup means permanent data loss
    }
    return 'MEDIUM'; // With backup, risk is reduced but still significant
  }

  /**
   * Add preflight checks for the operation
   */
  private addPreflightChecks(config: DropColumnPatternConfig, checks: string[]): void {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Verify column '${config.columnName}' exists in table '${config.tableName}'`,
      `Check if column '${config.columnName}' is part of any indexes`,
      `Check if column '${config.columnName}' is part of any constraints`,
      `Check if column '${config.columnName}' is referenced by foreign keys`,
      `Verify database has sufficient storage space for backup (if creating backup)`,
      `Check for active long-running transactions`,
      `Verify table is not currently locked`
    );

    if (config.createBackup) {
      const backupTableName = config.backupTableName || `${config.tableName}_backup_${Date.now()}`;
      checks.push(
        `Verify backup table name '${backupTableName}' is available`,
        `Check permissions to create backup table`
      );
    }
  }

  /**
   * Add data loss warnings
   */
  private addDataLossWarnings(config: DropColumnPatternConfig, warnings: string[]): void {
    warnings.push(
      `⚠️  CRITICAL: Dropping column '${config.columnName}' will permanently delete all data in this column`,
      `⚠️  This operation cannot be undone without a backup`,
      `⚠️  Ensure all applications and queries no longer reference this column`
    );

    if (!config.createBackup) {
      warnings.push(
        `⚠️  DANGER: No backup will be created - data will be permanently lost`,
        `⚠️  Consider creating a backup table before proceeding`
      );
    }

    if (!config.confirmDataLoss) {
      warnings.push(
        `⚠️  BLOCKED: Cannot proceed without explicit data loss confirmation`,
        `⚠️  Set confirmDataLoss: true to acknowledge data will be permanently deleted`
      );
    }
  }

  /**
   * Generate steps with backup creation (safer approach)
   */
  private generateBackupAndDropSteps(
    config: DropColumnPatternConfig,
    steps: SafeDropStep[],
    rollbackSteps: SafeDropStep[],
    warnings: string[]
  ): void {
    const backupTableName = config.backupTableName || `${config.tableName}_backup_${Date.now()}`;

    warnings.push(
      'Creating backup table before dropping column',
      `Backup will be stored in table: ${backupTableName}`,
      'This operation will require additional storage space'
    );

    // Step 1: Create backup table with full data
    steps.push({
      id: 'create-backup-table',
      description: `Create backup table ${backupTableName}`,
      sql: `CREATE TABLE ${backupTableName} AS SELECT * FROM ${config.tableName};`,
      estimatedDurationMs: 5000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      isDestructive: false,
      validationQuery: `SELECT COUNT(*) FROM ${backupTableName};`,
      expectedResult: 'row_count > 0'
    });

    rollbackSteps.push({
      id: 'cleanup-backup-table',
      description: `Remove backup table ${backupTableName}`,
      sql: `DROP TABLE IF EXISTS ${backupTableName};`,
      estimatedDurationMs: 1000,
      canRollback: false,
      requiresMaintenanceWindow: false,
      isDestructive: true
    });

    // Step 2: Drop dependent objects (indexes, constraints)
    steps.push({
      id: 'drop-dependent-objects',
      description: `Drop indexes and constraints dependent on column ${config.columnName}`,
      sql: `-- This step will be dynamically generated based on discovered dependencies`,
      estimatedDurationMs: 2000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      isDestructive: true,
      validationQuery: `SELECT COUNT(*) FROM information_schema.statistics WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      expectedResult: 0
    });

    // Step 3: Drop the column
    steps.push({
      id: 'drop-column',
      description: `Drop column ${config.columnName} from table ${config.tableName}`,
      sql: `ALTER TABLE ${config.tableName} DROP COLUMN ${config.columnName};`,
      estimatedDurationMs: 3000,
      canRollback: false, // Cannot rollback after column is dropped
      requiresMaintenanceWindow: true,
      isDestructive: true,
      validationQuery: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      expectedResult: 0
    });

    // Add potential rollback from backup (complex operation)
    rollbackSteps.push({
      id: 'restore-from-backup',
      description: `Restore table ${config.tableName} from backup ${backupTableName}`,
      sql: `-- MANUAL PROCESS: Compare schemas and restore data as needed from ${backupTableName}`,
      estimatedDurationMs: 30000,
      canRollback: false,
      requiresMaintenanceWindow: true,
      isDestructive: true
    });
  }

  /**
   * Generate steps for direct drop (higher risk)
   */
  private generateDirectDropSteps(
    config: DropColumnPatternConfig,
    steps: SafeDropStep[],
    rollbackSteps: SafeDropStep[],
    warnings: string[]
  ): void {
    if (!config.confirmDataLoss) {
      // Block the operation if data loss not confirmed
      steps.push({
        id: 'blocked-operation',
        description: 'Operation blocked - data loss confirmation required',
        sql: '-- BLOCKED: Set confirmDataLoss: true to proceed',
        estimatedDurationMs: 0,
        canRollback: false,
        requiresMaintenanceWindow: false,
        isDestructive: false
      });
      return;
    }

    warnings.push(
      'Performing direct column drop without backup',
      'Data will be permanently lost and cannot be recovered',
      'Ensure this is intended and all dependencies are handled'
    );

    // Step 1: Drop dependent objects (indexes, constraints)
    steps.push({
      id: 'drop-dependent-objects',
      description: `Drop indexes and constraints dependent on column ${config.columnName}`,
      sql: `-- This step will be dynamically generated based on discovered dependencies`,
      estimatedDurationMs: 2000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      isDestructive: true,
      validationQuery: `SELECT COUNT(*) FROM information_schema.statistics WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      expectedResult: 0
    });

    // Step 2: Drop the column
    steps.push({
      id: 'drop-column',
      description: `Drop column ${config.columnName} from table ${config.tableName}`,
      sql: `ALTER TABLE ${config.tableName} DROP COLUMN ${config.columnName};`,
      estimatedDurationMs: 3000,
      canRollback: false, // Cannot rollback after column is dropped
      requiresMaintenanceWindow: true,
      isDestructive: true,
      validationQuery: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      expectedResult: 0
    });

    // No rollback possible for direct drop
    rollbackSteps.push({
      id: 'no-rollback-available',
      description: 'No rollback available - data permanently lost',
      sql: '-- NO ROLLBACK: Column and data permanently deleted',
      estimatedDurationMs: 0,
      canRollback: false,
      requiresMaintenanceWindow: false,
      isDestructive: false
    });
  }

  /**
   * Generate validation queries for the operation
   */
  public generateValidationQueries(config: DropColumnPatternConfig): string[] {
    return [
      `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      `SELECT COUNT(*) FROM information_schema.statistics WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      `SELECT COUNT(*) FROM information_schema.key_column_usage WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      `SELECT data_type, is_nullable FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`
    ];
  }

  /**
   * Generate queries to discover dependencies before dropping
   */
  public generateDependencyQueries(config: DropColumnPatternConfig): string[] {
    return [
      // Find indexes that include this column
      `SELECT index_name FROM information_schema.statistics WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      
      // Find foreign key constraints
      `SELECT constraint_name FROM information_schema.key_column_usage WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}' AND referenced_table_name IS NOT NULL;`,
      
      // Find check constraints (MySQL/PostgreSQL specific)
      `SELECT constraint_name FROM information_schema.check_constraints cc JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name WHERE ccu.table_name = '${config.tableName}' AND ccu.column_name = '${config.columnName}';`,
      
      // Find unique constraints
      `SELECT constraint_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name WHERE tc.table_name = '${config.tableName}' AND kcu.column_name = '${config.columnName}' AND tc.constraint_type = 'UNIQUE';`
    ];
  }

  /**
   * Generate performance impact estimation
   */
  public estimatePerformanceImpact(config: DropColumnPatternConfig, tableRowCount: number): {
    estimatedDurationMs: number;
    memoryUsageMB: number;
    diskSpaceFreedMB: number;
    diskSpaceRequiredForBackupMB: number;
    recommendedMaintenanceWindow: boolean;
  } {
    const baseTime = 2000; // 2 second base time
    const rowProcessingTime = tableRowCount * 0.05; // 0.05ms per row for drop
    const backupTime = config.createBackup ? tableRowCount * 0.2 : 0; // 0.2ms per row for backup
    
    const estimatedDurationMs = baseTime + rowProcessingTime + backupTime;
    const memoryUsageMB = Math.max(5, tableRowCount * 0.0005); // Minimum 5MB
    
    // Estimate column size for disk space calculations
    const avgColumnSize = 50; // Average 50 bytes per column value
    const diskSpaceFreedMB = (tableRowCount * avgColumnSize) / (1024 * 1024);
    const diskSpaceRequiredForBackupMB = config.createBackup ? (tableRowCount * 200) / (1024 * 1024) : 0; // Full table backup
    
    const recommendedMaintenanceWindow = estimatedDurationMs > 10000 || config.createBackup;

    return {
      estimatedDurationMs,
      memoryUsageMB,
      diskSpaceFreedMB,
      diskSpaceRequiredForBackupMB,
      recommendedMaintenanceWindow
    };
  }

  /**
   * Validate configuration before execution
   */
  public validateConfig(config: DropColumnPatternConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.tableName) {
      errors.push('Table name is required');
    }

    if (!config.columnName) {
      errors.push('Column name is required');
    }

    if (!config.confirmDataLoss) {
      errors.push('Data loss confirmation is required (confirmDataLoss: true)');
    }

    if (config.createBackup && config.backupTableName) {
      if (config.backupTableName === config.tableName) {
        errors.push('Backup table name cannot be the same as source table');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 