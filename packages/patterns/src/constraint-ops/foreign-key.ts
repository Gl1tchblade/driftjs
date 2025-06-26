// Define types locally to avoid cross-package dependencies in patterns

/**
 * Configuration for adding foreign key constraints safely
 */
export interface ForeignKeyPatternConfig {
  tableName: string;
  constraintName?: string;
  columnNames: string[];
  referencedTableName: string;
  referencedColumnNames: string[];
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  handleOrphans: 'fail' | 'remove' | 'mark' | 'set_null';
  orphanHandlingStrategy?: 'backup_first' | 'direct_action';
  deferrable?: boolean;
  initiallyDeferred?: boolean;
  batchSize?: number;
  timeoutMs?: number;
}

/**
 * Safe foreign key constraint addition pattern result
 */
export interface ForeignKeyPatternResult {
  steps: SafeForeignKeyStep[];
  estimatedDurationMs: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rollbackSteps: SafeForeignKeyStep[];
  preflightChecks: string[];
  warnings: string[];
  orphanCount?: number;
}

/**
 * Individual step in safe foreign key constraint addition
 */
export interface SafeForeignKeyStep {
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
 * Safe Foreign Key Constraint Addition Pattern
 * Implements the safest way to add foreign key constraints with orphan handling
 */
export class ForeignKeyPattern {
  /**
   * Generate safe foreign key constraint addition steps
   */
  public generateSafeSteps(config: ForeignKeyPatternConfig): ForeignKeyPatternResult {
    const steps: SafeForeignKeyStep[] = [];
    const rollbackSteps: SafeForeignKeyStep[] = [];
    const preflightChecks: string[] = [];
    const warnings: string[] = [];

    // Generate constraint name if not provided
    const constraintName = config.constraintName || 
      `fk_${config.tableName}_${config.columnNames.join('_')}_${config.referencedTableName}`;

    // Assess risk level
    const riskLevel = this.assessRiskLevel(config);

    // Add preflight checks
    this.addPreflightChecks(config, constraintName, preflightChecks);

    // Generate steps based on orphan handling strategy
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
   * Assess risk level for foreign key constraint addition
   */
  private assessRiskLevel(config: ForeignKeyPatternConfig): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (config.handleOrphans === 'fail') {
      return 'CRITICAL'; // Will fail if orphan records exist
    }
    if (config.handleOrphans === 'remove') {
      return 'HIGH'; // Data deletion is high risk
    }
    if (config.onDelete === 'CASCADE' || config.onUpdate === 'CASCADE') {
      return 'HIGH'; // Cascading operations are risky
    }
    if (config.handleOrphans === 'set_null' && config.columnNames.some(col => !col.endsWith('_nullable'))) {
      return 'MEDIUM'; // Setting non-nullable columns to null may cause issues
    }
    return 'LOW';
  }

