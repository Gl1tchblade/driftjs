/**
 * Configuration for renaming columns safely
 */
export interface RenameColumnPatternConfig {
  tableName: string;
  oldColumnName: string;
  newColumnName: string;
  useTemporaryColumn: boolean;
  migrateData: boolean;
  timeoutMs?: number;
}

/**
 * Safe column rename pattern result
 */
export interface RenameColumnPatternResult {
  steps: SafeRenameStep[];
  estimatedDurationMs: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  rollbackSteps: SafeRenameStep[];
  preflightChecks: string[];
  warnings: string[];
}

/**
 * Individual step in safe column rename
 */
export interface SafeRenameStep {
  id: string;
  description: string;
  sql: string;
  estimatedDurationMs: number;
  canRollback: boolean;
  requiresMaintenanceWindow: boolean;
  validationQuery?: string;
  expectedResult?: any;
}

/**
 * Safe Column Rename Pattern
 * Implements the safest way to rename columns using temporary column approach
 */
export class RenameColumnPattern {
  /**
   * Generate safe column rename steps
   */
  public generateSafeSteps(config: RenameColumnPatternConfig): RenameColumnPatternResult {
    const steps: SafeRenameStep[] = [];
    const rollbackSteps: SafeRenameStep[] = [];
    const preflightChecks: string[] = [];
    const warnings: string[] = [];

    // Assess risk level
    const riskLevel = this.assessRiskLevel(config);

    // Add preflight checks
    this.addPreflightChecks(config, preflightChecks);

    if (config.useTemporaryColumn) {
      // Safer pattern: Use temporary column approach
      this.generateTemporaryColumnSteps(config, steps, rollbackSteps, warnings);
    } else {
      // Direct rename (faster but riskier for some databases)
      this.generateDirectRenameSteps(config, steps, rollbackSteps, warnings);
    }

    const estimatedDurationMs = steps.reduce((total, step) => total + step.estimatedDurationMs, 0);

    return {
      steps,
      estimatedDurationMs,
      riskLevel,
      rollbackSteps: rollbackSteps.reverse(), // Reverse for proper rollback order
      preflightChecks,
      warnings
    };
  }

