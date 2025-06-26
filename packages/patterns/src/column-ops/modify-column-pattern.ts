/**
 * Configuration for modifying columns safely
 */
export interface ModifyColumnPatternConfig {
  tableName: string;
  columnName: string;
  newColumnType: string;
  newNullable?: boolean;
  newDefaultValue?: string | number | boolean;
  validateDataCompatibility: boolean;
  createBackup: boolean;
  timeoutMs?: number;
}

/**
 * Safe column modification pattern result
 */
export interface ModifyColumnPatternResult {
  steps: SafeModifyStep[];
  estimatedDurationMs: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rollbackSteps: SafeModifyStep[];
  preflightChecks: string[];
  warnings: string[];
  compatibilityIssues: string[];
}

/**
 * Individual step in safe column modification
 */
export interface SafeModifyStep {
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
 * Data type compatibility result
 */
export interface DataTypeCompatibility {
  isCompatible: boolean;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  potentialDataLoss: boolean;
  issues: string[];
  recommendations: string[];
}

/**
 * Safe Column Modification Pattern
 * Implements the safest way to modify column types and properties
 */
export class ModifyColumnPattern {
  /**
   * Generate safe column modification steps
   */
  public generateSafeSteps(config: ModifyColumnPatternConfig): ModifyColumnPatternResult {
    const steps: SafeModifyStep[] = [];
    const rollbackSteps: SafeModifyStep[] = [];
    const preflightChecks: string[] = [];
    const warnings: string[] = [];
    const compatibilityIssues: string[] = [];

    // Assess risk level
    const riskLevel = this.assessRiskLevel(config);

    // Add preflight checks
    this.addPreflightChecks(config, preflightChecks);

    // Check data type compatibility
    if (config.validateDataCompatibility) {
      const compatibility = this.checkDataTypeCompatibility(config);
      compatibilityIssues.push(...compatibility.issues);
      
      if (!compatibility.isCompatible) {
        warnings.push(...compatibility.recommendations);
      }
    }

    // Generate appropriate steps based on risk and backup preference
    if (config.createBackup) {
      this.generateBackupAndModifySteps(config, steps, rollbackSteps, warnings);
    } else if (riskLevel === 'CRITICAL') {
      this.generateBlockedSteps(config, steps, warnings);
    } else {
      this.generateDirectModifySteps(config, steps, rollbackSteps, warnings);
    }

    const estimatedDurationMs = steps.reduce((total, step) => total + step.estimatedDurationMs, 0);

    return {
      steps,
      estimatedDurationMs,
      riskLevel,
      rollbackSteps: rollbackSteps.reverse(), // Reverse for proper rollback order
      preflightChecks,
      warnings,
      compatibilityIssues
    };
  }

  /**
   * Assess risk level for column modification
   */
  private assessRiskLevel(config: ModifyColumnPatternConfig): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const compatibility = this.checkDataTypeCompatibility(config);
    
    if (compatibility.potentialDataLoss && !config.createBackup) {
      return 'CRITICAL'; // Potential data loss without backup
    }
    if (compatibility.riskLevel === 'CRITICAL') {
      return 'CRITICAL';
    }
    if (compatibility.riskLevel === 'HIGH' || compatibility.potentialDataLoss) {
      return 'HIGH';
    }
    if (compatibility.riskLevel === 'MEDIUM') {
      return 'MEDIUM';
    }
    return 'LOW';
  }

