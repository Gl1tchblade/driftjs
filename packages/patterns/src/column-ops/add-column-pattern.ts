// Define types locally to avoid cross-package dependencies in patterns

/**
 * Configuration for adding columns safely
 */
export interface AddColumnPatternConfig {
  tableName: string;
  columnName: string;
  columnType: string;
  nullable: boolean;
  defaultValue?: string | number | boolean;
  comment?: string;
  batchSize?: number;
  timeoutMs?: number;
}

/**
 * Safe column addition pattern result
 */
export interface AddColumnPatternResult {
  steps: SafeColumnStep[];
  estimatedDurationMs: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  rollbackSteps: SafeColumnStep[];
  preflightChecks: string[];
  warnings: string[];
}

/**
 * Individual step in safe column addition
 */
export interface SafeColumnStep {
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
 * Safe Column Addition Pattern
 * Implements the safest way to add columns, especially NOT NULL columns
 */
export class AddColumnPattern {
  /**
   * Generate safe column addition steps
   */
  public generateSafeSteps(config: AddColumnPatternConfig): AddColumnPatternResult {
    const steps: SafeColumnStep[] = [];
    const rollbackSteps: SafeColumnStep[] = [];
    const preflightChecks: string[] = [];
    const warnings: string[] = [];

    // Determine if this is a risky operation
    const isNotNullWithoutDefault = !config.nullable && config.defaultValue === undefined;
    const riskLevel = this.assessRiskLevel(config);

    // Add preflight checks
    this.addPreflightChecks(config, preflightChecks);

    if (isNotNullWithoutDefault) {
      // High-risk pattern: NOT NULL column without default
      this.generateNotNullWithoutDefaultSteps(config, steps, rollbackSteps, warnings);
    } else if (!config.nullable && config.defaultValue !== undefined) {
      // Medium-risk pattern: NOT NULL column with default
      this.generateNotNullWithDefaultSteps(config, steps, rollbackSteps, warnings);
    } else {
      // Low-risk pattern: Nullable column
      this.generateNullableColumnSteps(config, steps, rollbackSteps);
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
   * Assess risk level for column addition
   */
  private assessRiskLevel(config: AddColumnPatternConfig): 'LOW' | 'MEDIUM' | 'HIGH' {
    if (!config.nullable && config.defaultValue === undefined) {
      return 'HIGH'; // NOT NULL without default requires table scan
    }
    if (!config.nullable && config.defaultValue !== undefined) {
      return 'MEDIUM'; // NOT NULL with default is safer but still requires caution
    }
    return 'LOW'; // Nullable columns are generally safe
  }

  /**
   * Add preflight checks for the operation
   */
  private addPreflightChecks(config: AddColumnPatternConfig, checks: string[]): void {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Check if column '${config.columnName}' already exists`,
      `Verify database has sufficient storage space`,
      `Check for active long-running transactions`,
      `Verify table is not currently locked`
    );

    if (!config.nullable && config.defaultValue === undefined) {
      checks.push(
        `Verify table '${config.tableName}' has no existing rows (or plan for data migration)`,
        `Check table size to estimate operation duration`
      );
    }
  }

  /**
   * Generate steps for NOT NULL column without default (highest risk)
   */
  private generateNotNullWithoutDefaultSteps(
    config: AddColumnPatternConfig,
    steps: SafeColumnStep[],
    rollbackSteps: SafeColumnStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'Adding NOT NULL column without default value is high-risk',
      'This operation will fail if table contains existing data',
      'Consider adding a default value or making column nullable initially'
    );

    // Step 1: Add column as nullable first
    steps.push({
      id: 'add-nullable-column',
      description: `Add column ${config.columnName} as nullable`,
      sql: `ALTER TABLE ${config.tableName} ADD COLUMN ${config.columnName} ${config.columnType} NULL${config.comment ? ` COMMENT '${config.comment}'` : ''};`,
      estimatedDurationMs: 2000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      validationQuery: `SELECT column_name FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      expectedResult: config.columnName
    });

    rollbackSteps.push({
      id: 'rollback-add-nullable-column',
      description: `Remove column ${config.columnName}`,
      sql: `ALTER TABLE ${config.tableName} DROP COLUMN ${config.columnName};`,
      estimatedDurationMs: 1000,
      canRollback: false,
      requiresMaintenanceWindow: false
    });

    // Step 2: Update existing rows (if any) with appropriate values
    steps.push({
      id: 'populate-column-values',
      description: `Populate values for column ${config.columnName}`,
      sql: `UPDATE ${config.tableName} SET ${config.columnName} = 'PLACEHOLDER_VALUE' WHERE ${config.columnName} IS NULL;`,
      estimatedDurationMs: 10000,
      canRollback: true,
      requiresMaintenanceWindow: true,
      validationQuery: `SELECT COUNT(*) FROM ${config.tableName} WHERE ${config.columnName} IS NULL;`,
      expectedResult: 0
    });

    // Step 3: Add NOT NULL constraint
    steps.push({
      id: 'add-not-null-constraint',
      description: `Add NOT NULL constraint to column ${config.columnName}`,
      sql: `ALTER TABLE ${config.tableName} ALTER COLUMN ${config.columnName} SET NOT NULL;`,
      estimatedDurationMs: 5000,
      canRollback: true,
      requiresMaintenanceWindow: true,
      validationQuery: `SELECT is_nullable FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      expectedResult: 'NO'
    });

    rollbackSteps.push({
      id: 'rollback-not-null-constraint',
      description: `Remove NOT NULL constraint from column ${config.columnName}`,
      sql: `ALTER TABLE ${config.tableName} ALTER COLUMN ${config.columnName} DROP NOT NULL;`,
      estimatedDurationMs: 1000,
      canRollback: false,
      requiresMaintenanceWindow: false
    });
  }

  /**
   * Generate steps for NOT NULL column with default (medium risk)
   */
  private generateNotNullWithDefaultSteps(
    config: AddColumnPatternConfig,
    steps: SafeColumnStep[],
    rollbackSteps: SafeColumnStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'Adding NOT NULL column with default value requires table scan',
      'Operation duration depends on table size',
      'Consider adding during maintenance window for large tables'
    );

    // Single step: Add column with default and NOT NULL
    const defaultValue = typeof config.defaultValue === 'string' ? `'${config.defaultValue}'` : config.defaultValue;
    
    steps.push({
      id: 'add-not-null-column-with-default',
      description: `Add NOT NULL column ${config.columnName} with default value`,
      sql: `ALTER TABLE ${config.tableName} ADD COLUMN ${config.columnName} ${config.columnType} NOT NULL DEFAULT ${defaultValue}${config.comment ? ` COMMENT '${config.comment}'` : ''};`,
      estimatedDurationMs: 8000,
      canRollback: true,
      requiresMaintenanceWindow: true,
      validationQuery: `SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      expectedResult: { column_name: config.columnName, is_nullable: 'NO', column_default: defaultValue }
    });

    rollbackSteps.push({
      id: 'rollback-add-not-null-column',
      description: `Remove column ${config.columnName}`,
      sql: `ALTER TABLE ${config.tableName} DROP COLUMN ${config.columnName};`,
      estimatedDurationMs: 2000,
      canRollback: false,
      requiresMaintenanceWindow: false
    });
  }