  /**
   * Assess risk level for column rename
   */
  private assessRiskLevel(config: RenameColumnPatternConfig): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (config.useTemporaryColumn && config.migrateData) {
      return 'MEDIUM'; // Temporary column with data migration is safer but more complex
    }
    if (config.useTemporaryColumn) {
      return 'LOW'; // Temporary column without data migration is safest
    }
    return 'MEDIUM'; // Direct rename has some risk depending on database
  }

  /**
   * Add preflight checks for the operation
   */
  private addPreflightChecks(config: RenameColumnPatternConfig, checks: string[]): void {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Verify column '${config.oldColumnName}' exists in table '${config.tableName}'`,
      `Verify column '${config.newColumnName}' does not already exist in table '${config.tableName}'`,
      `Check if column '${config.oldColumnName}' is part of any indexes`,
      `Check if column '${config.oldColumnName}' is part of any constraints`,
      `Check if column '${config.oldColumnName}' is referenced by foreign keys`,
      `Verify database has sufficient storage space (if using temporary column)`,
      `Check for active long-running transactions`,
      `Verify table is not currently locked`
    );

    if (config.migrateData) {
      checks.push(
        `Verify data compatibility between old and new column definitions`,
        `Check table size to estimate data migration duration`
      );
    }
  }

  /**
   * Generate steps using temporary column approach (safer)
   */
  private generateTemporaryColumnSteps(
    config: RenameColumnPatternConfig,
    steps: SafeRenameStep[],
    rollbackSteps: SafeRenameStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'Using temporary column approach for safer rename operation',
      'This method allows for gradual migration and easier rollback',
      'Operation will require temporary storage space'
    );

    // Step 1: Get original column definition
    const getColumnDefStep: SafeRenameStep = {
      id: 'get-column-definition',
      description: `Get definition of column ${config.oldColumnName}`,
      sql: `SELECT column_type, is_nullable, column_default, extra FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.oldColumnName}';`,
      estimatedDurationMs: 500,
      canRollback: false,
      requiresMaintenanceWindow: false,
      validationQuery: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.oldColumnName}';`,
      expectedResult: 1
    };
    steps.push(getColumnDefStep);

    // Step 2: Add new column with same definition
    steps.push({
      id: 'add-new-column',
      description: `Add new column ${config.newColumnName} with same definition as ${config.oldColumnName}`,
      sql: `-- This will be dynamically generated based on the original column definition`,
      estimatedDurationMs: 2000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      validationQuery: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.newColumnName}';`,
      expectedResult: 1
    });

    rollbackSteps.push({
      id: 'remove-new-column',
      description: `Remove new column ${config.newColumnName}`,
      sql: `ALTER TABLE ${config.tableName} DROP COLUMN ${config.newColumnName};`,
      estimatedDurationMs: 1000,
      canRollback: false,
      requiresMaintenanceWindow: false
    });

    if (config.migrateData) {
      // Step 3: Copy data from old column to new column
      steps.push({
        id: 'migrate-data',
        description: `Copy data from ${config.oldColumnName} to ${config.newColumnName}`,
        sql: `UPDATE ${config.tableName} SET ${config.newColumnName} = ${config.oldColumnName};`,
        estimatedDurationMs: 10000,
        canRollback: true,
        requiresMaintenanceWindow: true,
        validationQuery: `SELECT COUNT(*) FROM ${config.tableName} WHERE ${config.oldColumnName} != ${config.newColumnName} OR (${config.oldColumnName} IS NULL AND ${config.newColumnName} IS NOT NULL) OR (${config.oldColumnName} IS NOT NULL AND ${config.newColumnName} IS NULL);`,
        expectedResult: 0
      });

      // Step 4: Verify data integrity
      steps.push({
        id: 'verify-data-integrity',
        description: `Verify data was copied correctly from ${config.oldColumnName} to ${config.newColumnName}`,
        sql: `SELECT COUNT(*) as mismatched_rows FROM ${config.tableName} WHERE ${config.oldColumnName} != ${config.newColumnName};`,
        estimatedDurationMs: 2000,
        canRollback: false,
        requiresMaintenanceWindow: false,
        validationQuery: `SELECT COUNT(*) FROM ${config.tableName} WHERE ${config.oldColumnName} != ${config.newColumnName};`,
        expectedResult: 0
      });
    }

    // Step 5: Drop old column
    steps.push({
      id: 'drop-old-column',
      description: `Drop old column ${config.oldColumnName}`,
      sql: `ALTER TABLE ${config.tableName} DROP COLUMN ${config.oldColumnName};`,
      estimatedDurationMs: 3000,
      canRollback: false, // Cannot rollback after column is dropped
      requiresMaintenanceWindow: true,
      validationQuery: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.oldColumnName}';`,
      expectedResult: 0
    });

    // Add rollback warning for final step
    rollbackSteps.push({
      id: 'rollback-warning',
      description: 'Manual intervention required to restore dropped column',
      sql: `-- WARNING: Original column ${config.oldColumnName} was dropped and cannot be automatically restored`,
      estimatedDurationMs: 0,
      canRollback: false,
      requiresMaintenanceWindow: false
    });
  }

  /**
   * Generate steps for direct rename (faster but less safe)
   */
  private generateDirectRenameSteps(
    config: RenameColumnPatternConfig,
    steps: SafeRenameStep[],
    rollbackSteps: SafeRenameStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'Using direct rename approach - faster but less safe',
      'This method may not be supported on all database systems',
      'Rollback capabilities are limited with this approach'
    );

    // MySQL/PostgreSQL have different syntax for column rename
    const mysqlSql = `ALTER TABLE ${config.tableName} CHANGE ${config.oldColumnName} ${config.newColumnName} -- COLUMN_DEFINITION_HERE;`;
    const postgresqlSql = `ALTER TABLE ${config.tableName} RENAME COLUMN ${config.oldColumnName} TO ${config.newColumnName};`;

    steps.push({
      id: 'direct-rename',
      description: `Directly rename column ${config.oldColumnName} to ${config.newColumnName}`,
      sql: `-- Database-specific SQL will be generated: MySQL uses CHANGE, PostgreSQL uses RENAME COLUMN`,
      estimatedDurationMs: 2000,
      canRollback: true,
      requiresMaintenanceWindow: true,
      validationQuery: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.newColumnName}';`,
      expectedResult: 1
    });

    rollbackSteps.push({
      id: 'rollback-direct-rename',
      description: `Rename column ${config.newColumnName} back to ${config.oldColumnName}`,
      sql: `-- Database-specific rollback SQL will be generated`,
      estimatedDurationMs: 2000,
      canRollback: false,
      requiresMaintenanceWindow: true
    });
  }

  /**
   * Generate database-specific rename SQL
   */
  public generateDatabaseSpecificSql(
    config: RenameColumnPatternConfig,
    database: 'postgresql' | 'mysql' | 'sqlite',
    columnDefinition?: string
  ): { renameSql: string; rollbackSql: string } {
    switch (database) {
      case 'postgresql':
        return {
          renameSql: `ALTER TABLE ${config.tableName} RENAME COLUMN ${config.oldColumnName} TO ${config.newColumnName};`,
          rollbackSql: `ALTER TABLE ${config.tableName} RENAME COLUMN ${config.newColumnName} TO ${config.oldColumnName};`
        };

      case 'mysql':
        const columnDef = columnDefinition || 'TEXT'; // Default if not provided
        return {
          renameSql: `ALTER TABLE ${config.tableName} CHANGE ${config.oldColumnName} ${config.newColumnName} ${columnDef};`,
          rollbackSql: `ALTER TABLE ${config.tableName} CHANGE ${config.newColumnName} ${config.oldColumnName} ${columnDef};`
        };

      case 'sqlite':
        // SQLite doesn't support column rename directly, must use temporary table approach
        return {
          renameSql: `-- SQLite requires table recreation for column rename - use temporary column approach`,
          rollbackSql: `-- SQLite rollback requires table recreation`
        };

      default:
        throw new Error(`Unsupported database: ${database}`);
    }
  }

  /**
   * Generate validation queries for the operation
   */
  public generateValidationQueries(config: RenameColumnPatternConfig): string[] {
    return [
      `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.oldColumnName}';`,
      `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.newColumnName}';`,
      `SELECT column_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.oldColumnName}';`,
      `SELECT COUNT(*) FROM information_schema.statistics WHERE table_name = '${config.tableName}' AND column_name = '${config.oldColumnName}';`
    ];
  }

  /**
   * Generate performance impact estimation
   */
  public estimatePerformanceImpact(config: RenameColumnPatternConfig, tableRowCount: number): {
    estimatedDurationMs: number;
    memoryUsageMB: number;
    diskSpaceRequiredMB: number;
    recommendedMaintenanceWindow: boolean;
  } {
    const baseTime = config.useTemporaryColumn ? 5000 : 2000; // Temporary column takes longer
    const dataMigrationTime = config.migrateData ? tableRowCount * 0.1 : 0; // 0.1ms per row
    
    const estimatedDurationMs = baseTime + dataMigrationTime;
    const memoryUsageMB = Math.max(5, tableRowCount * 0.0005); // Minimum 5MB
    const diskSpaceRequiredMB = config.useTemporaryColumn ? (tableRowCount * 50) / (1024 * 1024) : 0; // Temporary column space
    const recommendedMaintenanceWindow = config.migrateData || estimatedDurationMs > 10000;

    return {
      estimatedDurationMs,
      memoryUsageMB,
      diskSpaceRequiredMB,
      recommendedMaintenanceWindow
    };
  }

  /**
   * Validate configuration before execution
   */
  public validateConfig(config: RenameColumnPatternConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.tableName) {
      errors.push('Table name is required');
    }

    if (!config.oldColumnName) {
      errors.push('Old column name is required');
    }

    if (!config.newColumnName) {
      errors.push('New column name is required');
    }

    if (config.oldColumnName === config.newColumnName) {
      errors.push('Old and new column names must be different');
    }

    // Check for valid column name patterns
    const columnNamePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (config.newColumnName && !columnNamePattern.test(config.newColumnName)) {
      errors.push('New column name contains invalid characters');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 