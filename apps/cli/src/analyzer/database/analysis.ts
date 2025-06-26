/**
 * Database analysis engine
 * Provides table analysis, metadata extraction, and performance impact estimation
 */

import { DatabaseConnection, TableMetadata, DatabaseAnalysis, ColumnMetadata, IndexMetadata, ConstraintMetadata } from '../../core/index.js'

/**
 * Main database analyzer class
 */
export class DatabaseAnalyzer {
  constructor(private connection: DatabaseConnection) {}
  
  /**
   * Perform comprehensive database analysis
   */
  async analyze(): Promise<DatabaseAnalysis> {
    const tables = await this.getAllTables()
    const tableMetadata = await Promise.all(
      tables.map(tableName => this.analyzeTable(tableName))
    )
    
    const totalSize = tableMetadata.reduce((sum, table) => sum + table.sizeBytes, 0)
    const version = await this.getDatabaseVersion()
    const features = await this.getDatabaseFeatures()
    const performance = await this.getPerformanceMetrics()
    
    return {
      tables: tableMetadata,
      totalSize,
      version,
      features,
      performance
    }
  }
  
  /**
   * Analyze a specific table for metadata
   */
  async analyzeTable(tableName: string, schema?: string): Promise<TableMetadata> {
    const fullTableName = schema ? `${schema}.${tableName}` : tableName
    
    const [columns, indexes, constraints, rowCount, sizeBytes, dependencies] = await Promise.all([
      this.getTableColumns(tableName, schema),
      this.getTableIndexes(tableName, schema),
      this.getTableConstraints(tableName, schema),
      this.getTableRowCount(tableName, schema),
      this.getTableSize(tableName, schema),
      this.getTableDependencies(tableName, schema)
    ])
    
    return {
      name: tableName,
      schema,
      rowCount,
      sizeBytes,
      columns,
      indexes,
      constraints,
      dependencies
    }
  }
  
  /**
   * Get all table names in the database
   */
  private async getAllTables(): Promise<string[]> {
    switch (this.connection.type) {
      case 'postgresql':
        return await this.getPostgreSQLTables()
      case 'mysql':
        return await this.getMySQLTables()
      case 'sqlite':
        return await this.getSQLiteTables()
      default:
        throw new Error(`Unsupported database type: ${this.connection.type}`)
    }
  }
  
  private async getPostgreSQLTables(): Promise<string[]> {
    const result = await this.connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    return result.map((row: any) => row.table_name)
  }
  
