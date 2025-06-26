// Define types locally to avoid cross-package dependencies in patterns

/**
 * Configuration for creating indexes concurrently
 */
export interface ConcurrentIndexPatternConfig {
  tableName: string;
  indexName?: string;
  columnNames: string[];
  indexType?: 'BTREE' | 'HASH' | 'GIN' | 'GIST' | 'BRIN';
  unique?: boolean;
  partial?: boolean;
  partialCondition?: string;
  databaseType: 'postgresql' | 'mysql' | 'sqlite';
  online?: boolean; // For MySQL online index creation
  storageEngine?: 'InnoDB' | 'MyISAM'; // For MySQL
  batchSize?: number;
  timeoutMs?: number;
  maxRetries?: number;
}

/**
 * Safe concurrent index creation pattern result
 */
export interface ConcurrentIndexPatternResult {
  steps: SafeConcurrentIndexStep[];
  estimatedDurationMs: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rollbackSteps: SafeConcurrentIndexStep[];
  preflightChecks: string[];
  warnings: string[];
  indexSizeEstimateMB?: number;
}

/**
 * Individual step in safe concurrent index creation
 */
export interface SafeConcurrentIndexStep {
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
 * Safe Concurrent Index Creation Pattern
 * Implements database-specific concurrent index creation strategies
 */
export class ConcurrentIndexPattern {
  /**
   * Generate safe concurrent index creation steps
   */
  public generateSafeSteps(config: ConcurrentIndexPatternConfig): ConcurrentIndexPatternResult {
    const steps: SafeConcurrentIndexStep[] = [];
    const rollbackSteps: SafeConcurrentIndexStep[] = [];
    const preflightChecks: string[] = [];
    const warnings: string[] = [];

    // Generate index name if not provided
    const indexName = config.indexName || this.generateIndexName(config);

    // Assess risk level
    const riskLevel = this.assessRiskLevel(config);

    // Add preflight checks
    this.addPreflightChecks(config, indexName, preflightChecks);

    // Generate database-specific steps
    this.generateDatabaseSpecificSteps(config, indexName, steps, rollbackSteps, warnings);

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
   * Generate appropriate index name
   */
  private generateIndexName(config: ConcurrentIndexPatternConfig): string {
    const columnPart = config.columnNames.join('_');
    const uniquePart = config.unique ? 'unique_' : '';
    return `idx_${uniquePart}${config.tableName}_${columnPart}`;
  }

  /**
   * Assess risk level for concurrent index creation
   */
  private assessRiskLevel(config: ConcurrentIndexPatternConfig): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (config.databaseType === 'sqlite') {
      return 'MEDIUM'; // SQLite doesn't support true concurrent index creation
    }
    if (config.columnNames.length > 5) {
      return 'MEDIUM'; // Complex composite indexes
    }
    if (config.indexType === 'GIN' || config.indexType === 'GIST') {
      return 'MEDIUM'; // Specialized index types take longer
    }
    return 'LOW'; // Concurrent index creation is generally low risk
  }

