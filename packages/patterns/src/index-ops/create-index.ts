// Define types locally to avoid cross-package dependencies in patterns

/**
 * Configuration for creating indexes
 */
export interface CreateIndexPatternConfig {
  tableName: string;
  indexName?: string;
  columnNames: string[];
  indexType?: 'BTREE' | 'HASH' | 'GIN' | 'GIST' | 'BRIN';
  unique?: boolean;
  partial?: boolean;
  partialCondition?: string;
  databaseType: 'postgresql' | 'mysql' | 'sqlite';
  storageParameters?: Record<string, string>;
  checkRedundancy?: boolean;
  includeColumns?: string[]; // Covering index columns
  batchSize?: number;
  timeoutMs?: number;
}

/**
 * Safe index creation pattern result
 */
export interface CreateIndexPatternResult {
  steps: SafeCreateIndexStep[];
  estimatedDurationMs: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  rollbackSteps: SafeCreateIndexStep[];
  preflightChecks: string[];
  warnings: string[];
  redundantIndexes?: RedundantIndexInfo[];
  optimizationSuggestions?: string[];
}

/**
 * Individual step in safe index creation
 */
export interface SafeCreateIndexStep {
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
 * Information about redundant indexes
 */
export interface RedundantIndexInfo {
  existingIndexName: string;
  existingColumns: string[];
  redundancyType: 'duplicate' | 'subset' | 'superset' | 'overlapping';
  recommendation: string;
}

/**
 * Safe Index Creation Pattern
 * Implements comprehensive index creation with redundancy detection and optimization
 */
export class CreateIndexPattern {
  /**
   * Generate safe index creation steps
   */
  public generateSafeSteps(config: CreateIndexPatternConfig): CreateIndexPatternResult {
    const steps: SafeCreateIndexStep[] = [];
    const rollbackSteps: SafeCreateIndexStep[] = [];
    const preflightChecks: string[] = [];
    const warnings: string[] = [];
    const redundantIndexes: RedundantIndexInfo[] = [];
    const optimizationSuggestions: string[] = [];

    // Generate index name if not provided
    const indexName = config.indexName || this.generateIndexName(config);

    // Assess risk level
    const riskLevel = this.assessRiskLevel(config);

    // Add preflight checks
    this.addPreflightChecks(config, indexName, preflightChecks);

    // Generate index creation steps
    this.generateIndexCreationSteps(config, indexName, steps, rollbackSteps, warnings);

    // Analyze redundancy if requested
    if (config.checkRedundancy !== false) {
      this.generateRedundancyAnalysisSteps(config, steps, redundantIndexes, optimizationSuggestions);
    }

    const estimatedDurationMs = steps.reduce((total, step) => total + step.estimatedDurationMs, 0);

    return {
      steps,
      estimatedDurationMs,
      riskLevel,
      rollbackSteps: rollbackSteps.reverse(),
      preflightChecks,
      warnings,
      redundantIndexes,
      optimizationSuggestions
    };
  }

  /**
   * Generate appropriate index name
   */
  private generateIndexName(config: CreateIndexPatternConfig): string {
    const columnPart = config.columnNames.join('_');
    const uniquePart = config.unique ? 'unique_' : '';
    const typePart = config.indexType && config.indexType !== 'BTREE' ? `_${config.indexType.toLowerCase()}` : '';
    return `idx_${uniquePart}${config.tableName}_${columnPart}${typePart}`;
  }

  /**
   * Assess risk level for index creation
   */
  private assessRiskLevel(config: CreateIndexPatternConfig): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (config.columnNames.length > 6) {
      return 'HIGH'; // Very complex composite indexes
    }
    if (config.indexType === 'GIN' || config.indexType === 'GIST') {
      return 'MEDIUM'; // Specialized index types
    }
    if (config.unique && !config.partial) {
      return 'MEDIUM'; // Unique indexes can fail on duplicates
    }
    return 'LOW'; // Regular index creation is generally safe
  }