  /**
   * Add preflight checks for the operation
   */
  private addPreflightChecks(config: ModifyColumnPatternConfig, checks: string[]): void {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Verify column '${config.columnName}' exists in table '${config.tableName}'`,
      `Check current column definition and constraints`,
      `Verify new column type '${config.newColumnType}' is valid`,
      `Check if column '${config.columnName}' is part of any indexes`,
      `Check if column '${config.columnName}' is part of any constraints`,
      `Check if column '${config.columnName}' is referenced by foreign keys`,
      `Verify database has sufficient storage space`,
      `Check for active long-running transactions`,
      `Verify table is not currently locked`
    );

    if (config.validateDataCompatibility) {
      checks.push(
        `Validate data compatibility between current and new column types`,
        `Check for potential data truncation or loss`,
        `Verify all existing values can be converted to new type`
      );
    }

    if (config.createBackup) {
      checks.push(
        `Verify permissions to create backup table`,
        `Check available disk space for backup`
      );
    }
  }

  /**
   * Check data type compatibility
   */
  private checkDataTypeCompatibility(config: ModifyColumnPatternConfig): DataTypeCompatibility {
    const result: DataTypeCompatibility = {
      isCompatible: true,
      riskLevel: 'LOW',
      potentialDataLoss: false,
      issues: [],
      recommendations: []
    };

    const newType = config.newColumnType.toLowerCase();

    // Check for potentially problematic conversions
    if (newType.includes('varchar') && newType.includes('(')) {
      const lengthMatch = newType.match(/varchar\((\d+)\)/);
      if (lengthMatch) {
        const newLength = parseInt(lengthMatch[1]);
        if (newLength < 255) { // Arbitrary threshold
          result.issues.push(`Reducing VARCHAR length to ${newLength} may cause data truncation`);
          result.potentialDataLoss = true;
          result.riskLevel = 'HIGH';
        }
      }
    }

    // Check for type category changes
    const typeConversions = [
      { from: ['text', 'varchar', 'char'], to: ['int', 'bigint', 'decimal', 'numeric'], risk: 'CRITICAL' as const },
      { from: ['int', 'bigint'], to: ['varchar', 'text'], risk: 'MEDIUM' as const },
      { from: ['decimal', 'numeric'], to: ['int', 'bigint'], risk: 'HIGH' as const },
      { from: ['timestamp', 'datetime'], to: ['date'], risk: 'HIGH' as const },
      { from: ['json', 'jsonb'], to: ['text', 'varchar'], risk: 'MEDIUM' as const }
    ];

    for (const conversion of typeConversions) {
      if (conversion.to.some(type => newType.includes(type))) {
        result.issues.push(`Converting to ${config.newColumnType} may require data validation`);
        result.riskLevel = conversion.risk;
        
        if (conversion.risk === 'CRITICAL' || conversion.risk === 'HIGH') {
          result.potentialDataLoss = true;
          result.isCompatible = false;
        }
      }
    }

    // Check for nullable changes
    if (config.newNullable === false) {
      result.issues.push('Making column NOT NULL may fail if existing NULL values exist');
      result.riskLevel = 'HIGH';
    }

    // Add recommendations based on issues
    if (result.potentialDataLoss) {
      result.recommendations.push(
        'Create a backup before proceeding',
        'Test the conversion on a copy of the data first',
        'Consider using a temporary column approach'
      );
    }

    if (result.riskLevel === 'CRITICAL') {
      result.recommendations.push(
        'Manual data validation required before conversion',
        'Consider data migration script instead of direct type change'
      );
    }

    return result;
  }

  /**
   * Generate steps with backup creation (safest approach)
   */
  private generateBackupAndModifySteps(
    config: ModifyColumnPatternConfig,
    steps: SafeModifyStep[],
    rollbackSteps: SafeModifyStep[],
    warnings: string[]
  ): void {
    const backupTableName = `${config.tableName}_backup_${Date.now()}`;

    warnings.push(
      'Creating backup table before modifying column',
      `Backup will be stored in table: ${backupTableName}`,
      'This operation will require additional storage space'
    );

    // Step 1: Create backup table
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

    // Step 2: Validate data compatibility
    if (config.validateDataCompatibility) {
      steps.push({
        id: 'validate-data-compatibility',
        description: `Validate existing data compatibility with new type ${config.newColumnType}`,
        sql: `-- Data validation queries will be generated based on type conversion`,
        estimatedDurationMs: 3000,
        canRollback: false,
        requiresMaintenanceWindow: false,
        isDestructive: false,
        validationQuery: `SELECT COUNT(*) FROM ${config.tableName} WHERE ${config.columnName} IS NOT NULL;`,
        expectedResult: 'validation_passed'
      });
    }

    // Step 3: Modify the column
    steps.push({
      id: 'modify-column',
      description: `Modify column ${config.columnName} to type ${config.newColumnType}`,
      sql: this.generateModifyColumnSql(config),
      estimatedDurationMs: 15000,
      canRollback: false, // Column modification is not easily reversible
      requiresMaintenanceWindow: true,
      isDestructive: true,
      validationQuery: `SELECT data_type FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      expectedResult: config.newColumnType.toUpperCase()
    });

    // Add rollback from backup (complex operation)
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
   * Generate steps for direct modification (higher risk)
   */
  private generateDirectModifySteps(
    config: ModifyColumnPatternConfig,
    steps: SafeModifyStep[],
    rollbackSteps: SafeModifyStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'Performing direct column modification without backup',
      'This operation cannot be easily rolled back',
      'Ensure data compatibility has been verified'
    );

    // Step 1: Validate data compatibility (if requested)
    if (config.validateDataCompatibility) {
      steps.push({
        id: 'validate-data-compatibility',
        description: `Validate existing data compatibility with new type ${config.newColumnType}`,
        sql: `-- Data validation queries will be generated based on type conversion`,
        estimatedDurationMs: 3000,
        canRollback: false,
        requiresMaintenanceWindow: false,
        isDestructive: false,
        validationQuery: `SELECT COUNT(*) FROM ${config.tableName} WHERE ${config.columnName} IS NOT NULL;`,
        expectedResult: 'validation_passed'
      });
    }

    // Step 2: Modify the column
    steps.push({
      id: 'modify-column',
      description: `Modify column ${config.columnName} to type ${config.newColumnType}`,
      sql: this.generateModifyColumnSql(config),
      estimatedDurationMs: 15000,
      canRollback: false, // Column modification is not easily reversible
      requiresMaintenanceWindow: true,
      isDestructive: true,
      validationQuery: `SELECT data_type FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      expectedResult: config.newColumnType.toUpperCase()
    });

    // No easy rollback for direct modification
    rollbackSteps.push({
      id: 'no-rollback-available',
      description: 'No automatic rollback available for column type modification',
      sql: '-- NO ROLLBACK: Column type changed and cannot be automatically reverted',
      estimatedDurationMs: 0,
      canRollback: false,
      requiresMaintenanceWindow: false,
      isDestructive: false
    });
  }

  /**
   * Generate blocked steps for critical risk operations
   */
  private generateBlockedSteps(
    config: ModifyColumnPatternConfig,
    steps: SafeModifyStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'Operation blocked due to critical risk level',
      'Potential data loss detected without backup',
      'Create backup or validate data compatibility before proceeding'
    );

    steps.push({
      id: 'blocked-operation',
      description: 'Operation blocked - critical risk detected',
      sql: '-- BLOCKED: Enable backup creation or fix compatibility issues to proceed',
      estimatedDurationMs: 0,
      canRollback: false,
      requiresMaintenanceWindow: false,
      isDestructive: false
    });
  }

  /**
   * Generate database-specific MODIFY COLUMN SQL
   */
  private generateModifyColumnSql(config: ModifyColumnPatternConfig): string {
    let sql = `ALTER TABLE ${config.tableName} MODIFY COLUMN ${config.columnName} ${config.newColumnType}`;

    // Add nullable constraint
    if (config.newNullable !== undefined) {
      sql += config.newNullable ? '' : ' NOT NULL';
    }

    // Add default value
    if (config.newDefaultValue !== undefined) {
      const defaultValue = typeof config.newDefaultValue === 'string' 
        ? `'${config.newDefaultValue}'` 
        : config.newDefaultValue;
      sql += ` DEFAULT ${defaultValue}`;
    }

    return sql + ';';
  }

  /**
   * Generate database-specific MODIFY COLUMN SQL for different databases
   */
  public generateDatabaseSpecificSql(
    config: ModifyColumnPatternConfig,
    database: 'postgresql' | 'mysql' | 'sqlite'
  ): string {
    switch (database) {
      case 'postgresql':
        // PostgreSQL requires separate ALTER statements for different changes
        const statements: string[] = [];
        statements.push(`ALTER TABLE ${config.tableName} ALTER COLUMN ${config.columnName} TYPE ${config.newColumnType};`);
        
        if (config.newNullable !== undefined) {
          statements.push(`ALTER TABLE ${config.tableName} ALTER COLUMN ${config.columnName} ${config.newNullable ? 'DROP NOT NULL' : 'SET NOT NULL'};`);
        }
        
        if (config.newDefaultValue !== undefined) {
          const defaultValue = typeof config.newDefaultValue === 'string' 
            ? `'${config.newDefaultValue}'` 
            : config.newDefaultValue;
          statements.push(`ALTER TABLE ${config.tableName} ALTER COLUMN ${config.columnName} SET DEFAULT ${defaultValue};`);
        }
        
        return statements.join('\n');

      case 'mysql':
        return this.generateModifyColumnSql(config);

      case 'sqlite':
        return '-- SQLite requires table recreation for column modification - use backup/restore approach';

      default:
        throw new Error(`Unsupported database: ${database}`);
    }
  }

  /**
   * Generate data validation queries
   */
  public generateDataValidationQueries(config: ModifyColumnPatternConfig): string[] {
    const queries: string[] = [];
    const newType = config.newColumnType.toLowerCase();

    // Check for NULL values if making column NOT NULL
    if (config.newNullable === false) {
      queries.push(`SELECT COUNT(*) as null_count FROM ${config.tableName} WHERE ${config.columnName} IS NULL;`);
    }

    // Check for data truncation in VARCHAR fields
    if (newType.includes('varchar')) {
      const lengthMatch = newType.match(/varchar\((\d+)\)/);
      if (lengthMatch) {
        const maxLength = lengthMatch[1];
        queries.push(`SELECT COUNT(*) as oversized_values FROM ${config.tableName} WHERE LENGTH(${config.columnName}) > ${maxLength};`);
      }
    }

    // Check for numeric conversion issues
    if (newType.includes('int') || newType.includes('decimal') || newType.includes('numeric')) {
      queries.push(`SELECT COUNT(*) as non_numeric FROM ${config.tableName} WHERE ${config.columnName} IS NOT NULL AND ${config.columnName} NOT REGEXP '^[0-9.-]+$';`);
    }

    // Check for date/timestamp conversion issues
    if (newType.includes('date') || newType.includes('timestamp')) {
      queries.push(`SELECT COUNT(*) as invalid_dates FROM ${config.tableName} WHERE ${config.columnName} IS NOT NULL AND STR_TO_DATE(${config.columnName}, '%Y-%m-%d') IS NULL;`);
    }

    return queries;
  }

  /**
   * Generate performance impact estimation
   */
  public estimatePerformanceImpact(config: ModifyColumnPatternConfig, tableRowCount: number): {
    estimatedDurationMs: number;
    memoryUsageMB: number;
    diskSpaceRequiredMB: number;
    recommendedMaintenanceWindow: boolean;
  } {
    const baseTime = 10000; // 10 second base time for column modification
    const rowProcessingTime = tableRowCount * 0.5; // 0.5ms per row for type conversion
    const backupTime = config.createBackup ? tableRowCount * 0.2 : 0; // 0.2ms per row for backup
    const validationTime = config.validateDataCompatibility ? tableRowCount * 0.1 : 0; // 0.1ms per row for validation
    
    const estimatedDurationMs = baseTime + rowProcessingTime + backupTime + validationTime;
    const memoryUsageMB = Math.max(20, tableRowCount * 0.002); // Minimum 20MB, more for type conversion
    const diskSpaceRequiredMB = config.createBackup ? (tableRowCount * 200) / (1024 * 1024) : 0; // Full table backup
    const recommendedMaintenanceWindow = true; // Column modification always requires maintenance window

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
  public validateConfig(config: ModifyColumnPatternConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.tableName) {
      errors.push('Table name is required');
    }

    if (!config.columnName) {
      errors.push('Column name is required');
    }

    if (!config.newColumnType) {
      errors.push('New column type is required');
    }

    // Validate column type format
    const validTypes = ['VARCHAR', 'TEXT', 'INT', 'BIGINT', 'DECIMAL', 'NUMERIC', 'DATE', 'TIMESTAMP', 'BOOLEAN', 'JSON'];
    const hasValidType = validTypes.some(type => config.newColumnType.toUpperCase().includes(type));
    
    if (!hasValidType) {
      errors.push('Invalid column type specified');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
} 