  /**
   * Add preflight checks for concurrent index creation
   */
  private addPreflightChecks(
    config: ConcurrentIndexPatternConfig,
    indexName: string,
    checks: string[]
  ): void {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Check if index '${indexName}' already exists`,
      `Verify all columns exist: ${config.columnNames.join(', ')}`,
      `Check available disk space for index creation`,
      `Verify database has sufficient memory for operation`,
      `Check for long-running transactions that might block index creation`
    );

    if (config.databaseType === 'postgresql') {
      checks.push(
        `Verify PostgreSQL version supports CONCURRENTLY (9.2+)`,
        `Check for conflicting index creation operations`,
        `Verify connection will not timeout during long operation`
      );
    }

    if (config.databaseType === 'mysql') {
      checks.push(
        `Verify MySQL version supports online index creation (5.6+)`,
        `Check storage engine supports online operations: ${config.storageEngine || 'InnoDB'}`,
        `Verify innodb_online_alter_log_max_size is sufficient`
      );
    }

    if (config.partial && config.partialCondition) {
      checks.push(
        `Validate partial index condition: ${config.partialCondition}`,
        `Estimate percentage of rows that will be indexed`
      );
    }

    if (config.unique) {
      checks.push(
        `Check for duplicate values that would prevent unique index creation`,
        `Verify uniqueness constraint is actually needed`
      );
    }
  }

  /**
   * Generate database-specific concurrent index creation steps
   */
  private generateDatabaseSpecificSteps(
    config: ConcurrentIndexPatternConfig,
    indexName: string,
    steps: SafeConcurrentIndexStep[],
    rollbackSteps: SafeConcurrentIndexStep[],
    warnings: string[]
  ): void {
    switch (config.databaseType) {
      case 'postgresql':
        this.generatePostgreSQLSteps(config, indexName, steps, rollbackSteps, warnings);
        break;
      case 'mysql':
        this.generateMySQLSteps(config, indexName, steps, rollbackSteps, warnings);
        break;
      case 'sqlite':
        this.generateSQLiteSteps(config, indexName, steps, rollbackSteps, warnings);
        break;
    }
  }

  /**
   * Generate PostgreSQL concurrent index creation steps
   */
  private generatePostgreSQLSteps(
    config: ConcurrentIndexPatternConfig,
    indexName: string,
    steps: SafeConcurrentIndexStep[],
    rollbackSteps: SafeConcurrentIndexStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'PostgreSQL CONCURRENTLY index creation is safe for production',
      'Operation may take significant time on large tables',
      'Index creation will not block reads or writes',
      'Connection must remain stable throughout the operation'
    );

    // Step 1: Check for existing duplicate or conflicting indexes
    steps.push({
      id: 'check-existing-indexes',
      description: `Check for existing or conflicting indexes on ${config.tableName}`,
      sql: this.generateExistingIndexCheckQuery(config),
      estimatedDurationMs: 3000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW',
      databaseSpecific: ['postgresql']
    });

    // Step 2: Estimate index size and duration
    steps.push({
      id: 'estimate-index-metrics',
      description: 'Estimate index size and creation duration',
      sql: this.generateIndexEstimationQuery(config),
      estimatedDurationMs: 2000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW',
      databaseSpecific: ['postgresql']
    });

    // Step 3: Create the index concurrently
    const createSQL = this.generatePostgreSQLCreateIndexSQL(config, indexName);
    
    steps.push({
      id: 'create-concurrent-index',
      description: `Create index ${indexName} concurrently`,
      sql: createSQL,
      estimatedDurationMs: 60000, // Conservative estimate for large tables
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW',
      validationQuery: this.generateIndexValidationQuery(config.tableName, indexName),
      expectedResult: indexName,
      databaseSpecific: ['postgresql']
    });

    // Step 4: Analyze the new index for optimization
    steps.push({
      id: 'analyze-new-index',
      description: `Analyze newly created index ${indexName}`,
      sql: `ANALYZE ${config.tableName};`,
      estimatedDurationMs: 5000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW',
      databaseSpecific: ['postgresql']
    });

    // Rollback step
    rollbackSteps.push({
      id: 'rollback-concurrent-index',
      description: `Drop index ${indexName} if creation failed`,
      sql: `DROP INDEX CONCURRENTLY IF EXISTS ${indexName};`,
      estimatedDurationMs: 10000,
      canRollback: false,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW',
      databaseSpecific: ['postgresql']
    });
  }

  /**
   * Generate MySQL online index creation steps
   */
  private generateMySQLSteps(
    config: ConcurrentIndexPatternConfig,
    indexName: string,
    steps: SafeConcurrentIndexStep[],
    rollbackSteps: SafeConcurrentIndexStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'MySQL online index creation requires InnoDB storage engine',
      'ALGORITHM=INPLACE and LOCK=NONE for concurrent operation',
      'Operation may require significant temporary disk space',
      'Monitor innodb_online_alter_log_max_size during operation'
    );

    // Step 1: Verify InnoDB storage engine
    steps.push({
      id: 'verify-storage-engine',
      description: `Verify ${config.tableName} uses InnoDB storage engine`,
      sql: this.generateStorageEngineCheckQuery(config),
      estimatedDurationMs: 1000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW',
      databaseSpecific: ['mysql']
    });

    // Step 2: Check available disk space
    steps.push({
      id: 'check-disk-space',
      description: 'Check available disk space for online index creation',
      sql: this.generateDiskSpaceCheckQuery(),
      estimatedDurationMs: 2000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW',
      databaseSpecific: ['mysql']
    });

    // Step 3: Create the index online
    const createSQL = this.generateMySQLCreateIndexSQL(config, indexName);
    
    steps.push({
      id: 'create-online-index',
      description: `Create index ${indexName} online`,
      sql: createSQL,
      estimatedDurationMs: 45000, // MySQL is generally faster than PostgreSQL
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW',
      validationQuery: this.generateIndexValidationQuery(config.tableName, indexName),
      expectedResult: indexName,
      databaseSpecific: ['mysql']
    });

    // Rollback step
    rollbackSteps.push({
      id: 'rollback-online-index',
      description: `Drop index ${indexName} if creation failed`,
      sql: `ALTER TABLE ${config.tableName} DROP INDEX IF EXISTS ${indexName};`,
      estimatedDurationMs: 8000,
      canRollback: false,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW',
      databaseSpecific: ['mysql']
    });
  }

  /**
   * Generate SQLite index creation steps (no true concurrency)
   */
  private generateSQLiteSteps(
    config: ConcurrentIndexPatternConfig,
    indexName: string,
    steps: SafeConcurrentIndexStep[],
    rollbackSteps: SafeConcurrentIndexStep[],
    warnings: string[]
  ): void {
    warnings.push(
      'SQLite does not support true concurrent index creation',
      'Index creation will briefly lock the table',
      'Operation is generally fast on SQLite',
      'Consider creating index during low-traffic periods'
    );

    // Step 1: Create the index (SQLite style)
    const createSQL = this.generateSQLiteCreateIndexSQL(config, indexName);
    
    steps.push({
      id: 'create-index-sqlite',
      description: `Create index ${indexName} on SQLite`,
      sql: createSQL,
      estimatedDurationMs: 15000, // SQLite is generally fast
      canRollback: true,
      requiresMaintenanceWindow: true, // SQLite locks the table
      riskLevel: 'MEDIUM',
      validationQuery: this.generateIndexValidationQuery(config.tableName, indexName),
      expectedResult: indexName,
      databaseSpecific: ['sqlite']
    });

    // Rollback step
    rollbackSteps.push({
      id: 'rollback-sqlite-index',
      description: `Drop index ${indexName} if creation failed`,
      sql: `DROP INDEX IF EXISTS ${indexName};`,
      estimatedDurationMs: 2000,
      canRollback: false,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW',
      databaseSpecific: ['sqlite']
    });
  }

  /**
   * Generate PostgreSQL CREATE INDEX SQL
   */
  private generatePostgreSQLCreateIndexSQL(config: ConcurrentIndexPatternConfig, indexName: string): string {
    const columnList = config.columnNames.join(', ');
    const uniqueClause = config.unique ? 'UNIQUE ' : '';
    const indexTypeClause = config.indexType ? ` USING ${config.indexType}` : '';
    const partialClause = config.partial && config.partialCondition ? ` WHERE ${config.partialCondition}` : '';
    
    return `CREATE ${uniqueClause}INDEX CONCURRENTLY ${indexName} ON ${config.tableName}${indexTypeClause} (${columnList})${partialClause};`;
  }

  /**
   * Generate MySQL CREATE INDEX SQL
   */
  private generateMySQLCreateIndexSQL(config: ConcurrentIndexPatternConfig, indexName: string): string {
    const columnList = config.columnNames.join(', ');
    const uniqueClause = config.unique ? 'UNIQUE ' : '';
    const indexTypeClause = config.indexType && config.indexType !== 'BTREE' ? ` USING ${config.indexType}` : '';
    const algorithm = config.online !== false ? 'ALGORITHM=INPLACE' : 'ALGORITHM=COPY';
    const lock = config.online !== false ? 'LOCK=NONE' : 'LOCK=SHARED';
    
    return `ALTER TABLE ${config.tableName} ADD ${uniqueClause}INDEX ${indexName}${indexTypeClause} (${columnList}), ${algorithm}, ${lock};`;
  }

  /**
   * Generate SQLite CREATE INDEX SQL
   */
  private generateSQLiteCreateIndexSQL(config: ConcurrentIndexPatternConfig, indexName: string): string {
    const columnList = config.columnNames.join(', ');
    const uniqueClause = config.unique ? 'UNIQUE ' : '';
    const partialClause = config.partial && config.partialCondition ? ` WHERE ${config.partialCondition}` : '';
    
    return `CREATE ${uniqueClause}INDEX ${indexName} ON ${config.tableName} (${columnList})${partialClause};`;
  }

  /**
   * Generate existing index check query
   */
  private generateExistingIndexCheckQuery(config: ConcurrentIndexPatternConfig): string {
    return `
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = '${config.tableName}'
        AND indexdef LIKE '%${config.columnNames.join('%')}%';
    `.trim();
  }

  /**
   * Generate index estimation query
   */
  private generateIndexEstimationQuery(config: ConcurrentIndexPatternConfig): string {
    return `
      SELECT 
        schemaname,
        tablename,
        attname,
        n_distinct,
        correlation,
        most_common_vals
      FROM pg_stats
      WHERE tablename = '${config.tableName}'
        AND attname IN ('${config.columnNames.join("', '")}');
    `.trim();
  }

  /**
   * Generate storage engine check query for MySQL
   */
  private generateStorageEngineCheckQuery(config: ConcurrentIndexPatternConfig): string {
    return `
      SELECT 
        table_name,
        engine
      FROM information_schema.tables
      WHERE table_name = '${config.tableName}'
        AND table_schema = DATABASE();
    `.trim();
  }

  /**
   * Generate disk space check query for MySQL
   */
  private generateDiskSpaceCheckQuery(): string {
    return `
      SELECT 
        @@datadir as data_directory,
        ROUND(SUM(data_length + index_length) / 1024 / 1024, 2) as total_size_mb
      FROM information_schema.tables
      WHERE table_schema = DATABASE();
    `.trim();
  }

  /**
   * Generate index validation query
   */
  private generateIndexValidationQuery(tableName: string, indexName: string): string {
    return `
      SELECT 
        indexname
      FROM pg_indexes
      WHERE tablename = '${tableName}'
        AND indexname = '${indexName}';
    `.trim();
  }

  /**
   * Generate validation queries for the index
   */
  public generateValidationQueries(config: ConcurrentIndexPatternConfig): string[] {
    const indexName = config.indexName || this.generateIndexName(config);
    
    const queries = [
      this.generateIndexValidationQuery(config.tableName, indexName),
      `SELECT COUNT(*) FROM ${config.tableName};` // Verify table accessibility
    ];

    if (config.databaseType === 'postgresql') {
      queries.push(`
        SELECT 
          schemaname,
          tablename,
          indexname,
          indexdef
        FROM pg_indexes
        WHERE tablename = '${config.tableName}'
          AND indexname = '${indexName}';
      `);
    }

    return queries;
  }

  /**
   * Estimate performance impact of concurrent index creation
   */
  public estimatePerformanceImpact(
    config: ConcurrentIndexPatternConfig,
    tableRowCount: number
  ): {
    estimatedDurationMs: number;
    memoryUsageMB: number;
    diskSpaceRequiredMB: number;
    recommendedMaintenanceWindow: boolean;
    indexSizeEstimateMB: number;
  } {
    // Base calculation factors
    const rowsPerSecond = config.databaseType === 'postgresql' ? 5000 : 
                         config.databaseType === 'mysql' ? 8000 : 15000; // SQLite is fastest for small tables
    
    // Calculate duration based on table size and index complexity
    const complexityFactor = config.columnNames.length * 1.2;
    const uniqueFactor = config.unique ? 1.3 : 1.0;
    const partialFactor = config.partial ? 0.7 : 1.0;
    
    const baseDuration = (tableRowCount / rowsPerSecond) * 1000;
    const adjustedDuration = baseDuration * complexityFactor * uniqueFactor * partialFactor;
    
    // Memory usage estimation
    const memoryPerRow = 0.002; // 2KB per row for index creation
    const memoryUsageMB = Math.max(100, tableRowCount * memoryPerRow);
    
    // Disk space estimation for index
    const avgRowSize = 50; // bytes per index entry
    const indexSizeEstimateMB = Math.max(5, (tableRowCount * avgRowSize * config.columnNames.length) / (1024 * 1024));
    
    // Additional disk space for temporary operations
    const diskSpaceRequiredMB = indexSizeEstimateMB * (config.databaseType === 'mysql' ? 2.5 : 1.5); // MySQL needs more temp space
    
    // Maintenance window recommendation
    const recommendedMaintenanceWindow = 
      config.databaseType === 'sqlite' || // SQLite always locks
      tableRowCount > 1000000 || // Very large tables
      config.indexType === 'GIN' || config.indexType === 'GIST'; // Complex index types
    
    return {
      estimatedDurationMs: Math.round(adjustedDuration),
      memoryUsageMB: Math.round(memoryUsageMB),
      diskSpaceRequiredMB: Math.round(diskSpaceRequiredMB),
      recommendedMaintenanceWindow,
      indexSizeEstimateMB: Math.round(indexSizeEstimateMB)
    };
  }
}