  /**
   * Add preflight checks for index creation
   */
  private addPreflightChecks(
    config: CreateIndexPatternConfig,
    indexName: string,
    checks: string[]
  ): void {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Check if index '${indexName}' already exists`,
      `Verify all columns exist: ${config.columnNames.join(', ')}`,
      `Check available disk space for index creation`,
      `Verify database has sufficient memory for operation`,
      `Estimate index size and creation time`
    );

    if (config.includeColumns && config.includeColumns.length > 0) {
      checks.push(
        `Verify include columns exist: ${config.includeColumns.join(', ')}`,
        `Check that include columns are not part of key columns`
      );
    }

    if (config.partial && config.partialCondition) {
      checks.push(
        `Validate partial index condition: ${config.partialCondition}`,
        `Estimate selectivity of partial condition`,
        `Verify partial condition will benefit query performance`
      );
    }

    if (config.unique) {
      checks.push(
        `Check for duplicate values that would prevent unique index creation`,
        `Verify uniqueness constraint is beneficial for data integrity`
      );
    }

    if (config.checkRedundancy !== false) {
      checks.push(
        `Analyze existing indexes for redundancy`,
        `Check for indexes that could be combined or replaced`
      );
    }
  }

  /**
   * Generate index creation steps
   */
  private generateIndexCreationSteps(
    config: CreateIndexPatternConfig,
    indexName: string,
    steps: SafeCreateIndexStep[],
    rollbackSteps: SafeCreateIndexStep[],
    warnings: string[]
  ): void {
    // Step 1: Estimate index size and impact
    steps.push({
      id: 'estimate-index-impact',
      description: `Estimate size and performance impact of index ${indexName}`,
      sql: this.generateIndexEstimationQuery(config),
      estimatedDurationMs: 5000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW'
    });

    // Step 2: Check for existing similar indexes
    steps.push({
      id: 'analyze-existing-indexes',
      description: `Analyze existing indexes on table ${config.tableName}`,
      sql: this.generateExistingIndexAnalysisQuery(config),
      estimatedDurationMs: 3000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW'
    });

    // Step 3: Create the index
    const createSQL = this.generateCreateIndexSQL(config, indexName);
    const estimatedDuration = this.estimateIndexCreationDuration(config);
    
    steps.push({
      id: 'create-index',
      description: `Create index ${indexName} on table ${config.tableName}`,
      sql: createSQL,
      estimatedDurationMs: estimatedDuration,
      canRollback: true,
      requiresMaintenanceWindow: this.requiresMaintenanceWindow(config),
      riskLevel: config.unique ? 'MEDIUM' : 'LOW',
      validationQuery: this.generateIndexValidationQuery(config.tableName, indexName),
      expectedResult: indexName
    });

    // Step 4: Update table statistics after index creation
    if (config.databaseType === 'postgresql') {
      steps.push({
        id: 'update-statistics',
        description: `Update table statistics for ${config.tableName}`,
        sql: `ANALYZE ${config.tableName};`,
        estimatedDurationMs: 3000,
        canRollback: true,
        requiresMaintenanceWindow: false,
        riskLevel: 'LOW'
      });
    }

    // Rollback step
    rollbackSteps.push({
      id: 'rollback-index-creation',
      description: `Drop index ${indexName} if creation failed`,
      sql: this.generateDropIndexSQL(config, indexName),
      estimatedDurationMs: 5000,
      canRollback: false,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW'
    });

    // Add warnings
    this.addIndexSpecificWarnings(config, warnings);
  }

  /**
   * Generate redundancy analysis steps
   */
  private generateRedundancyAnalysisSteps(
    config: CreateIndexPatternConfig,
    steps: SafeCreateIndexStep[],
    redundantIndexes: RedundantIndexInfo[],
    optimizationSuggestions: string[]
  ): void {
    steps.push({
      id: 'redundancy-analysis',
      description: `Analyze index redundancy for table ${config.tableName}`,
      sql: this.generateRedundancyAnalysisQuery(config),
      estimatedDurationMs: 8000,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: 'LOW'
    });

    // Add optimization suggestions
    optimizationSuggestions.push(
      'Consider combining similar indexes for better performance',
      'Remove unused indexes to improve write performance',
      'Use partial indexes for frequently queried subsets',
      'Consider covering indexes for query optimization'
    );
  }

  /**
   * Generate CREATE INDEX SQL
   */
  private generateCreateIndexSQL(config: CreateIndexPatternConfig, indexName: string): string {
    const columnList = config.columnNames.join(', ');
    const uniqueClause = config.unique ? 'UNIQUE ' : '';
    const indexTypeClause = this.getIndexTypeClause(config);
    const includeClause = this.getIncludeClause(config);
    const partialClause = config.partial && config.partialCondition ? ` WHERE ${config.partialCondition}` : '';
    const storageClause = this.getStorageClause(config);

    return `CREATE ${uniqueClause}INDEX ${indexName} ON ${config.tableName}${indexTypeClause} (${columnList})${includeClause}${partialClause}${storageClause};`;
  }

  /**
   * Get index type clause based on database
   */
  private getIndexTypeClause(config: CreateIndexPatternConfig): string {
    if (!config.indexType || config.indexType === 'BTREE') {
      return '';
    }

    switch (config.databaseType) {
      case 'postgresql':
        return ` USING ${config.indexType}`;
      case 'mysql':
        return config.indexType === 'HASH' ? ' USING HASH' : '';
      case 'sqlite':
        return ''; // SQLite only supports BTREE-style indexes
      default:
        return '';
    }
  }

  /**
   * Get include clause for covering indexes
   */
  private getIncludeClause(config: CreateIndexPatternConfig): string {
    if (!config.includeColumns || config.includeColumns.length === 0) {
      return '';
    }

    if (config.databaseType === 'postgresql') {
      return ` INCLUDE (${config.includeColumns.join(', ')})`;
    }

    // MySQL and SQLite don't support INCLUDE clause
    return '';
  }

  /**
   * Get storage parameters clause
   */
  private getStorageClause(config: CreateIndexPatternConfig): string {
    if (!config.storageParameters || Object.keys(config.storageParameters).length === 0) {
      return '';
    }

    if (config.databaseType === 'postgresql') {
      const params = Object.entries(config.storageParameters)
        .map(([key, value]) => `${key} = ${value}`)
        .join(', ');
      return ` WITH (${params})`;
    }

    return '';
  }

  /**
   * Generate index estimation query
   */
  private generateIndexEstimationQuery(config: CreateIndexPatternConfig): string {
    switch (config.databaseType) {
      case 'postgresql':
        return `
          SELECT 
            schemaname,
            tablename,
            attname,
            n_distinct,
            correlation,
            avg_width,
            null_frac
          FROM pg_stats
          WHERE tablename = '${config.tableName}'
            AND attname IN ('${config.columnNames.join("', '")}');
        `.trim();
      case 'mysql':
        return `
          SELECT 
            column_name,
            cardinality,
            data_type,
            character_maximum_length
          FROM information_schema.statistics s
          JOIN information_schema.columns c USING (table_name, column_name)
          WHERE s.table_name = '${config.tableName}'
            AND s.column_name IN ('${config.columnNames.join("', '")}');
        `.trim();
      case 'sqlite':
        return `
          SELECT 
            name,
            type,
            pk
          FROM pragma_table_info('${config.tableName}')
          WHERE name IN ('${config.columnNames.join("', '")}');
        `.trim();
      default:
        return `SELECT 1;`;
    }
  }

  /**
   * Generate existing index analysis query
   */
  private generateExistingIndexAnalysisQuery(config: CreateIndexPatternConfig): string {
    switch (config.databaseType) {
      case 'postgresql':
        return `
          SELECT 
            i.indexname,
            i.indexdef,
            pg_size_pretty(pg_relation_size(i.indexname::regclass)) as size,
            s.idx_tup_read,
            s.idx_tup_fetch
          FROM pg_indexes i
          LEFT JOIN pg_stat_user_indexes s ON i.indexname = s.indexrelname
          WHERE i.tablename = '${config.tableName}';
        `.trim();
      case 'mysql':
        return `
          SELECT 
            index_name,
            column_name,
            cardinality,
            sub_part,
            packed,
            nullable,
            index_type
          FROM information_schema.statistics
          WHERE table_name = '${config.tableName}'
          ORDER BY index_name, seq_in_index;
        `.trim();
      case 'sqlite':
        return `
          SELECT 
            name,
            sql,
            tbl_name
          FROM sqlite_master
          WHERE type = 'index'
            AND tbl_name = '${config.tableName}';
        `.trim();
      default:
        return `SELECT 1;`;
    }
  }

  /**
   * Generate redundancy analysis query
   */
  private generateRedundancyAnalysisQuery(config: CreateIndexPatternConfig): string {
    // This is a complex analysis that would typically be done programmatically
    // Here we provide a basic structure for each database
    switch (config.databaseType) {
      case 'postgresql':
        return `
          SELECT 
            i1.indexname as index1,
            i2.indexname as index2,
            i1.indexdef as def1,
            i2.indexdef as def2
          FROM pg_indexes i1
          CROSS JOIN pg_indexes i2
          WHERE i1.tablename = '${config.tableName}'
            AND i2.tablename = '${config.tableName}'
            AND i1.indexname < i2.indexname
            AND (
              -- Check for potential redundancy patterns
              i1.indexdef LIKE '%' || split_part(i2.indexdef, '(', 2) || '%'
              OR i2.indexdef LIKE '%' || split_part(i1.indexdef, '(', 2) || '%'
            );
        `.trim();
      case 'mysql':
        return `
          SELECT 
            s1.index_name as index1,
            s2.index_name as index2,
            GROUP_CONCAT(s1.column_name ORDER BY s1.seq_in_index) as columns1,
            GROUP_CONCAT(s2.column_name ORDER BY s2.seq_in_index) as columns2
          FROM information_schema.statistics s1
          JOIN information_schema.statistics s2 
            ON s1.table_name = s2.table_name
            AND s1.index_name < s2.index_name
          WHERE s1.table_name = '${config.tableName}'
          GROUP BY s1.index_name, s2.index_name;
        `.trim();
      case 'sqlite':
        return `
          SELECT 
            name,
            sql
          FROM sqlite_master
          WHERE type = 'index'
            AND tbl_name = '${config.tableName}'
          ORDER BY name;
        `.trim();
      default:
        return `SELECT 1;`;
    }
  }

  /**
   * Generate index validation query
   */
  private generateIndexValidationQuery(tableName: string, indexName: string): string {
    return `
      SELECT 1 as index_exists
      FROM information_schema.statistics
      WHERE table_name = '${tableName}'
        AND index_name = '${indexName}'
      LIMIT 1;
    `.trim();
  }

  /**
   * Generate drop index SQL for rollback
   */
  private generateDropIndexSQL(config: CreateIndexPatternConfig, indexName: string): string {
    switch (config.databaseType) {
      case 'postgresql':
        return `DROP INDEX IF EXISTS ${indexName};`;
      case 'mysql':
        return `ALTER TABLE ${config.tableName} DROP INDEX IF EXISTS ${indexName};`;
      case 'sqlite':
        return `DROP INDEX IF EXISTS ${indexName};`;
      default:
        return `DROP INDEX IF EXISTS ${indexName};`;
    }
  }

  /**
   * Estimate index creation duration
   */
  private estimateIndexCreationDuration(config: CreateIndexPatternConfig): number {
    // Base duration estimates in milliseconds
    const baseDuration = 10000; // 10 seconds base
    const columnFactor = config.columnNames.length * 2000; // 2 seconds per column
    const uniqueFactor = config.unique ? 5000 : 0; // 5 seconds for uniqueness check
    const typeFactor = this.getIndexTypeFactor(config.indexType) * 1000;

    return baseDuration + columnFactor + uniqueFactor + typeFactor;
  }

  /**
   * Get index type duration factor
   */
  private getIndexTypeFactor(indexType?: string): number {
    switch (indexType) {
      case 'GIN':
        return 15; // GIN indexes take longer
      case 'GIST':
        return 12; // GIST indexes are complex
      case 'HASH':
        return 3; // Hash indexes are faster
      case 'BRIN':
        return 5; // BRIN indexes are moderately fast
      default:
        return 8; // BTREE default
    }
  }

  /**
   * Check if maintenance window is required
   */
  private requiresMaintenanceWindow(config: CreateIndexPatternConfig): boolean {
    return config.unique || // Unique indexes may lock for duplicate checks
           config.indexType === 'GIN' || 
           config.indexType === 'GIST' || // Complex index types
           config.databaseType === 'sqlite'; // SQLite always locks
  }

  /**
   * Add index-specific warnings
   */
  private addIndexSpecificWarnings(config: CreateIndexPatternConfig, warnings: string[]): void {
    if (config.columnNames.length > 4) {
      warnings.push('Composite index with many columns may impact write performance');
    }

    if (config.unique) {
      warnings.push('Unique index creation will fail if duplicate values exist');
    }

    if (config.indexType === 'GIN' || config.indexType === 'GIST') {
      warnings.push('Specialized index types require more maintenance overhead');
    }

    if (config.partial && !config.partialCondition) {
      warnings.push('Partial index specified but no condition provided');
    }

    warnings.push(
      'Index creation will impact write performance until completion',
      'Monitor disk space usage during index creation',
      'Consider creating index during low-traffic periods'
    );
  }

  /**
   * Generate validation queries for the index
   */
  public generateValidationQueries(config: CreateIndexPatternConfig): string[] {
    const indexName = config.indexName || this.generateIndexName(config);
    
    return [
      this.generateIndexValidationQuery(config.tableName, indexName),
      `SELECT COUNT(*) FROM ${config.tableName};`, // Verify table accessibility
      this.generateExistingIndexAnalysisQuery(config)
    ];
  }

  /**
   * Estimate performance impact of index creation
   */
  public estimatePerformanceImpact(
    config: CreateIndexPatternConfig,
    tableRowCount: number
  ): {
    estimatedDurationMs: number;
    memoryUsageMB: number;
    diskSpaceRequiredMB: number;
    recommendedMaintenanceWindow: boolean;
    indexSizeEstimateMB: number;
  } {
    // Base calculation factors
    const rowsPerSecond = 10000; // Standard index creation speed
    const memoryPerRow = 0.003; // 3KB per row for index creation
    
    // Calculate duration based on table size and complexity
    const complexityFactor = config.columnNames.length * 1.5;
    const typeFactor = this.getIndexTypeFactor(config.indexType);
    const uniqueFactor = config.unique ? 1.4 : 1.0;
    
    const baseDuration = (tableRowCount / rowsPerSecond) * 1000;
    const adjustedDuration = baseDuration * complexityFactor * typeFactor * uniqueFactor;
    
    // Memory usage estimation
    const memoryUsageMB = Math.max(50, tableRowCount * memoryPerRow);
    
    // Disk space estimation
    const avgIndexEntrySize = 60; // bytes per index entry
    const indexSizeEstimateMB = Math.max(5, 
      (tableRowCount * avgIndexEntrySize * config.columnNames.length) / (1024 * 1024)
    );
    
    // Include columns add to size
    if (config.includeColumns && config.includeColumns.length > 0) {
      const includeSize = indexSizeEstimateMB * (config.includeColumns.length * 0.3);
      return {
        ...this.estimatePerformanceImpact(config, tableRowCount),
        indexSizeEstimateMB: indexSizeEstimateMB + includeSize
      };
    }
    
    const diskSpaceRequiredMB = indexSizeEstimateMB * 1.5; // Extra space for creation
    
    // Maintenance window recommendation
    const recommendedMaintenanceWindow = this.requiresMaintenanceWindow(config) || 
                                        tableRowCount > 500000; // Large tables
    
    return {
      estimatedDurationMs: Math.round(adjustedDuration),
      memoryUsageMB: Math.round(memoryUsageMB),
      diskSpaceRequiredMB: Math.round(diskSpaceRequiredMB),
      recommendedMaintenanceWindow,
      indexSizeEstimateMB: Math.round(indexSizeEstimateMB)
    };
  }
} 