  private async getMySQLTables(): Promise<string[]> {
    const result = await this.connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `)
    return result.map((row: any) => row.table_name || row.TABLE_NAME)
  }
  
  private async getSQLiteTables(): Promise<string[]> {
    const result = await this.connection.query(`
      SELECT name 
      FROM sqlite_master 
      WHERE type = 'table' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `)
    return result.map((row: any) => row.name)
  }
  
  /**
   * Get column metadata for a table
   */
  private async getTableColumns(tableName: string, schema?: string): Promise<ColumnMetadata[]> {
    switch (this.connection.type) {
      case 'postgresql':
        return await this.getPostgreSQLColumns(tableName, schema)
      case 'mysql':
        return await this.getMySQLColumns(tableName, schema)
      case 'sqlite':
        return await this.getSQLiteColumns(tableName)
      default:
        return []
    }
  }
  
  private async getPostgreSQLColumns(tableName: string, schema = 'public'): Promise<ColumnMetadata[]> {
    const result = await this.connection.query(`
      SELECT 
        c.column_name,
        c.data_type,
        c.is_nullable = 'YES' as nullable,
        c.column_default as default_value,
        CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END as is_primary,
        CASE WHEN u.column_name IS NOT NULL THEN true ELSE false END as is_unique,
        fk.referenced_table,
        fk.referenced_column
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.key_column_usage ku
        JOIN information_schema.table_constraints tc ON ku.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'PRIMARY KEY' AND ku.table_name = $1 AND ku.table_schema = $2
      ) pk ON c.column_name = pk.column_name
      LEFT JOIN (
        SELECT ku.column_name
        FROM information_schema.key_column_usage ku
        JOIN information_schema.table_constraints tc ON ku.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'UNIQUE' AND ku.table_name = $1 AND ku.table_schema = $2
      ) u ON c.column_name = u.column_name
      LEFT JOIN (
        SELECT 
          ku.column_name,
          ku.referenced_table_name as referenced_table,
          ku.referenced_column_name as referenced_column
        FROM information_schema.key_column_usage ku
        JOIN information_schema.table_constraints tc ON ku.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY' AND ku.table_name = $1 AND ku.table_schema = $2
      ) fk ON c.column_name = fk.column_name
      WHERE c.table_name = $1 AND c.table_schema = $2
      ORDER BY c.ordinal_position
    `, [tableName, schema])
    
    return result.map((row: any) => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.nullable,
      defaultValue: row.default_value,
      isPrimary: row.is_primary,
      isUnique: row.is_unique,
      references: row.referenced_table ? {
        table: row.referenced_table,
        column: row.referenced_column
      } : undefined
    }))
  }
  
  private async getMySQLColumns(tableName: string, schema?: string): Promise<ColumnMetadata[]> {
    const result = await this.connection.query(`
      SELECT 
        column_name,
        data_type,
        is_nullable = 'YES' as nullable,
        column_default as default_value,
        column_key = 'PRI' as is_primary,
        column_key = 'UNI' as is_unique
      FROM information_schema.columns 
      WHERE table_name = ? AND table_schema = COALESCE(?, DATABASE())
      ORDER BY ordinal_position
    `, [tableName, schema])
    
    return result.map((row: any) => ({
      name: row.column_name || row.COLUMN_NAME,
      type: row.data_type || row.DATA_TYPE,
      nullable: Boolean(row.nullable),
      defaultValue: row.default_value || row.COLUMN_DEFAULT,
      isPrimary: Boolean(row.is_primary),
      isUnique: Boolean(row.is_unique),
      references: undefined // TODO: Implement FK detection for MySQL
    }))
  }
  
  private async getSQLiteColumns(tableName: string): Promise<ColumnMetadata[]> {
    const result = await this.connection.query(`PRAGMA table_info(${tableName})`)
    
    return result.map((row: any) => ({
      name: row.name,
      type: row.type,
      nullable: !row.notnull,
      defaultValue: row.dflt_value,
      isPrimary: Boolean(row.pk),
      isUnique: false, // TODO: Implement unique detection for SQLite
      references: undefined // TODO: Implement FK detection for SQLite
    }))
  }
  
  /**
   * Get index metadata for a table
   */
  private async getTableIndexes(tableName: string, schema?: string): Promise<IndexMetadata[]> {
    switch (this.connection.type) {
      case 'postgresql':
        return await this.getPostgreSQLIndexes(tableName, schema)
      case 'mysql':
        return await this.getMySQLIndexes(tableName, schema)
      case 'sqlite':
        return await this.getSQLiteIndexes(tableName)
      default:
        return []
    }
  }
  
  private async getPostgreSQLIndexes(tableName: string, schema = 'public'): Promise<IndexMetadata[]> {
    const result = await this.connection.query(`
      SELECT 
        i.indexname as name,
        array_agg(a.attname ORDER BY a.attnum) as columns,
        i.indexdef LIKE '%UNIQUE%' as unique,
        am.amname as type,
        pg_relation_size(i.indexname::regclass) as size_bytes
      FROM pg_indexes i
      JOIN pg_class c ON c.relname = i.indexname
      JOIN pg_am am ON am.oid = c.relam
      JOIN pg_index idx ON idx.indexrelid = c.oid
      JOIN pg_attribute a ON a.attrelid = idx.indrelid AND a.attnum = ANY(idx.indkey)
      WHERE i.tablename = $1 AND i.schemaname = $2
      GROUP BY i.indexname, i.indexdef, am.amname, c.oid
      ORDER BY i.indexname
    `, [tableName, schema])
    
    return result.map((row: any) => ({
      name: row.name,
      columns: Array.isArray(row.columns) ? row.columns : [row.columns],
      unique: row.unique,
      type: row.type,
      sizeBytes: parseInt(row.size_bytes) || 0
    }))
  }
  
  private async getMySQLIndexes(tableName: string, schema?: string): Promise<IndexMetadata[]> {
    const result = await this.connection.query(`
      SELECT 
        index_name as name,
        GROUP_CONCAT(column_name ORDER BY seq_in_index) as columns,
        non_unique = 0 as unique,
        index_type as type
      FROM information_schema.statistics 
      WHERE table_name = ? AND table_schema = COALESCE(?, DATABASE())
      GROUP BY index_name, non_unique, index_type
      ORDER BY index_name
    `, [tableName, schema])
    
    return result.map((row: any) => ({
      name: row.name,
      columns: row.columns.split(','),
      unique: Boolean(row.unique),
      type: row.type,
      sizeBytes: undefined // Size info not easily available in MySQL
    }))
  }
  
  private async getSQLiteIndexes(tableName: string): Promise<IndexMetadata[]> {
    const result = await this.connection.query(`
      SELECT name, sql 
      FROM sqlite_master 
      WHERE type = 'index' AND tbl_name = ?
    `, [tableName])
    
    return result.map((row: any) => ({
      name: row.name,
      columns: [], // TODO: Parse from SQL
      unique: row.sql?.includes('UNIQUE') || false,
      type: 'btree',
      sizeBytes: undefined
    }))
  }
  
  /**
   * Get constraint metadata for a table
   */
  private async getTableConstraints(tableName: string, schema?: string): Promise<ConstraintMetadata[]> {
    switch (this.connection.type) {
      case 'postgresql':
        return await this.getPostgreSQLConstraints(tableName, schema)
      case 'mysql':
        return await this.getMySQLConstraints(tableName, schema)
      case 'sqlite':
        return await this.getSQLiteConstraints(tableName)
      default:
        return []
    }
  }
  
  private async getPostgreSQLConstraints(tableName: string, schema = 'public'): Promise<ConstraintMetadata[]> {
    const result = await this.connection.query(`
      SELECT 
        tc.constraint_name as name,
        tc.constraint_type as type,
        array_agg(kcu.column_name) as columns,
        ccu.table_name as referenced_table,
        array_agg(ccu.column_name) as referenced_columns,
        cc.check_clause as definition
      FROM information_schema.table_constraints tc
      LEFT JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
      LEFT JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
      LEFT JOIN information_schema.check_constraints cc ON tc.constraint_name = cc.constraint_name
      WHERE tc.table_name = $1 AND tc.table_schema = $2
      GROUP BY tc.constraint_name, tc.constraint_type, ccu.table_name, cc.check_clause
      ORDER BY tc.constraint_name
    `, [tableName, schema])
    
    return result.map((row: any) => ({
      name: row.name,
      type: row.type,
      columns: Array.isArray(row.columns) ? row.columns.filter(Boolean) : [row.columns].filter(Boolean),
      referencedTable: row.referenced_table,
      referencedColumns: Array.isArray(row.referenced_columns) ? row.referenced_columns.filter(Boolean) : [row.referenced_columns].filter(Boolean),
      definition: row.definition
    }))
  }
  
  private async getMySQLConstraints(tableName: string, schema?: string): Promise<ConstraintMetadata[]> {
    // Simplified MySQL constraint detection
    return []
  }
  
  private async getSQLiteConstraints(tableName: string): Promise<ConstraintMetadata[]> {
    // Simplified SQLite constraint detection
    return []
  }
  
  /**
   * Get table row count
   */
  private async getTableRowCount(tableName: string, schema?: string): Promise<number> {
    try {
      const fullTableName = schema ? `${schema}.${tableName}` : tableName
      const result = await this.connection.query(`SELECT COUNT(*) as count FROM ${fullTableName}`)
      return parseInt(result[0]?.count || result[0]?.COUNT || '0')
    } catch {
      return 0
    }
  }
  
  /**
   * Get table size in bytes
   */
  private async getTableSize(tableName: string, schema?: string): Promise<number> {
    try {
      switch (this.connection.type) {
        case 'postgresql':
          const pgResult = await this.connection.query(`
            SELECT pg_total_relation_size($1) as size
          `, [tableName])
          return parseInt(pgResult[0]?.size || '0')
          
        case 'mysql':
          const mysqlResult = await this.connection.query(`
            SELECT (data_length + index_length) as size
            FROM information_schema.tables
            WHERE table_name = ? AND table_schema = COALESCE(?, DATABASE())
          `, [tableName, schema])
          return parseInt(mysqlResult[0]?.size || '0')
          
        case 'sqlite':
          // SQLite doesn't have easy size calculation
          return 0
          
        default:
          return 0
      }
    } catch {
      return 0
    }
  }
  
  /**
   * Get table dependencies
   */
  private async getTableDependencies(tableName: string, schema?: string): Promise<any[]> {
    // Simplified implementation - return empty for now
    return []
  }
  
  /**
   * Get database version
   */
  private async getDatabaseVersion(): Promise<string> {
    try {
      switch (this.connection.type) {
        case 'postgresql':
          const pgResult = await this.connection.query('SELECT version()')
          return pgResult[0]?.version || 'Unknown'
          
        case 'mysql':
          const mysqlResult = await this.connection.query('SELECT VERSION() as version')
          return mysqlResult[0]?.version || 'Unknown'
          
        case 'sqlite':
          const sqliteResult = await this.connection.query('SELECT sqlite_version()')
          return sqliteResult[0]?.['sqlite_version()'] || 'Unknown'
          
        default:
          return 'Unknown'
      }
    } catch {
      return 'Unknown'
    }
  }
  
  /**
   * Get database features
   */
  private async getDatabaseFeatures(): Promise<string[]> {
    const features: string[] = []
    
    switch (this.connection.type) {
      case 'postgresql':
        features.push('ACID', 'Transactions', 'Foreign Keys', 'Indexes', 'Views', 'Triggers', 'Stored Procedures')
        break
      case 'mysql':
        features.push('ACID', 'Transactions', 'Foreign Keys', 'Indexes', 'Views', 'Triggers', 'Stored Procedures')
        break
      case 'sqlite':
        features.push('ACID', 'Transactions', 'Foreign Keys', 'Indexes', 'Views', 'Triggers')
        break
    }
    
    return features
  }
  
  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(): Promise<{ avgQueryTime: number; connectionCount: number; cacheHitRatio?: number }> {
    // Simplified implementation
    return {
      avgQueryTime: 0,
      connectionCount: 1,
      cacheHitRatio: undefined
    }
  }
  
  /**
   * Estimate migration performance impact
   */
  async estimatePerformanceImpact(sql: string, tableName?: string): Promise<{
    estimatedTime: number
    lockDuration: number
    affectedRows: number
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
    recommendations: string[]
  }> {
    const recommendations: string[] = []
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
    let estimatedTime = 0
    let lockDuration = 0
    let affectedRows = 0
    
    // Basic SQL analysis
    const sqlLower = sql.toLowerCase()
    
    if (tableName) {
      const tableMetadata = await this.analyzeTable(tableName)
      affectedRows = tableMetadata.rowCount
      
      // Estimate based on table size and operation type
      if (sqlLower.includes('alter table')) {
        estimatedTime = Math.max(1, Math.floor(affectedRows / 1000)) // 1 second per 1000 rows
        lockDuration = estimatedTime
        
        if (affectedRows > 100000) {
          riskLevel = 'HIGH'
          recommendations.push('Consider maintenance window for large table migration')
          recommendations.push('Test migration on staging environment first')
        } else if (affectedRows > 10000) {
          riskLevel = 'MEDIUM'
          recommendations.push('Monitor migration progress')
        }
        
        if (sqlLower.includes('add column') && !sqlLower.includes('not null')) {
          recommendations.push('Adding nullable column is generally safe')
        } else if (sqlLower.includes('add column') && sqlLower.includes('not null')) {
          riskLevel = 'HIGH'
          recommendations.push('Adding NOT NULL column requires table rewrite')
          recommendations.push('Consider adding column as nullable first, then adding constraint')
        }
      }
      
      if (sqlLower.includes('drop column')) {
        riskLevel = 'HIGH'
        recommendations.push('Dropping columns is destructive - ensure data is not needed')
        recommendations.push('Consider creating backup before migration')
      }
      
      if (sqlLower.includes('create index')) {
        estimatedTime = Math.max(1, Math.floor(affectedRows / 5000)) // 1 second per 5000 rows
        lockDuration = 0 // Most databases support CONCURRENT index creation
        
        if (this.connection.type === 'postgresql') {
          recommendations.push('Use CREATE INDEX CONCURRENTLY to avoid blocking')
        }
      }
    }
    
    return {
      estimatedTime,
      lockDuration,
      affectedRows,
      riskLevel,
      recommendations
    }
  }
} 