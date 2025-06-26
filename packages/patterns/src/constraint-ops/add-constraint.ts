// Define types locally to avoid cross-package dependencies in patterns

/**
 * Configuration for adding constraints safely
 */
export interface AddConstraintPatternConfig {
  tableName: string;
  constraintName?: string;
  constraintType: 'CHECK' | 'PRIMARY_KEY';
  // For CHECK constraints
  checkExpression?: string;
  validateExistingData?: boolean;
  // For PRIMARY KEY constraints  
  columnNames?: string[];
  replaceExisting?: boolean;
  createUniqueIndex?: boolean;
  batchSize?: number;
  timeoutMs?: number;
}

/**
 * Safe constraint addition pattern result
 */
export interface AddConstraintPatternResult {
  steps: SafeAddConstraintStep[];
  estimatedDurationMs: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rollbackSteps: SafeAddConstraintStep[];
  preflightChecks: string[];
  warnings: string[];
  violationCount?: number;
}

/**
 * Individual step in safe constraint addition
 */
export interface SafeAddConstraintStep {
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
 * Safe Add Constraint Pattern
 * Implements the safest way to add various constraint types
 */
export class AddConstraintPattern {
  /**
   * Generate safe constraint addition steps
   */
  public generateSafeSteps(config: AddConstraintPatternConfig): AddConstraintPatternResult {
    const steps: SafeAddConstraintStep[] = [];
    const rollbackSteps: SafeAddConstraintStep[] = [];
    const preflightChecks: string[] = [];
    const warnings: string[] = [];

    // Generate constraint name if not provided
    const constraintName = this.generateConstraintName(config);

    // Assess risk level
    const riskLevel = this.assessRiskLevel(config);

    // Add preflight checks
    this.addPreflightChecks(config, constraintName, preflightChecks);

    // Generate steps based on constraint type
    if (config.constraintType === 'CHECK') {
      this.generateCheckConstraintSteps(config, constraintName, steps, rollbackSteps, warnings);
    } else if (config.constraintType === 'PRIMARY_KEY') {
      this.generatePrimaryKeySteps(config, constraintName, steps, rollbackSteps, warnings);
    }

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
   * Generate appropriate constraint name
   */
  private generateConstraintName(config: AddConstraintPatternConfig): string {
    if (config.constraintName) {
      return config.constraintName;
    }

    if (config.constraintType === 'CHECK') {
      return `chk_${config.tableName}_${Date.now()}`;
    } else if (config.constraintType === 'PRIMARY_KEY') {
      const columnPart = config.columnNames?.join('_') || 'pk';
      return `pk_${config.tableName}_${columnPart}`;
    }

    return `constraint_${config.tableName}_${Date.now()}`;
  }

  /**
   * Assess risk level for constraint addition
   */
  private assessRiskLevel(config: AddConstraintPatternConfig): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (config.constraintType === 'PRIMARY_KEY' && config.replaceExisting) {
      return 'CRITICAL'; // Dropping existing PK is very risky
    }
    if (config.constraintType === 'CHECK' && !config.validateExistingData) {
      return 'HIGH'; // May fail if existing data violates constraint
    }
    if (config.constraintType === 'PRIMARY_KEY') {
      return 'HIGH'; // PK changes are always high risk
    }
    return 'MEDIUM'; // CHECK constraints are generally medium risk
  }

