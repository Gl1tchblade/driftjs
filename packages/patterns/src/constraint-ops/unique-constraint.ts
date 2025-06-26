// Define types locally to avoid cross-package dependencies in patterns

/**
 * Configuration for adding unique constraints safely
 */
export interface UniqueConstraintPatternConfig {
  tableName: string;
  constraintName?: string;
  columnNames: string[];
  handleDuplicates: 'fail' | 'remove' | 'mark';
  duplicateHandlingStrategy?: 'keep_first' | 'keep_last' | 'manual';
  batchSize?: number;
  timeoutMs?: number;
  createConcurrently?: boolean; // For PostgreSQL
}

/**
 * Safe unique constraint addition pattern result
 */
export interface UniqueConstraintPatternResult {
  steps: SafeConstraintStep[];
  estimatedDurationMs: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rollbackSteps: SafeConstraintStep[];
  preflightChecks: string[];
  warnings: string[];
  duplicateCount?: number;
}

/**
 * Individual step in safe constraint addition
 */
export interface SafeConstraintStep {
  id: string;
  description: string;
  sql: string;
  estimatedDurationMs: number;
  canRollback: boolean;
  requiresMaintenanceWindow: boolean;
  validationQuery?: string;
  expectedResult?: any;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

/**
 * Safe Unique Constraint Addition Pattern
 * Implements the safest way to add unique constraints with duplicate handling
 */
export class UniqueConstraintPattern {
  /**
   * Generate safe unique constraint addition steps
   */
  public generateSafeSteps(config: UniqueConstraintPatternConfig): UniqueConstraintPatternResult {
    const steps: SafeConstraintStep[] = [];
    const rollbackSteps: SafeConstraintStep[] = [];
    const preflightChecks: string[] = [];
    const warnings: string[] = [];

    // Generate constraint name if not provided
    const constraintName = config.constraintName || 
      `uq_${config.tableName}_${config.columnNames.join('_')}`;

    // Assess risk level
    const riskLevel = this.assessRiskLevel(config);

    // Add preflight checks
    this.addPreflightChecks(config, constraintName, preflightChecks);

    // Generate steps based on duplicate handling strategy
    this.generateConstraintSteps(config, constraintName, steps, rollbackSteps, warnings);

    const estimatedDurationMs = steps.reduce((total, step) => total + step.estimatedDurationMs, 0);

    return {
      steps,
      estimatedDurationMs,
      riskLevel,
      rollbackSteps: rollbackSteps.reverse(),
      preflightChecks,
      warnings
    };
  }

  /**
   * Assess risk level for unique constraint addition
   */
  private assessRiskLevel(config: UniqueConstraintPatternConfig): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (config.handleDuplicates === 'fail') {
      return 'CRITICAL'; // Will fail if duplicates exist
    }
    if (config.handleDuplicates === 'remove') {
      return 'HIGH'; // Data deletion is high risk
    }
    if (config.columnNames.length > 3) {
      return 'MEDIUM'; // Complex composite constraints
    }
    return 'LOW';
  }