  /**
   * Add preflight checks for foreign key constraint addition
   */
  private addPreflightChecks(
    config: ForeignKeyPatternConfig,
    constraintName: string,
    checks: string[]
  ): void {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Verify referenced table '${config.referencedTableName}' exists`,
      `Check if constraint '${constraintName}' already exists`,
      `Verify all source columns exist: ${config.columnNames.join(', ')}`,
      `Verify all referenced columns exist: ${config.referencedColumnNames.join(', ')}`,
      `Check for orphan records that violate the foreign key`,
      `Verify referenced table has appropriate indexes on referenced columns`,
      `Check for active transactions on both tables`,
      `Verify sufficient privileges for constraint creation`
    );

    if (config.handleOrphans === 'remove') {
      checks.push(
        `Backup orphan records before removal`,
        `Verify orphan handling strategy is acceptable`
      );
    }

    if (config.onDelete === 'CASCADE' || config.onUpdate === 'CASCADE') {
      checks.push(
        `WARNING: Cascading operations can affect multiple rows`,
        `Verify cascade behavior is intended and safe`
      );
    }
  }

  /**
   * Generate foreign key constraint addition steps
   */
  private generateConstraintSteps(
    config: ForeignKeyPatternConfig,
    constraintName: string,
    steps: SafeForeignKeyStep[],
    rollbackSteps: SafeForeignKeyStep[],
    warnings: string[]
  ): void {
    // Step 1: Check for orphan records
    steps.push({
      id: 'check-orphans',
      description: `Check for orphan records that would violate foreign key constraint`,
      sql: this.generateOrphanCheckQuery(config),
      estimatedDurationMs: 10000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW',
      validationQuery: this.generateOrphanCheckQuery(config),
      expectedResult: 0
    });

    // Step 2: Handle orphan records if they exist
    if (config.handleOrphans === 'remove') {
      this.addOrphanRemovalSteps(config, steps, rollbackSteps, warnings);
    } else if (config.handleOrphans === 'mark') {
      this.addOrphanMarkingSteps(config, steps, rollbackSteps, warnings);
    } else if (config.handleOrphans === 'set_null') {
      this.addOrphanNullificationSteps(config, steps, rollbackSteps, warnings);
    }

    // Step 3: Verify referenced table has proper index (create if needed)
    steps.push({
      id: 'ensure-referenced-index',
      description: `Ensure index exists on referenced columns`,
      sql: this.generateReferencedIndexSQL(config),
      estimatedDurationMs: 8000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW'
    });

    // Step 4: Add the foreign key constraint
    const constraintSQL = this.generateForeignKeyConstraintSQL(config, constraintName);
    const constraintRisk = config.deferrable ? 'LOW' : 'MEDIUM';
    
    steps.push({
      id: 'add-foreign-key-constraint',
      description: `Add foreign key constraint ${constraintName}`,
      sql: constraintSQL,
      estimatedDurationMs: 5000,
      canRollback: true,
      requiresMaintenanceWindow: !config.deferrable,
      riskLevel: constraintRisk,
      validationQuery: this.generateConstraintValidationQuery(config.tableName, constraintName),
      expectedResult: constraintName
    });

    rollbackSteps.push({
      id: 'rollback-foreign-key-constraint',
      description: `Drop foreign key constraint ${constraintName}`,
      sql: `ALTER TABLE ${config.tableName} DROP CONSTRAINT IF EXISTS ${constraintName};`,
      estimatedDurationMs: 2000,
      canRollback: false,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW'
    });

    // Add configuration-specific warnings
    this.addWarnings(config, warnings);
  }

  /**
   * Generate SQL to check for orphan records
   */
  private generateOrphanCheckQuery(config: ForeignKeyPatternConfig): string {
    const sourceColumns = config.columnNames.join(', ');
    const referencedColumns = config.referencedColumnNames.join(', ');
    
    // Build join condition
    const joinConditions = config.columnNames.map((col, index) => 
      `child.${col} = parent.${config.referencedColumnNames[index]}`
    ).join(' AND ');

    return `
      SELECT COUNT(*) as orphan_count
      FROM ${config.tableName} child
      LEFT JOIN ${config.referencedTableName} parent ON ${joinConditions}
      WHERE parent.${config.referencedColumnNames[0]} IS NULL
        AND child.${config.columnNames[0]} IS NOT NULL;
    `.trim();
  }

  /**
   * Add orphan removal steps
   */
  private addOrphanRemovalSteps(
    config: ForeignKeyPatternConfig,
    steps: SafeForeignKeyStep[],
    rollbackSteps: SafeForeignKeyStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'DESTRUCTIVE OPERATION: Orphan record removal will permanently delete data',
      'Ensure you have a complete backup before proceeding',
      'Consider manual orphan resolution instead of automatic removal'
    );

    if (config.orphanHandlingStrategy === 'backup_first') {
      // Create backup of orphan records
      steps.push({
        id: 'backup-orphans',
        description: 'Create backup of orphan records',
        sql: this.generateOrphanBackupSQL(config),
        estimatedDurationMs: 15000,
        canRollback: true,
        requiresMaintenanceWindow: false,
        riskLevel: 'MEDIUM'
      });
    }

    // Remove orphan records
    steps.push({
      id: 'remove-orphans',
      description: 'Remove orphan records that violate foreign key constraint',
      sql: this.generateOrphanRemovalSQL(config),
      estimatedDurationMs: 25000,
      canRollback: false, // Cannot rollback data deletion
      requiresMaintenanceWindow: true,
      riskLevel: 'HIGH'
    });
  }

  /**
   * Add orphan marking steps
   */
  private addOrphanMarkingSteps(
    config: ForeignKeyPatternConfig,
    steps: SafeForeignKeyStep[],
    rollbackSteps: SafeForeignKeyStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'Orphan records will be marked but not removed',
      'Manual intervention required to resolve orphan relationships',
      'Constraint addition will fail until orphans are resolved'
    );

    // Add orphan marker column if it doesn't exist
    steps.push({
      id: 'add-orphan-marker',
      description: 'Add column to mark orphan records',
      sql: `ALTER TABLE ${config.tableName} ADD COLUMN IF NOT EXISTS _orphan_marker BOOLEAN DEFAULT FALSE;`,
      estimatedDurationMs: 2000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW'
    });

    // Mark orphan records
    steps.push({
      id: 'mark-orphans',
      description: 'Mark orphan records for manual resolution',
      sql: this.generateOrphanMarkingSQL(config),
      estimatedDurationMs: 12000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW'
    });
  }

  /**
   * Add orphan nullification steps
   */
  private addOrphanNullificationSteps(
    config: ForeignKeyPatternConfig,
    steps: SafeForeignKeyStep[],
    rollbackSteps: SafeForeignKeyStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'Orphan records will have foreign key columns set to NULL',
      'Ensure foreign key columns are nullable before proceeding',
      'This may affect application logic that depends on these values'
    );

    // Set orphan foreign keys to NULL
    steps.push({
      id: 'nullify-orphans',
      description: 'Set orphan foreign key values to NULL',
      sql: this.generateOrphanNullificationSQL(config),
      estimatedDurationMs: 15000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'MEDIUM'
    });
  }

  /**
   * Generate referenced table index SQL
   */
  private generateReferencedIndexSQL(config: ForeignKeyPatternConfig): string {
    const referencedColumns = config.referencedColumnNames.join(', ');
    const indexName = `idx_${config.referencedTableName}_${config.referencedColumnNames.join('_')}_fk`;
    
    return `
      CREATE INDEX IF NOT EXISTS ${indexName} 
      ON ${config.referencedTableName} (${referencedColumns});
    `.trim();
  }

  /**
   * Generate foreign key constraint SQL
   */
  private generateForeignKeyConstraintSQL(config: ForeignKeyPatternConfig, constraintName: string): string {
    const sourceColumns = config.columnNames.join(', ');
    const referencedColumns = config.referencedColumnNames.join(', ');
    
    let sql = `ALTER TABLE ${config.tableName} ADD CONSTRAINT ${constraintName} `;
    sql += `FOREIGN KEY (${sourceColumns}) `;
    sql += `REFERENCES ${config.referencedTableName} (${referencedColumns})`;
    
    if (config.onDelete) {
      sql += ` ON DELETE ${config.onDelete}`;
    }
    
    if (config.onUpdate) {
      sql += ` ON UPDATE ${config.onUpdate}`;
    }
    
    if (config.deferrable) {
      sql += ` DEFERRABLE`;
      if (config.initiallyDeferred) {
        sql += ` INITIALLY DEFERRED`;
      }
    }
    
    return sql + ';';
  }

  /**
   * Generate orphan backup SQL
   */
  private generateOrphanBackupSQL(config: ForeignKeyPatternConfig): string {
    const backupTableName = `${config.tableName}_orphans_backup_${Date.now()}`;
    const joinConditions = config.columnNames.map((col, index) => 
      `child.${col} = parent.${config.referencedColumnNames[index]}`
    ).join(' AND ');

    return `
      CREATE TABLE ${backupTableName} AS
      SELECT child.*
      FROM ${config.tableName} child
      LEFT JOIN ${config.referencedTableName} parent ON ${joinConditions}
      WHERE parent.${config.referencedColumnNames[0]} IS NULL
        AND child.${config.columnNames[0]} IS NOT NULL;
    `.trim();
  }

  /**
   * Generate orphan removal SQL
   */
  private generateOrphanRemovalSQL(config: ForeignKeyPatternConfig): string {
    const joinConditions = config.columnNames.map((col, index) => 
      `child.${col} = parent.${config.referencedColumnNames[index]}`
    ).join(' AND ');

    return `
      DELETE child
      FROM ${config.tableName} child
      LEFT JOIN ${config.referencedTableName} parent ON ${joinConditions}
      WHERE parent.${config.referencedColumnNames[0]} IS NULL
        AND child.${config.columnNames[0]} IS NOT NULL;
    `.trim();
  }

  /**
   * Generate orphan marking SQL
   */
  private generateOrphanMarkingSQL(config: ForeignKeyPatternConfig): string {
    const joinConditions = config.columnNames.map((col, index) => 
      `child.${col} = parent.${config.referencedColumnNames[index]}`
    ).join(' AND ');

    return `
      UPDATE ${config.tableName} child
      LEFT JOIN ${config.referencedTableName} parent ON ${joinConditions}
      SET child._orphan_marker = TRUE
      WHERE parent.${config.referencedColumnNames[0]} IS NULL
        AND child.${config.columnNames[0]} IS NOT NULL;
    `.trim();
  }

  /**
   * Generate orphan nullification SQL
   */
  private generateOrphanNullificationSQL(config: ForeignKeyPatternConfig): string {
    const joinConditions = config.columnNames.map((col, index) => 
      `child.${col} = parent.${config.referencedColumnNames[index]}`
    ).join(' AND ');
    
    const nullificationSets = config.columnNames.map(col => `child.${col} = NULL`).join(', ');

    return `
      UPDATE ${config.tableName} child
      LEFT JOIN ${config.referencedTableName} parent ON ${joinConditions}
      SET ${nullificationSets}
      WHERE parent.${config.referencedColumnNames[0]} IS NULL
        AND child.${config.columnNames[0]} IS NOT NULL;
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
        AND constraint_type = 'FOREIGN KEY';
    `.trim();
  }

  /**
   * Add configuration-specific warnings
   */
  private addWarnings(config: ForeignKeyPatternConfig, warnings: string[]): void {
    if (config.onDelete === 'CASCADE' || config.onUpdate === 'CASCADE') {
      warnings.push('CASCADE operations can affect multiple tables and rows');
    }

    if (config.handleOrphans === 'fail') {
      warnings.push('Operation will fail if any orphan records exist');
    }

    if (!config.deferrable) {
      warnings.push('Non-deferrable constraints are checked immediately and may require maintenance window');
    }

    if (config.handleOrphans === 'set_null') {
      warnings.push('Ensure foreign key columns are nullable before using set_null strategy');
    }
  }

  /**
   * Generate validation queries for the constraint
   */
  public generateValidationQueries(config: ForeignKeyPatternConfig): string[] {
    const constraintName = config.constraintName || 
      `fk_${config.tableName}_${config.columnNames.join('_')}_${config.referencedTableName}`;
    
    return [
      this.generateOrphanCheckQuery(config),
      this.generateConstraintValidationQuery(config.tableName, constraintName),
      `SELECT COUNT(*) FROM ${config.tableName};`, // Verify no data loss
      `SELECT COUNT(*) FROM ${config.referencedTableName};` // Verify referenced table integrity
    ];
  }

  /**
   * Estimate performance impact of foreign key constraint addition
   */
  public estimatePerformanceImpact(
    config: ForeignKeyPatternConfig,
    sourceTableRowCount: number,
    referencedTableRowCount: number
  ): {
    estimatedDurationMs: number;
    memoryUsageMB: number;
    diskSpaceRequiredMB: number;
    recommendedMaintenanceWindow: boolean;
  } {
    // Base calculation factors
    const rowsPerSecond = 8000; // FK validation is slower than simple operations
    const memoryPerRow = 0.002; // 2KB per row estimate for FK operations
    
    // Calculate duration based on row counts and operation complexity
    const orphanCheckDuration = Math.max(2000, (sourceTableRowCount / rowsPerSecond) * 1000);
    const indexCreationDuration = Math.max(3000, (referencedTableRowCount / rowsPerSecond) * 1000);
    const constraintAdditionDuration = Math.max(5000, (sourceTableRowCount / rowsPerSecond) * 2000);
    
    let totalDuration = orphanCheckDuration + indexCreationDuration + constraintAdditionDuration;
    
    // Additional overhead for orphan handling
    if (config.handleOrphans === 'remove') {
      totalDuration += (sourceTableRowCount / rowsPerSecond) * 3000; // Additional time for deletion
    } else if (config.handleOrphans === 'set_null') {
      totalDuration += (sourceTableRowCount / rowsPerSecond) * 1500; // Additional time for updates
    }
    
    // Memory usage estimation (higher for FK operations due to joins)
    const memoryUsageMB = Math.max(100, (sourceTableRowCount + referencedTableRowCount) * memoryPerRow);
    
    // Disk space for backup and indexes
    const avgRowSize = 150; // bytes (higher for FK operations)
    const diskSpaceRequiredMB = Math.max(20, 
      (sourceTableRowCount * avgRowSize * config.columnNames.length) / (1024 * 1024)
    );
    
    // Maintenance window recommendation
    const recommendedMaintenanceWindow = 
      sourceTableRowCount > 50000 || // Large source tables
      referencedTableRowCount > 100000 || // Large referenced tables
      config.handleOrphans === 'remove' || // Data deletion
      !config.deferrable || // Non-deferrable constraints
      config.onDelete === 'CASCADE' || config.onUpdate === 'CASCADE'; // Cascading operations
    
    return {
      estimatedDurationMs: Math.round(totalDuration),
      memoryUsageMB: Math.round(memoryUsageMB),
      diskSpaceRequiredMB: Math.round(diskSpaceRequiredMB),
      recommendedMaintenanceWindow
    };
  }
}