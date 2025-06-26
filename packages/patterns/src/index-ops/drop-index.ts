// Define types locally to avoid cross-package dependencies in patterns

/**
 * Configuration for dropping indexes safely
 */
export interface DropIndexPatternConfig {
  tableName: string;
  indexName: string;
  databaseType: 'postgresql' | 'mysql' | 'sqlite';
  createBackup?: boolean;
  validateBeforeDrop?: boolean;
  checkQueryPerformance?: boolean;
  timeoutMs?: number;
  maxRetries?: number;
  cascadeOptions?: boolean; // For constraint-dependent indexes
}

/**
 * Safe index drop pattern result
 */
export interface DropIndexPatternResult {
  steps: SafeDropIndexStep[];
  estimatedDurationMs: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rollbackSteps: SafeDropIndexStep[];
  preflightChecks: string[];
  warnings: string[];
  backupStatements?: string[];
  performanceImpactQueries?: string[];
}

/**
 * Individual step in safe index drop
 */
export interface SafeDropIndexStep {
  id: string;
  description: string;
  sql: string;
  estimatedDurationMs: number;
  canRollback: boolean;
  requiresMaintenanceWindow: boolean;
  validationQuery?: string;
  expectedResult?: any;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  databaseSpecific?: string[];
}

/**
 * Safe Index Drop Pattern
 * Implements database-specific index dropping strategies with safety measures
 */
export class DropIndexPattern {
  /**
   * Generate safe index drop steps
   */
  public generateSafeSteps(config: DropIndexPatternConfig): DropIndexPatternResult {
    const steps: SafeDropIndexStep[] = [];
    const rollbackSteps: SafeDropIndexStep[] = [];
    const preflightChecks: string[] = [];
    const warnings: string[] = [];
    const backupStatements: string[] = [];
    const performanceImpactQueries: string[] = [];

    // Assess risk level
    const riskLevel = this.assessRiskLevel(config);

    // Add preflight checks
    this.addPreflightChecks(config, preflightChecks);

    // Generate performance impact queries if requested
    if (config.checkQueryPerformance) {
      this.generatePerformanceImpactQueries(config, performanceImpactQueries);
    }

    // Generate backup statements if requested
    if (config.createBackup) {
      this.generateBackupStatements(config, backupStatements);
    }

    // Generate database-specific steps
    this.generateDatabaseSpecificSteps(config, steps, rollbackSteps, warnings);

    const estimatedDurationMs = steps.reduce((total, step) => total + step.estimatedDurationMs, 0);

    return {
      steps,
      estimatedDurationMs,
      riskLevel,
      rollbackSteps: rollbackSteps.reverse(),
      preflightChecks,
      warnings,
      backupStatements: backupStatements.length > 0 ? backupStatements : undefined,
      performanceImpactQueries: performanceImpactQueries.length > 0 ? performanceImpactQueries : undefined
    };
  }

  /**
   * Assess risk level for index drop
   */
  private assessRiskLevel(config: DropIndexPatternConfig): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    // Primary keys and unique constraints are critical
    if (config.indexName.toLowerCase().includes('primary') || 
        config.indexName.toLowerCase().includes('pk_')) {
      return 'CRITICAL';
    }
    
    // Unique indexes are high risk
    if (config.indexName.toLowerCase().includes('unique') || 
        config.indexName.toLowerCase().includes('uq_')) {
      return 'HIGH';
    }

    // Foreign key indexes are medium risk
    if (config.indexName.toLowerCase().includes('foreign') || 
        config.indexName.toLowerCase().includes('fk_')) {
      return 'MEDIUM';
    }