  /**
   * Add preflight checks for constraint addition
   */
  private addPreflightChecks(
    config: AddConstraintPatternConfig,
    constraintName: string,
    checks: string[]
  ): void {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Check if constraint '${constraintName}' already exists`,
      `Verify table is not currently locked`,
      `Check for active long-running transactions`
    );

    if (config.constraintType === 'CHECK') {
      checks.push(
        `Validate CHECK expression syntax: ${config.checkExpression}`,
        `Test CHECK expression against existing data`
      );
    } else if (config.constraintType === 'PRIMARY_KEY') {
      checks.push(
        `Verify all primary key columns exist: ${config.columnNames?.join(', ')}`,
        `Check for NULL values in primary key columns`,
        `Check for duplicate values in primary key columns`
      );
      
      if (config.replaceExisting) {
        checks.push(
          `Identify existing primary key constraint`,
          `Verify impact of dropping existing primary key`
        );
      }
    }
  }

  /**
   * Generate CHECK constraint addition steps
   */
  private generateCheckConstraintSteps(
    config: AddConstraintPatternConfig,
    constraintName: string,
    steps: SafeAddConstraintStep[],
    rollbackSteps: SafeAddConstraintStep[],
    warnings: string[]
  ): void {
    if (!config.checkExpression) {
      throw new Error('CHECK expression is required for CHECK constraints');
    }

    // Step 1: Validate existing data against the constraint
    if (config.validateExistingData !== false) {
      steps.push({
        id: 'validate-existing-data',
        description: `Validate existing data against CHECK constraint`,
        sql: this.generateCheckValidationQuery(config),
        estimatedDurationMs: 8000,
        canRollback: true,
        requiresMaintenanceWindow: false,
        riskLevel: 'LOW',
        validationQuery: this.generateCheckValidationQuery(config),
        expectedResult: 0
      });

      warnings.push(
        'Existing data will be validated against the CHECK constraint',
        'Operation will fail if any existing rows violate the constraint'
      );
    } else {
      warnings.push(
        'CRITICAL: Existing data validation is disabled',
        'Constraint addition may fail if existing data violates the constraint',
        'Consider enabling validation to avoid runtime failures'
      );
    }

    // Step 2: Add the CHECK constraint
    steps.push({
      id: 'add-check-constraint',
      description: `Add CHECK constraint ${constraintName}`,
      sql: `ALTER TABLE ${config.tableName} ADD CONSTRAINT ${constraintName} CHECK (${config.checkExpression});`,
      estimatedDurationMs: 3000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'MEDIUM',
      validationQuery: this.generateConstraintValidationQuery(config.tableName, constraintName, 'CHECK'),
      expectedResult: constraintName
    });

    rollbackSteps.push({
      id: 'rollback-check-constraint',
      description: `Drop CHECK constraint ${constraintName}`,
      sql: `ALTER TABLE ${config.tableName} DROP CONSTRAINT IF EXISTS ${constraintName};`,
      estimatedDurationMs: 2000,
      canRollback: false,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW'
    });
  }

  /**
   * Generate PRIMARY KEY constraint addition steps
   */
  private generatePrimaryKeySteps(
    config: AddConstraintPatternConfig,
    constraintName: string,
    steps: SafeAddConstraintStep[],
    rollbackSteps: SafeAddConstraintStep[],
    warnings: string[]
  ): void {
    if (!config.columnNames || config.columnNames.length === 0) {
      throw new Error('Column names are required for PRIMARY KEY constraints');
    }

    const columnList = config.columnNames.join(', ');

    // Step 1: Validate primary key requirements
    steps.push({
      id: 'validate-pk-requirements',
      description: `Validate primary key requirements for columns: ${columnList}`,
      sql: this.generatePrimaryKeyValidationQuery(config),
      estimatedDurationMs: 10000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'MEDIUM',
      validationQuery: this.generatePrimaryKeyValidationQuery(config),
      expectedResult: 0
    });

    // Step 2: Handle existing primary key if replacing
    if (config.replaceExisting) {
      warnings.push(
        'CRITICAL: Existing primary key will be dropped',
        'This may affect foreign key relationships',
        'Ensure no foreign keys reference the current primary key',
        'Application code may be affected by primary key changes'
      );

      steps.push({
        id: 'backup-existing-pk',
        description: 'Backup information about existing primary key',
        sql: this.generatePrimaryKeyBackupQuery(config.tableName),
        estimatedDurationMs: 2000,
        canRollback: true,
        requiresMaintenanceWindow: false,
        riskLevel: 'LOW'
      });

      steps.push({
        id: 'drop-existing-pk',
        description: 'Drop existing primary key constraint',
        sql: this.generateDropPrimaryKeySQL(config.tableName),
        estimatedDurationMs: 5000,
        canRollback: false, // Cannot easily rollback PK drops
        requiresMaintenanceWindow: true,
        riskLevel: 'CRITICAL'
      });
    }

    // Step 3: Create unique index first (for better performance)
    if (config.createUniqueIndex !== false) {
      const indexName = `idx_${constraintName}_unique`;
      
      steps.push({
        id: 'create-unique-index',
        description: `Create unique index for primary key`,
        sql: `CREATE UNIQUE INDEX ${indexName} ON ${config.tableName} (${columnList});`,
        estimatedDurationMs: 15000,
        canRollback: true,
        requiresMaintenanceWindow: true,
        riskLevel: 'MEDIUM'
      });

      rollbackSteps.push({
        id: 'rollback-unique-index',
        description: `Drop unique index ${indexName}`,
        sql: `DROP INDEX IF EXISTS ${indexName};`,
        estimatedDurationMs: 2000,
        canRollback: false,
        requiresMaintenanceWindow: false,
        riskLevel: 'LOW'
      });
    }

    // Step 4: Add the primary key constraint
    steps.push({
      id: 'add-primary-key',
      description: `Add primary key constraint ${constraintName}`,
      sql: `ALTER TABLE ${config.tableName} ADD CONSTRAINT ${constraintName} PRIMARY KEY (${columnList});`,
      estimatedDurationMs: 8000,
      canRollback: true,
      requiresMaintenanceWindow: true,
      riskLevel: 'HIGH',
      validationQuery: this.generateConstraintValidationQuery(config.tableName, constraintName, 'PRIMARY KEY'),
      expectedResult: constraintName
    });

    rollbackSteps.push({
      id: 'rollback-primary-key',
      description: `Drop primary key constraint ${constraintName}`,
      sql: `ALTER TABLE ${config.tableName} DROP CONSTRAINT IF EXISTS ${constraintName};`,
      estimatedDurationMs: 3000,
      canRollback: false,
      requiresMaintenanceWindow: false,
      riskLevel: 'MEDIUM'
    });

    // Add primary key specific warnings
    warnings.push(
      'Primary key changes require maintenance window',
      'Ensure all primary key columns are NOT NULL',
      'Primary key addition will create an implicit unique index'
    );
  }

  /**
   * Generate CHECK constraint validation query
   */
  private generateCheckValidationQuery(config: AddConstraintPatternConfig): string {
    return `
      SELECT COUNT(*) as violation_count
      FROM ${config.tableName}
      WHERE NOT (${config.checkExpression});
    `.trim();
  }

  /**
   * Generate primary key validation query
   */
  private generatePrimaryKeyValidationQuery(config: AddConstraintPatternConfig): string {
    const columnList = config.columnNames!.join(', ');
    const nullChecks = config.columnNames!.map(col => `${col} IS NULL`).join(' OR ');
    
    return `
      SELECT 
        (SELECT COUNT(*) FROM ${config.tableName} WHERE ${nullChecks}) as null_count,
        (SELECT COUNT(*) - COUNT(DISTINCT ${columnList}) FROM ${config.tableName}) as duplicate_count;
    `.trim();
  }

  /**
   * Generate primary key backup query
   */
  private generatePrimaryKeyBackupQuery(tableName: string): string {
    return `
      SELECT constraint_name, column_name
      FROM information_schema.key_column_usage
      WHERE table_name = '${tableName}'
        AND constraint_name IN (
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_name = '${tableName}'
            AND constraint_type = 'PRIMARY KEY'
        );
    `.trim();
  }

  /**
   * Generate drop primary key SQL
   */
  private generateDropPrimaryKeySQL(tableName: string): string {
    // This is database-specific; this is a generic version
    return `
      ALTER TABLE ${tableName} DROP CONSTRAINT (
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = '${tableName}'
          AND constraint_type = 'PRIMARY KEY'
      );
    `.trim();
  }

  /**
   * Generate constraint validation query
   */
  private generateConstraintValidationQuery(
    tableName: string, 
    constraintName: string, 
    constraintType: string
  ): string {
    return `
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = '${tableName}'
        AND constraint_name = '${constraintName}'
        AND constraint_type = '${constraintType}';
    `.trim();
  }

  /**
   * Generate validation queries for the constraint
   */
  public generateValidationQueries(config: AddConstraintPatternConfig): string[] {
    const constraintName = this.generateConstraintName(config);
    const constraintType = config.constraintType === 'PRIMARY_KEY' ? 'PRIMARY KEY' : 'CHECK';
    
    const queries = [
      this.generateConstraintValidationQuery(config.tableName, constraintName, constraintType),
      `SELECT COUNT(*) FROM ${config.tableName};` // Verify no data loss
    ];

    if (config.constraintType === 'CHECK' && config.checkExpression) {
      queries.push(this.generateCheckValidationQuery(config));
    } else if (config.constraintType === 'PRIMARY_KEY' && config.columnNames) {
      queries.push(this.generatePrimaryKeyValidationQuery(config));
    }

    return queries;
  }

  /**
   * Estimate performance impact of constraint addition
   */
  public estimatePerformanceImpact(
    config: AddConstraintPatternConfig,
    tableRowCount: number
  ): {
    estimatedDurationMs: number;
    memoryUsageMB: number;
    diskSpaceRequiredMB: number;
    recommendedMaintenanceWindow: boolean;
  } {
    // Base calculation factors
    const rowsPerSecond = 12000; // Constraint validation is moderately fast
    const memoryPerRow = 0.0015; // 1.5KB per row estimate
    
    // Calculate duration based on constraint type and row count
    let validationDuration = Math.max(1000, (tableRowCount / rowsPerSecond) * 1000);
    let constraintAdditionDuration = 3000;
    
    if (config.constraintType === 'PRIMARY_KEY') {
      constraintAdditionDuration = Math.max(8000, (tableRowCount / rowsPerSecond) * 2000);
      if (config.createUniqueIndex !== false) {
        constraintAdditionDuration += Math.max(15000, (tableRowCount / rowsPerSecond) * 1500);
      }
    }
    
    let totalDuration = validationDuration + constraintAdditionDuration;
    
    // Additional overhead for primary key replacement
    if (config.constraintType === 'PRIMARY_KEY' && config.replaceExisting) {
      totalDuration += 10000; // Additional overhead for PK replacement
    }
    
    // Memory usage estimation
    const memoryUsageMB = Math.max(30, tableRowCount * memoryPerRow);
    
    // Disk space estimation (for indexes and temporary data)
    const avgRowSize = 100; // bytes
    let diskSpaceRequiredMB = 5; // Minimum overhead
    
    if (config.constraintType === 'PRIMARY_KEY') {
      const pkColumns = config.columnNames?.length || 1;
      diskSpaceRequiredMB = Math.max(10, (tableRowCount * avgRowSize * pkColumns) / (1024 * 1024));
    }
    
    // Maintenance window recommendation
    const recommendedMaintenanceWindow = 
      tableRowCount > 100000 || // Large tables
      config.constraintType === 'PRIMARY_KEY' || // PK operations
      (config.constraintType === 'PRIMARY_KEY' && Boolean(config.replaceExisting)) || // PK replacement
      config.validateExistingData === false; // Risky operations
    
    return {
      estimatedDurationMs: Math.round(totalDuration),
      memoryUsageMB: Math.round(memoryUsageMB),
      diskSpaceRequiredMB: Math.round(diskSpaceRequiredMB),
      recommendedMaintenanceWindow
    };
  }
}