  /**
   * Add preflight checks for unique constraint addition
   */
  private addPreflightChecks(
    config: UniqueConstraintPatternConfig,
    constraintName: string,
    checks: string[]
  ): void {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Check if constraint '${constraintName}' already exists`,
      `Verify all columns exist: ${config.columnNames.join(', ')}`,
      `Check for duplicate values in target columns`,
      `Verify table is not currently locked`,
      `Check available disk space for operation`
    );

    if (config.handleDuplicates === 'remove') {
      checks.push(
        `Backup table data before duplicate removal`,
        `Verify duplicate handling strategy is acceptable`
      );
    }
  }

  /**
   * Generate constraint addition steps
   */
  private generateConstraintSteps(
    config: UniqueConstraintPatternConfig,
    constraintName: string,
    steps: SafeConstraintStep[],
    rollbackSteps: SafeConstraintStep[],
    warnings: string[]
  ): void {
    const columnList = config.columnNames.join(', ');

    // Step 1: Check for existing duplicates
    steps.push({
      id: 'check-duplicates',
      description: `Check for duplicate values in columns: ${columnList}`,
      sql: this.generateDuplicateCheckQuery(config),
      estimatedDurationMs: 5000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW',
      validationQuery: this.generateDuplicateCheckQuery(config),
      expectedResult: 0
    });

    // Step 2: Handle duplicates if they exist
    if (config.handleDuplicates === 'remove') {
      this.addDuplicateRemovalSteps(config, steps, rollbackSteps, warnings);
    } else if (config.handleDuplicates === 'mark') {
      this.addDuplicateMarkingSteps(config, steps, rollbackSteps, warnings);
    }

    // Step 3: Create unique index first (for better performance)
    const usesConcurrentIndex = config.createConcurrently === true;
    
    steps.push({
      id: 'create-unique-index',
      description: `Create unique index for constraint ${constraintName}`,
      sql: this.generateUniqueIndexSQL(config, constraintName, usesConcurrentIndex),
      estimatedDurationMs: usesConcurrentIndex ? 30000 : 15000,
      canRollback: true,
      requiresMaintenanceWindow: !usesConcurrentIndex,
      riskLevel: usesConcurrentIndex ? 'LOW' : 'MEDIUM'
    });

    rollbackSteps.push({
      id: 'rollback-unique-index',
      description: `Drop unique index for constraint ${constraintName}`,
      sql: `DROP INDEX IF EXISTS idx_${constraintName};`,
      estimatedDurationMs: 2000,
      canRollback: false,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW'
    });

    // Step 4: Add the actual constraint (using existing index)
    steps.push({
      id: 'add-unique-constraint',
      description: `Add unique constraint ${constraintName}`,
      sql: `ALTER TABLE ${config.tableName} ADD CONSTRAINT ${constraintName} UNIQUE (${columnList});`,
      estimatedDurationMs: 3000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW',
      validationQuery: this.generateConstraintValidationQuery(config.tableName, constraintName),
      expectedResult: constraintName
    });

    rollbackSteps.push({
      id: 'rollback-unique-constraint',
      description: `Drop unique constraint ${constraintName}`,
      sql: `ALTER TABLE ${config.tableName} DROP CONSTRAINT IF EXISTS ${constraintName};`,
      estimatedDurationMs: 2000,
      canRollback: false,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW'
    });

    // Add warnings based on configuration
    this.addWarnings(config, warnings);
  }

  /**
   * Generate SQL to check for duplicate values
   */
  private generateDuplicateCheckQuery(config: UniqueConstraintPatternConfig): string {
    const columnList = config.columnNames.join(', ');
    return `
      SELECT COUNT(*) as duplicate_count
      FROM (
        SELECT ${columnList}, COUNT(*) as cnt
        FROM ${config.tableName}
        WHERE ${config.columnNames.map(col => `${col} IS NOT NULL`).join(' AND ')}
        GROUP BY ${columnList}
        HAVING COUNT(*) > 1
      ) duplicates;
    `.trim();
  }

  /**
   * Add duplicate removal steps
   */
  private addDuplicateRemovalSteps(
    config: UniqueConstraintPatternConfig,
    steps: SafeConstraintStep[],
    rollbackSteps: SafeConstraintStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'DESTRUCTIVE OPERATION: Duplicate removal will permanently delete data',
      'Ensure you have a complete backup before proceeding',
      'Consider manual duplicate resolution instead of automatic removal'
    );

    // Create backup table
    steps.push({
      id: 'backup-duplicates',
      description: 'Create backup of duplicate records',
      sql: this.generateDuplicateBackupSQL(config),
      estimatedDurationMs: 10000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'MEDIUM'
    });

    // Remove duplicates
    steps.push({
      id: 'remove-duplicates',
      description: 'Remove duplicate records',
      sql: this.generateDuplicateRemovalSQL(config),
      estimatedDurationMs: 20000,
      canRollback: false, // Cannot rollback data deletion
      requiresMaintenanceWindow: true,
      riskLevel: 'HIGH'
    });
  }

  /**
   * Add duplicate marking steps
   */
  private addDuplicateMarkingSteps(
    config: UniqueConstraintPatternConfig,
    steps: SafeConstraintStep[],
    rollbackSteps: SafeConstraintStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'Duplicate records will be marked but not removed',
      'Manual intervention required to resolve duplicates',
      'Constraint addition will fail until duplicates are resolved'
    );

    // Add duplicate marker column if it doesn't exist
    steps.push({
      id: 'add-duplicate-marker',
      description: 'Add column to mark duplicate records',
      sql: `ALTER TABLE ${config.tableName} ADD COLUMN IF NOT EXISTS _duplicate_marker BOOLEAN DEFAULT FALSE;`,
      estimatedDurationMs: 2000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW'
    });

    // Mark duplicates
    steps.push({
      id: 'mark-duplicates',
      description: 'Mark duplicate records for manual resolution',
      sql: this.generateDuplicateMarkingSQL(config),
      estimatedDurationMs: 10000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW'
    });
  }

  /**
   * Generate unique index creation SQL
   */
  private generateUniqueIndexSQL(
    config: UniqueConstraintPatternConfig,
    constraintName: string,
    concurrent: boolean
  ): string {
    const columnList = config.columnNames.join(', ');
    const concurrentClause = concurrent ? 'CONCURRENTLY' : '';
    
    return `CREATE UNIQUE INDEX ${concurrentClause} idx_${constraintName} ON ${config.tableName} (${columnList});`.trim();
  }

  /**
   * Generate duplicate backup SQL
   */
  private generateDuplicateBackupSQL(config: UniqueConstraintPatternConfig): string {
    const columnList = config.columnNames.join(', ');
    const backupTableName = `${config.tableName}_duplicates_backup_${Date.now()}`;
    
    return `
      CREATE TABLE ${backupTableName} AS
      SELECT *
      FROM ${config.tableName}
      WHERE (${columnList}) IN (
        SELECT ${columnList}
        FROM ${config.tableName}
        WHERE ${config.columnNames.map(col => `${col} IS NOT NULL`).join(' AND ')}
        GROUP BY ${columnList}
        HAVING COUNT(*) > 1
      );
    `.trim();
  }

  /**
   * Generate duplicate removal SQL
   */
  private generateDuplicateRemovalSQL(config: UniqueConstraintPatternConfig): string {
    const columnList = config.columnNames.join(', ');
    const keepStrategy = config.duplicateHandlingStrategy || 'keep_first';
    
    // Use ROW_NUMBER() to identify which records to keep
    const orderClause = keepStrategy === 'keep_last' ? 'DESC' : 'ASC';
    
    return `
      DELETE FROM ${config.tableName}
      WHERE ctid NOT IN (
        SELECT ctid
        FROM (
          SELECT ctid, ROW_NUMBER() OVER (
            PARTITION BY ${columnList} 
            ORDER BY ctid ${orderClause}
          ) as rn
          FROM ${config.tableName}
          WHERE ${config.columnNames.map(col => `${col} IS NOT NULL`).join(' AND ')}
        ) ranked
        WHERE rn = 1
      );
    `.trim();
  }

  /**
   * Generate duplicate marking SQL
   */
  private generateDuplicateMarkingSQL(config: UniqueConstraintPatternConfig): string {
    const columnList = config.columnNames.join(', ');
    
    return `
      UPDATE ${config.tableName}
      SET _duplicate_marker = TRUE
      WHERE (${columnList}) IN (
        SELECT ${columnList}
        FROM ${config.tableName}
        WHERE ${config.columnNames.map(col => `${col} IS NOT NULL`).join(' AND ')}
        GROUP BY ${columnList}
        HAVING COUNT(*) > 1
      );
    `.trim();
  }

  /**
   * Generate constraint validation query
   */
  private generateConstraintValidationQuery(tableName: string, constraintName: string): string {
    return `
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = '${tableName}'
        AND constraint_name = '${constraintName}'
        AND constraint_type = 'UNIQUE';
    `.trim();
  }

  /**
   * Add configuration-specific warnings
   */
  private addWarnings(config: UniqueConstraintPatternConfig, warnings: string[]): void {
    if (config.columnNames.length > 3) {
      warnings.push('Complex composite unique constraints may impact query performance');
    }

    if (config.createConcurrently === false) {
      warnings.push('Non-concurrent index creation will require maintenance window');
    }

    if (config.handleDuplicates === 'fail') {
      warnings.push('Operation will fail if any duplicate values exist');
    }
  }

  /**
   * Generate validation queries for the constraint
   */
  public generateValidationQueries(config: UniqueConstraintPatternConfig): string[] {
    const constraintName = config.constraintName || 
      `uq_${config.tableName}_${config.columnNames.join('_')}`;
    
    return [
      this.generateDuplicateCheckQuery(config),
      this.generateConstraintValidationQuery(config.tableName, constraintName),
      `SELECT COUNT(*) FROM ${config.tableName};` // Verify no data loss
    ];
  }

  /**
   * Estimate performance impact of constraint addition
   */
  public estimatePerformanceImpact(
    config: UniqueConstraintPatternConfig,
    tableRowCount: number
  ): {
    estimatedDurationMs: number;
    memoryUsageMB: number;
    diskSpaceRequiredMB: number;
    recommendedMaintenanceWindow: boolean;
  } {
    // Base calculation factors
    const rowsPerSecond = 10000;
    const indexOverheadFactor = 1.5;
    const memoryPerRow = 0.001; // 1KB per row estimate
    
    // Calculate duration based on row count and operation complexity
    const duplicateCheckDuration = Math.max(1000, (tableRowCount / rowsPerSecond) * 1000);
    const indexCreationDuration = Math.max(5000, (tableRowCount / rowsPerSecond) * 1000 * indexOverheadFactor);
    const constraintAdditionDuration = 3000;
    
    let totalDuration = duplicateCheckDuration + indexCreationDuration + constraintAdditionDuration;
    
    // Additional overhead for duplicate handling
    if (config.handleDuplicates === 'remove') {
      totalDuration += (tableRowCount / rowsPerSecond) * 2000; // Additional time for deletion
    }
    
    // Memory usage estimation
    const memoryUsageMB = Math.max(50, tableRowCount * memoryPerRow);
    
    // Disk space for index (estimated)
    const avgRowSize = 100; // bytes
    const indexColumns = config.columnNames.length;
    const diskSpaceRequiredMB = Math.max(10, (tableRowCount * avgRowSize * indexColumns) / (1024 * 1024));
    
    // Maintenance window recommendation
    const recommendedMaintenanceWindow = 
      tableRowCount > 100000 || // Large tables
      config.handleDuplicates === 'remove' || // Data deletion
      config.createConcurrently === false; // Non-concurrent operations
    
    return {
      estimatedDurationMs: Math.round(totalDuration),
      memoryUsageMB: Math.round(memoryUsageMB),
      diskSpaceRequiredMB: Math.round(diskSpaceRequiredMB),
      recommendedMaintenanceWindow
    };
  }
}