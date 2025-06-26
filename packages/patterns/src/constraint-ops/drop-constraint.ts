// Define types locally to avoid cross-package dependencies in patterns

/**
 * Configuration for dropping constraints safely
 */
export interface DropConstraintPatternConfig {
  tableName: string;
  constraintName: string;
  constraintType: 'UNIQUE' | 'FOREIGN_KEY' | 'CHECK' | 'PRIMARY_KEY';
  createBackup?: boolean;
  cascadeDelete?: boolean;
  validateImpact?: boolean;
  batchSize?: number;
  timeoutMs?: number;
}

/**
 * Safe constraint drop pattern result
 */
export interface DropConstraintPatternResult {
  steps: SafeDropConstraintStep[];
  estimatedDurationMs: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rollbackSteps: SafeDropConstraintStep[];
  preflightChecks: string[];
  warnings: string[];
  dependentObjects?: string[];
}

/**
 * Individual step in safe constraint drop
 */
export interface SafeDropConstraintStep {
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
 * Safe Drop Constraint Pattern
 * Implements the safest way to drop various constraint types
 */
export class DropConstraintPattern {
  /**
   * Generate safe constraint drop steps
   */
  public generateSafeSteps(config: DropConstraintPatternConfig): DropConstraintPatternResult {
    const steps: SafeDropConstraintStep[] = [];
    const rollbackSteps: SafeDropConstraintStep[] = [];
    const preflightChecks: string[] = [];
    const warnings: string[] = [];

    // Assess risk level
    const riskLevel = this.assessRiskLevel(config);

    // Add preflight checks
    this.addPreflightChecks(config, preflightChecks);

    // Generate steps based on configuration
    this.generateDropSteps(config, steps, rollbackSteps, warnings);

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
   * Assess risk level for constraint drop
   */
  private assessRiskLevel(config: DropConstraintPatternConfig): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (config.constraintType === 'PRIMARY_KEY') {
      return 'CRITICAL'; // Dropping PK is extremely risky
    }
    if (config.constraintType === 'FOREIGN_KEY' && config.cascadeDelete) {
      return 'CRITICAL'; // Cascading FK drops can delete data
    }
    if (config.constraintType === 'FOREIGN_KEY') {
      return 'HIGH'; // FK drops affect referential integrity
    }
    if (config.constraintType === 'UNIQUE') {
      return 'MEDIUM'; // Unique constraint drops allow duplicates
    }
    return 'LOW'; // CHECK constraints are generally safe to drop
  }