    // Regular indexes are generally low risk to drop
    return 'LOW';
  }

  /**
   * Add preflight checks for index drop
   */
  private addPreflightChecks(
    config: DropIndexPatternConfig,
    checks: string[]
  ): void {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Verify index '${config.indexName}' exists on table`,
      `Check if index is referenced by constraints`,
      `Identify queries that currently use this index`,
      `Check for foreign key dependencies on this index`,
      `Verify no long-running transactions are using the index`
    );

    if (config.databaseType === 'postgresql') {
      checks.push(
        `Check if index is used for constraint enforcement`,
        `Verify no concurrent index operations are running`,
        `Check index usage statistics from pg_stat_user_indexes`
      );
    }

    if (config.databaseType === 'mysql') {
      checks.push(
        `Check if index is part of a composite foreign key`,
        `Verify storage engine supports index dropping: ${config.cascadeOptions ? 'with cascade' : 'without cascade'}`,
        `Check information_schema.statistics for index usage`
      );
    }

    if (config.checkQueryPerformance) {
      checks.push(
        `Analyze query performance impact of index removal`,
        `Identify queries that may become slower without this index`,
        `Check execution plans for queries using this index`
      );
    }

    if (config.createBackup) {
      checks.push(
        `Verify sufficient disk space for index recreation script`,
        `Check permissions for index recreation`
      );
    }
  }

  /**
   * Generate performance impact analysis queries
   */
  private generatePerformanceImpactQueries(
    config: DropIndexPatternConfig,
    queries: string[]
  ): void {
    switch (config.databaseType) {
      case 'postgresql':
        queries.push(
          `SELECT schemaname, tablename, attname, n_distinct, correlation 
           FROM pg_stats 
           WHERE tablename = '${config.tableName}'`,
          `SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch 
           FROM pg_stat_user_indexes 
           WHERE indexrelname = '${config.indexName}'`,
          `SELECT query, calls, mean_time, total_time 
           FROM pg_stat_statements 
           WHERE query ILIKE '%${config.tableName}%'`
        );
        break;
      case 'mysql':
        queries.push(
          `SELECT INDEX_NAME, CARDINALITY, SUB_PART, PACKED, NULLABLE, INDEX_TYPE, COMMENT, INDEX_COMMENT 
           FROM information_schema.STATISTICS 
           WHERE TABLE_NAME = '${config.tableName}' AND INDEX_NAME = '${config.indexName}'`,
          `SHOW INDEX FROM ${config.tableName} WHERE Key_name = '${config.indexName}'`
        );
        break;
      case 'sqlite':
        queries.push(
          `PRAGMA index_info('${config.indexName}')`,
          `PRAGMA index_list('${config.tableName}')`,
          `EXPLAIN QUERY PLAN SELECT * FROM ${config.tableName} WHERE /* typical where clause */`
        );
        break;
    }
  }

  /**
   * Generate backup statements for index recreation
   */
  private generateBackupStatements(
    config: DropIndexPatternConfig,
    statements: string[]
  ): void {
    // First, get the index definition
    switch (config.databaseType) {
      case 'postgresql':
        statements.push(
          `-- Backup command to recreate index '${config.indexName}'`,
          `SELECT indexdef FROM pg_indexes WHERE indexname = '${config.indexName}' AND tablename = '${config.tableName}';`,
          `-- Note: Save the returned CREATE INDEX statement for rollback`
        );
        break;
      case 'mysql':
        statements.push(
          `-- Backup command to recreate index '${config.indexName}'`,
          `SHOW CREATE TABLE ${config.tableName};`,
          `-- Note: Extract the index definition from the CREATE TABLE statement for rollback`
        );
        break;
      case 'sqlite':
        statements.push(
          `-- Backup command to recreate index '${config.indexName}'`,
          `SELECT sql FROM sqlite_master WHERE type = 'index' AND name = '${config.indexName}';`,
          `-- Note: Save the returned CREATE INDEX statement for rollback`
        );
        break;
    }
  }

  /**
   * Generate database-specific index drop steps
   */
  private generateDatabaseSpecificSteps(
    config: DropIndexPatternConfig,
    steps: SafeDropIndexStep[],
    rollbackSteps: SafeDropIndexStep[],
    warnings: string[]
  ): void {
    switch (config.databaseType) {
      case 'postgresql':
        this.generatePostgreSQLSteps(config, steps, rollbackSteps, warnings);
        break;
      case 'mysql':
        this.generateMySQLSteps(config, steps, rollbackSteps, warnings);
        break;
      case 'sqlite':
        this.generateSQLiteSteps(config, steps, rollbackSteps, warnings);
        break;
    }
  }

  /**
   * Generate PostgreSQL index drop steps
   */
  private generatePostgreSQLSteps(
    config: DropIndexPatternConfig,
    steps: SafeDropIndexStep[],
    rollbackSteps: SafeDropIndexStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'PostgreSQL index drops are generally safe but immediate',
      'Consider using DROP INDEX CONCURRENTLY for large indexes',
      'Index drop will briefly lock the table',
      'Verify no critical queries depend on this index'
    );

    // Step 1: Get index definition for rollback
    if (config.createBackup) {
      steps.push({
        id: 'backup_index_definition',
        description: `Backup index definition for '${config.indexName}'`,
        sql: `SELECT indexdef FROM pg_indexes WHERE indexname = '${config.indexName}' AND tablename = '${config.tableName}';`,
        estimatedDurationMs: 100,
        canRollback: false,
        requiresMaintenanceWindow: false,
        riskLevel: 'LOW',
        databaseSpecific: ['postgresql']
      });
    }

    // Step 2: Check for constraint dependencies
    steps.push({
      id: 'check_constraint_dependencies',
      description: `Check if index '${config.indexName}' supports constraints`,
      sql: `SELECT constraint_name, constraint_type 
            FROM information_schema.table_constraints tc
            JOIN information_schema.constraint_column_usage ccu USING (constraint_name)
            WHERE tc.table_name = '${config.tableName}' 
            AND ccu.column_name IN (
              SELECT column_name FROM information_schema.key_column_usage 
              WHERE table_name = '${config.tableName}'
            );`,
      estimatedDurationMs: 200,
      canRollback: false,
      requiresMaintenanceWindow: false,
      validationQuery: `SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name = '${config.tableName}'`,
      riskLevel: 'LOW',
      databaseSpecific: ['postgresql']
    });

    // Step 3: Drop the index
    const dropSql = `DROP INDEX${config.cascadeOptions ? ' CASCADE' : ''} IF EXISTS ${config.indexName};`;
    steps.push({
      id: 'drop_index',
      description: `Drop index '${config.indexName}' from table '${config.tableName}'`,
      sql: dropSql,
      estimatedDurationMs: 500,
      canRollback: config.createBackup,
      requiresMaintenanceWindow: false,
      validationQuery: `SELECT COUNT(*) FROM pg_indexes WHERE indexname = '${config.indexName}' AND tablename = '${config.tableName}';`,
      expectedResult: 0,
      riskLevel: config.cascadeOptions ? 'HIGH' : 'MEDIUM',
      databaseSpecific: ['postgresql']
    });

    // Rollback step
    if (config.createBackup) {
      rollbackSteps.push({
        id: 'recreate_index',
        description: `Recreate index '${config.indexName}' using backed up definition`,
        sql: `-- Execute the CREATE INDEX statement from backup`,
        estimatedDurationMs: 2000,
        canRollback: false,
        requiresMaintenanceWindow: true,
        riskLevel: 'MEDIUM',
        databaseSpecific: ['postgresql']
      });
    }
  }

  /**
   * Generate MySQL index drop steps
   */
  private generateMySQLSteps(
    config: DropIndexPatternConfig,
    steps: SafeDropIndexStep[],
    rollbackSteps: SafeDropIndexStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'MySQL index drops may briefly lock the table',
      'Consider maintenance window for large tables',
      'Verify index is not part of foreign key constraint'
    );

    // Step 1: Get index definition for rollback
    if (config.createBackup) {
      steps.push({
        id: 'backup_index_definition',
        description: `Backup index definition for '${config.indexName}'`,
        sql: `SHOW CREATE TABLE ${config.tableName};`,
        estimatedDurationMs: 100,
        canRollback: false,
        requiresMaintenanceWindow: false,
        riskLevel: 'LOW',
        databaseSpecific: ['mysql']
      });
    }

    // Step 2: Check for foreign key dependencies
    steps.push({
      id: 'check_foreign_key_dependencies',
      description: `Check if index '${config.indexName}' is used by foreign keys`,
      sql: `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_NAME = '${config.tableName}' 
            AND REFERENCED_TABLE_NAME IS NOT NULL;`,
      estimatedDurationMs: 200,
      canRollback: false,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW',
      databaseSpecific: ['mysql']
    });

    // Step 3: Drop the index
    const dropSql = `ALTER TABLE ${config.tableName} DROP INDEX ${config.indexName};`;
    steps.push({
      id: 'drop_index',
      description: `Drop index '${config.indexName}' from table '${config.tableName}'`,
      sql: dropSql,
      estimatedDurationMs: 1000,
      canRollback: config.createBackup,
      requiresMaintenanceWindow: true,
      validationQuery: `SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_NAME = '${config.tableName}' AND INDEX_NAME = '${config.indexName}';`,
      expectedResult: 0,
      riskLevel: 'MEDIUM',
      databaseSpecific: ['mysql']
    });

    // Rollback step
    if (config.createBackup) {
      rollbackSteps.push({
        id: 'recreate_index',
        description: `Recreate index '${config.indexName}' using backed up definition`,
        sql: `-- Extract and execute the index definition from SHOW CREATE TABLE backup`,
        estimatedDurationMs: 3000,
        canRollback: false,
        requiresMaintenanceWindow: true,
        riskLevel: 'HIGH',
        databaseSpecific: ['mysql']
      });
    }
  }

  /**
   * Generate SQLite index drop steps
   */
  private generateSQLiteSteps(
    config: DropIndexPatternConfig,
    steps: SafeDropIndexStep[],
    rollbackSteps: SafeDropIndexStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'SQLite index drops are immediate but safe',
      'No table locking occurs during index drop',
      'Consider impact on query performance'
    );

    // Step 1: Get index definition for rollback
    if (config.createBackup) {
      steps.push({
        id: 'backup_index_definition',
        description: `Backup index definition for '${config.indexName}'`,
        sql: `SELECT sql FROM sqlite_master WHERE type = 'index' AND name = '${config.indexName}';`,
        estimatedDurationMs: 50,
        canRollback: false,
        requiresMaintenanceWindow: false,
        riskLevel: 'LOW',
        databaseSpecific: ['sqlite']
      });
    }

    // Step 2: Drop the index
    const dropSql = `DROP INDEX IF EXISTS ${config.indexName};`;
    steps.push({
      id: 'drop_index',
      description: `Drop index '${config.indexName}'`,
      sql: dropSql,
      estimatedDurationMs: 100,
      canRollback: config.createBackup,
      requiresMaintenanceWindow: false,
      validationQuery: `SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = '${config.indexName}';`,
      expectedResult: 0,
      riskLevel: 'LOW',
      databaseSpecific: ['sqlite']
    });

    // Rollback step
    if (config.createBackup) {
      rollbackSteps.push({
        id: 'recreate_index',
        description: `Recreate index '${config.indexName}' using backed up definition`,
        sql: `-- Execute the CREATE INDEX statement from backup`,
        estimatedDurationMs: 500,
        canRollback: false,
        requiresMaintenanceWindow: false,
        riskLevel: 'LOW',
        databaseSpecific: ['sqlite']
      });
    }
  }

  /**
   * Generate validation queries for index drop operation
   */
  public generateValidationQueries(config: DropIndexPatternConfig): string[] {
    const queries: string[] = [];

    switch (config.databaseType) {
      case 'postgresql':
        queries.push(
          `SELECT COUNT(*) FROM pg_indexes WHERE indexname = '${config.indexName}' AND tablename = '${config.tableName}';`,
          `SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes WHERE tablename = '${config.tableName}';`
        );
        break;
      case 'mysql':
        queries.push(
          `SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_NAME = '${config.tableName}' AND INDEX_NAME = '${config.indexName}';`,
          `SHOW INDEX FROM ${config.tableName};`
        );
        break;
      case 'sqlite':
        queries.push(
          `SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = '${config.indexName}';`,
          `PRAGMA index_list('${config.tableName}');`
        );
        break;
    }

    return queries;
  }

  /**
   * Estimate performance impact of index drop
   */
  public estimatePerformanceImpact(
    config: DropIndexPatternConfig,
    tableRowCount: number
  ): {
    estimatedDurationMs: number;
    potentialQuerySlowdown: 'NONE' | 'MINOR' | 'MODERATE' | 'SEVERE';
    affectedQueryTypes: string[];
    recommendedActions: string[];
    riskAssessment: string;
  } {
    let estimatedDurationMs = 100; // Base time for simple index drop
    let potentialQuerySlowdown: 'NONE' | 'MINOR' | 'MODERATE' | 'SEVERE' = 'MINOR';
    const affectedQueryTypes: string[] = [];
    const recommendedActions: string[] = [];

    // Adjust based on database type
    switch (config.databaseType) {
      case 'postgresql':
        estimatedDurationMs = Math.min(500, tableRowCount / 10000 * 100);
        break;
      case 'mysql':
        estimatedDurationMs = Math.min(2000, tableRowCount / 5000 * 100);
        break;
      case 'sqlite':
        estimatedDurationMs = 50;
        break;
    }

    // Assess query performance impact based on index name patterns
    if (config.indexName.toLowerCase().includes('primary') || 
        config.indexName.toLowerCase().includes('pk_')) {
      potentialQuerySlowdown = 'SEVERE';
      affectedQueryTypes.push('Primary key lookups', 'Join operations', 'All queries');
      recommendedActions.push('DO NOT DROP - Primary key indexes are essential');
    } else if (config.indexName.toLowerCase().includes('unique') || 
               config.indexName.toLowerCase().includes('uq_')) {
      potentialQuerySlowdown = 'MODERATE';
      affectedQueryTypes.push('Unique constraint checks', 'Equality searches');
      recommendedActions.push('Verify no unique constraints depend on this index');
    } else if (config.indexName.toLowerCase().includes('foreign') || 
               config.indexName.toLowerCase().includes('fk_')) {
      potentialQuerySlowdown = 'MODERATE';
      affectedQueryTypes.push('Foreign key constraint checks', 'Join operations');
      recommendedActions.push('Check foreign key constraint dependencies');
    } else {
      potentialQuerySlowdown = 'MINOR';
      affectedQueryTypes.push('Range queries', 'Sorting operations', 'Filtered searches');
      recommendedActions.push('Monitor query performance after index drop');
    }

    // Large table considerations
    if (tableRowCount > 1000000) {
      recommendedActions.push('Consider maintenance window for large table');
      if (config.databaseType === 'mysql') {
        estimatedDurationMs *= 2; // MySQL may take longer on large tables
      }
    }

    const riskAssessment = `Risk Level: ${this.assessRiskLevel(config)} - Dropping this index may impact query performance. ${
      potentialQuerySlowdown === 'SEVERE' ? 'CRITICAL: This appears to be a system-critical index.' :
      potentialQuerySlowdown === 'MODERATE' ? 'CAUTION: This index may be important for performance.' :
      'Generally safe to drop with minimal performance impact.'
    }`;

    return {
      estimatedDurationMs,
      potentialQuerySlowdown,
      affectedQueryTypes,
      recommendedActions,
      riskAssessment
    };
  }
}

/**
 * Default export for convenient usage
 */
export default DropIndexPattern;