  /**
   * Generate steps for nullable column (low risk)
   */
  private generateNullableColumnSteps(
    config: AddColumnPatternConfig,
    steps: SafeColumnStep[],
    rollbackSteps: SafeColumnStep[]
  ): void {
    // Single step: Add nullable column
    const defaultClause = config.defaultValue ? ` DEFAULT ${typeof config.defaultValue === 'string' ? `'${config.defaultValue}'` : config.defaultValue}` : '';
    
    steps.push({
      id: 'add-nullable-column',
      description: `Add nullable column ${config.columnName}`,
      sql: `ALTER TABLE ${config.tableName} ADD COLUMN ${config.columnName} ${config.columnType}${defaultClause}${config.comment ? ` COMMENT '${config.comment}'` : ''};`,
      estimatedDurationMs: 1000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      validationQuery: `SELECT column_name FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      expectedResult: config.columnName
    });

    rollbackSteps.push({
      id: 'rollback-add-nullable-column',
      description: `Remove column ${config.columnName}`,
      sql: `ALTER TABLE ${config.tableName} DROP COLUMN ${config.columnName};`,
      estimatedDurationMs: 500,
      canRollback: false,
      requiresMaintenanceWindow: false
    });
  }

  /**
   * Generate validation queries for the operation
   */
  public generateValidationQueries(config: AddColumnPatternConfig): string[] {
    return [
      `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      `SELECT data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      `SELECT COUNT(*) FROM ${config.tableName} WHERE ${config.columnName} IS NULL;`
    ];
  }

  /**
   * Generate performance impact estimation
   */
  public estimatePerformanceImpact(config: AddColumnPatternConfig, tableRowCount: number): {
    estimatedDurationMs: number;
    memoryUsageMB: number;
    diskSpaceRequiredMB: number;
    recommendedMaintenanceWindow: boolean;
  } {
    const baseTime = 1000; // 1 second base time
    const rowProcessingTime = tableRowCount * 0.1; // 0.1ms per row
    const typeOverhead = this.getTypeOverhead(config.columnType);
    
    const estimatedDurationMs = baseTime + rowProcessingTime + typeOverhead;
    const memoryUsageMB = Math.max(10, tableRowCount * 0.001); // Minimum 10MB
    const diskSpaceRequiredMB = tableRowCount * this.getColumnSize(config.columnType) / (1024 * 1024);
    const recommendedMaintenanceWindow = estimatedDurationMs > 30000 || !config.nullable;

    return {
      estimatedDurationMs,
      memoryUsageMB,
      diskSpaceRequiredMB,
      recommendedMaintenanceWindow
    };
  }

  /**
   * Get processing time overhead for different column types
   */
  private getTypeOverhead(columnType: string): number {
    const type = columnType.toLowerCase();
    
    if (type.includes('text') || type.includes('varchar')) {
      return 2000; // String types take longer
    }
    if (type.includes('json') || type.includes('jsonb')) {
      return 3000; // JSON types take even longer
    }
    if (type.includes('decimal') || type.includes('numeric')) {
      return 1500; // Numeric types have medium overhead
    }
    
    return 500; // Default for simple types
  }

  /**
   * Get approximate storage size for column types
   */
  private getColumnSize(columnType: string): number {
    const type = columnType.toLowerCase();
    
    if (type.includes('bigint') || type.includes('int8')) return 8;
    if (type.includes('int') || type.includes('integer')) return 4;
    if (type.includes('smallint') || type.includes('int2')) return 2;
    if (type.includes('boolean') || type.includes('bool')) return 1;
    if (type.includes('uuid')) return 16;
    if (type.includes('timestamp')) return 8;
    if (type.includes('date')) return 4;
    if (type.includes('decimal') || type.includes('numeric')) return 8;
    if (type.includes('varchar') || type.includes('text')) return 50; // Average estimate
    if (type.includes('json')) return 100; // Average estimate
    
    return 8; // Default estimate
  }
} 