  /**
   * Add preflight checks for constraint drop
   */
  private addPreflightChecks(config: DropConstraintPatternConfig, checks: string[]): void {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Verify constraint '${config.constraintName}' exists`,
      `Check constraint type matches expected type: ${config.constraintType}`,
      `Verify table is not currently locked`,
      `Check for active transactions that might be affected`
    );

    if (config.constraintType === 'FOREIGN_KEY') {
      checks.push(
        `Identify dependent foreign key relationships`,
        `Check for potential orphan records after constraint drop`,
        `Verify impact on referential integrity`
      );
    }

    if (config.constraintType === 'PRIMARY_KEY') {
      checks.push(
        `CRITICAL: Identify all foreign keys referencing this primary key`,
        `Check for applications depending on primary key constraint`,
        `Verify no replication or clustering dependencies on primary key`
      );
    }

    if (config.constraintType === 'UNIQUE') {
      checks.push(
        `Check for applications depending on uniqueness guarantee`,
        `Identify indexes that might be dropped with the constraint`
      );
    }

    if (config.validateImpact !== false) {
      checks.push(
        `Analyze potential impact on data integrity`,
        `Check for dependent database objects (views, procedures, etc.)`
      );
    }
  }

  /**
   * Generate constraint drop steps
   */
  private generateDropSteps(
    config: DropConstraintPatternConfig,
    steps: SafeDropConstraintStep[],
    rollbackSteps: SafeDropConstraintStep[],
    warnings: string[]
  ): void {
    // Step 1: Create backup of constraint definition if requested
    if (config.createBackup !== false) {
      steps.push({
        id: 'backup-constraint-definition',
        description: `Backup constraint definition for ${config.constraintName}`,
        sql: this.generateConstraintBackupQuery(config),
        estimatedDurationMs: 3000,
        canRollback: true,
        requiresMaintenanceWindow: false,
        riskLevel: 'LOW'
      });
    }

    // Step 2: Analyze constraint dependencies
    if (config.validateImpact !== false) {
      steps.push({
        id: 'analyze-dependencies',
        description: `Analyze dependencies for constraint ${config.constraintName}`,
        sql: this.generateDependencyAnalysisQuery(config),
        estimatedDurationMs: 5000,
        canRollback: true,
        requiresMaintenanceWindow: false,
        riskLevel: 'LOW'
      });
    }

    // Step 3: Handle constraint-specific preparations
    this.addConstraintSpecificSteps(config, steps, rollbackSteps, warnings);

    // Step 4: Drop the constraint
    const dropSQL = this.generateDropConstraintSQL(config);
    const dropRisk = this.getDropRiskLevel(config);
    
    steps.push({
      id: 'drop-constraint',
      description: `Drop ${config.constraintType} constraint ${config.constraintName}`,
      sql: dropSQL,
      estimatedDurationMs: this.estimateDropDuration(config),
      canRollback: false, // Constraint drops are generally not easily reversible
      requiresMaintenanceWindow: this.requiresMaintenanceWindow(config),
      riskLevel: dropRisk,
      validationQuery: this.generateDropValidationQuery(config),
      expectedResult: 0 // Should return 0 rows if constraint is dropped
    });

    // Add rollback steps (constraint recreation)
    this.addRollbackSteps(config, rollbackSteps);

    // Add warnings based on constraint type
    this.addConstraintSpecificWarnings(config, warnings);
  }

  /**
   * Add constraint-specific preparation steps
   */
  private addConstraintSpecificSteps(
    config: DropConstraintPatternConfig,
    steps: SafeDropConstraintStep[],
    rollbackSteps: SafeDropConstraintStep[],
    warnings: string[]
  ): void {
    switch (config.constraintType) {
      case 'PRIMARY_KEY':
        this.addPrimaryKeyDropSteps(config, steps, rollbackSteps, warnings);
        break;
      case 'FOREIGN_KEY':
        this.addForeignKeyDropSteps(config, steps, rollbackSteps, warnings);
        break;
      case 'UNIQUE':
        this.addUniqueConstraintDropSteps(config, steps, rollbackSteps, warnings);
        break;
      case 'CHECK':
        this.addCheckConstraintDropSteps(config, steps, rollbackSteps, warnings);
        break;
    }
  }

  /**
   * Add primary key specific drop steps
   */
  private addPrimaryKeyDropSteps(
    config: DropConstraintPatternConfig,
    steps: SafeDropConstraintStep[],
    rollbackSteps: SafeDropConstraintStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'CRITICAL: Dropping primary key constraint is extremely dangerous',
      'This will affect all foreign key relationships',
      'Application code may fail without primary key constraint',
      'Consider adding a new primary key before dropping the old one'
    );

    // Check for foreign key dependencies
    steps.push({
      id: 'check-pk-dependencies',
      description: 'Check for foreign key dependencies on primary key',
      sql: this.generatePrimaryKeyDependencyQuery(config),
      estimatedDurationMs: 8000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'HIGH',
      validationQuery: this.generatePrimaryKeyDependencyQuery(config),
      expectedResult: 0 // Should be 0 if no dependencies
    });
  }

  /**
   * Add foreign key specific drop steps
   */
  private addForeignKeyDropSteps(
    config: DropConstraintPatternConfig,
    steps: SafeDropConstraintStep[],
    rollbackSteps: SafeDropConstraintStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'Dropping foreign key constraint removes referential integrity protection',
      'Applications may be able to create orphan records after constraint removal',
      'Consider the impact on data consistency'
    );

    if (config.cascadeDelete) {
      warnings.push(
        'CRITICAL: CASCADE option may delete related data',
        'Ensure you have complete backups before proceeding'
      );
    }

    // Analyze current referential integrity
    steps.push({
      id: 'analyze-referential-integrity',
      description: 'Analyze current referential integrity before FK drop',
      sql: this.generateReferentialIntegrityQuery(config),
      estimatedDurationMs: 12000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'MEDIUM'
    });
  }

  /**
   * Add unique constraint specific drop steps
   */
  private addUniqueConstraintDropSteps(
    config: DropConstraintPatternConfig,
    steps: SafeDropConstraintStep[],
    rollbackSteps: SafeDropConstraintStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'Dropping unique constraint allows duplicate values to be inserted',
      'Applications depending on uniqueness guarantee may fail',
      'Associated unique index may also be dropped'
    );

    // Check for associated indexes
    steps.push({
      id: 'check-associated-indexes',
      description: 'Check for indexes associated with unique constraint',
      sql: this.generateAssociatedIndexQuery(config),
      estimatedDurationMs: 3000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW'
    });
  }

  /**
   * Add check constraint specific drop steps
   */
  private addCheckConstraintDropSteps(
    config: DropConstraintPatternConfig,
    steps: SafeDropConstraintStep[],
    rollbackSteps: SafeDropConstraintStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'Dropping check constraint removes data validation rules',
      'Invalid data may be inserted after constraint removal'
    );

    // Get constraint definition for potential rollback
    steps.push({
      id: 'get-check-definition',
      description: 'Retrieve CHECK constraint definition for rollback',
      sql: this.generateCheckDefinitionQuery(config),
      estimatedDurationMs: 2000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW'
    });
  }

  /**
   * Generate constraint backup query
   */
  private generateConstraintBackupQuery(config: DropConstraintPatternConfig): string {
    return `
      SELECT 
        constraint_name,
        constraint_type,
        table_name,
        column_name,
        referenced_table_name,
        referenced_column_name,
        delete_rule,
        update_rule
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      WHERE tc.table_name = '${config.tableName}'
        AND tc.constraint_name = '${config.constraintName}';
    `.trim();
  }

  /**
   * Generate dependency analysis query
   */
  private generateDependencyAnalysisQuery(config: DropConstraintPatternConfig): string {
    return `
      SELECT 
        'VIEW' as object_type,
        table_name as object_name
      FROM information_schema.views
      WHERE view_definition LIKE '%${config.tableName}%'
      
      UNION ALL
      
      SELECT 
        'TRIGGER' as object_type,
        trigger_name as object_name
      FROM information_schema.triggers
      WHERE event_object_table = '${config.tableName}'
      
      UNION ALL
      
      SELECT 
        'ROUTINE' as object_type,
        routine_name as object_name
      FROM information_schema.routines
      WHERE routine_definition LIKE '%${config.tableName}%';
    `.trim();
  }

  /**
   * Generate drop constraint SQL
   */
  private generateDropConstraintSQL(config: DropConstraintPatternConfig): string {
    let sql = `ALTER TABLE ${config.tableName} DROP CONSTRAINT ${config.constraintName}`;
    
    if (config.cascadeDelete && config.constraintType === 'FOREIGN_KEY') {
      sql += ' CASCADE';
    }
    
    return sql + ';';
  }

  /**
   * Generate primary key dependency query
   */
  private generatePrimaryKeyDependencyQuery(config: DropConstraintPatternConfig): string {
    return `
      SELECT 
        fk.table_name as dependent_table,
        fk.constraint_name as fk_constraint_name,
        fk.column_name as fk_column
      FROM information_schema.key_column_usage fk
      JOIN information_schema.referential_constraints rc
        ON fk.constraint_name = rc.constraint_name
      WHERE rc.referenced_table_name = '${config.tableName}'
        AND fk.referenced_column_name IN (
          SELECT column_name
          FROM information_schema.key_column_usage
          WHERE table_name = '${config.tableName}'
            AND constraint_name = '${config.constraintName}'
        );
    `.trim();
  }

  /**
   * Generate referential integrity query
   */
  private generateReferentialIntegrityQuery(config: DropConstraintPatternConfig): string {
    return `
      SELECT COUNT(*) as potential_orphans
      FROM ${config.tableName} child
      LEFT JOIN information_schema.key_column_usage kcu
        ON kcu.constraint_name = '${config.constraintName}'
      WHERE child.some_column IS NOT NULL; -- This would need to be more specific
    `.trim();
  }

  /**
   * Generate associated index query
   */
  private generateAssociatedIndexQuery(config: DropConstraintPatternConfig): string {
    return `
      SELECT 
        index_name,
        column_name,
        non_unique
      FROM information_schema.statistics
      WHERE table_name = '${config.tableName}'
        AND index_name LIKE '%${config.constraintName}%';
    `.trim();
  }

  /**
   * Generate check definition query
   */
  private generateCheckDefinitionQuery(config: DropConstraintPatternConfig): string {
    return `
      SELECT check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name = '${config.constraintName}';
    `.trim();
  }

  /**
   * Generate drop validation query
   */
  private generateDropValidationQuery(config: DropConstraintPatternConfig): string {
    return `
      SELECT COUNT(*) as constraint_exists
      FROM information_schema.table_constraints
      WHERE table_name = '${config.tableName}'
        AND constraint_name = '${config.constraintName}';
    `.trim();
  }

  /**
   * Get drop risk level
   */
  private getDropRiskLevel(config: DropConstraintPatternConfig): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    return this.assessRiskLevel(config);
  }

  /**
   * Estimate drop duration
   */
  private estimateDropDuration(config: DropConstraintPatternConfig): number {
    switch (config.constraintType) {
      case 'PRIMARY_KEY':
        return 10000; // PK drops are complex
      case 'FOREIGN_KEY':
        return 5000; // FK drops require integrity checks
      case 'UNIQUE':
        return 3000; // May need to drop associated index
      case 'CHECK':
        return 2000; // Simple constraint drops
      default:
        return 3000;
    }
  }

  /**
   * Check if maintenance window is required
   */
  private requiresMaintenanceWindow(config: DropConstraintPatternConfig): boolean {
    return config.constraintType === 'PRIMARY_KEY' || 
           (config.constraintType === 'FOREIGN_KEY' && config.cascadeDelete === true);
  }

  /**
   * Add rollback steps for constraint recreation
   */
  private addRollbackSteps(config: DropConstraintPatternConfig, rollbackSteps: SafeDropConstraintStep[]): void {
    rollbackSteps.push({
      id: 'rollback-constraint-drop',
      description: `Recreate ${config.constraintType} constraint ${config.constraintName}`,
      sql: `-- Rollback requires manual intervention with backed up constraint definition`,
      estimatedDurationMs: 5000,
      canRollback: false,
      requiresMaintenanceWindow: true,
      riskLevel: 'HIGH'
    });
  }

  /**
   * Add constraint-specific warnings
   */
  private addConstraintSpecificWarnings(config: DropConstraintPatternConfig, warnings: string[]): void {
    warnings.push(
      `Constraint drop cannot be easily rolled back`,
      `Ensure you have backed up the constraint definition`,
      `Consider the impact on application functionality`
    );

    if (config.constraintType === 'PRIMARY_KEY') {
      warnings.push(
        'Primary key drop will affect table replication',
        'Some database tools may not work without primary key'
      );
    }
  }

  /**
   * Generate validation queries for the constraint drop
   */
  public generateValidationQueries(config: DropConstraintPatternConfig): string[] {
    return [
      this.generateDropValidationQuery(config),
      `SELECT COUNT(*) FROM ${config.tableName};`, // Verify no data loss
      this.generateConstraintBackupQuery(config)
    ];
  }

  /**
   * Estimate performance impact of constraint drop
   */
  public estimatePerformanceImpact(
    config: DropConstraintPatternConfig,
    tableRowCount: number
  ): {
    estimatedDurationMs: number;
    memoryUsageMB: number;
    diskSpaceRequiredMB: number;
    recommendedMaintenanceWindow: boolean;
  } {
    // Base calculation factors
    const baseDropDuration = this.estimateDropDuration(config);
    const memoryUsageMB = Math.max(10, tableRowCount * 0.0005); // Minimal memory for drops
    
    // Disk space is minimal for constraint drops (just for backups)
    const diskSpaceRequiredMB = 5; // Minimal space for constraint metadata backup
    
    // Maintenance window recommendation
    const recommendedMaintenanceWindow = this.requiresMaintenanceWindow(config);
    
    return {
      estimatedDurationMs: baseDropDuration,
      memoryUsageMB: Math.round(memoryUsageMB),
      diskSpaceRequiredMB,
      recommendedMaintenanceWindow
    };
  }
}