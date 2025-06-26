import pkg from 'node-sql-parser';
const { Parser } = pkg;
import type { AST, Parser as ParserType } from 'node-sql-parser';

/**
 * SQL operation types that can be parsed and analyzed
 */
export enum SqlOperationType {
  CREATE_TABLE = 'CREATE_TABLE',
  ALTER_TABLE = 'ALTER_TABLE',
  DROP_TABLE = 'DROP_TABLE',
  CREATE_INDEX = 'CREATE_INDEX',
  DROP_INDEX = 'DROP_INDEX',
  INSERT = 'INSERT',
  UPDATE = 'UPDATE',
  DELETE = 'DELETE',
  SELECT = 'SELECT',
  UNKNOWN = 'UNKNOWN'
}

/**
 * Parsed SQL operation with metadata
 */
export interface ParsedSqlOperation {
  type: SqlOperationType;
  sql: string;
  ast: AST | null;
  tableName?: string;
  columnName?: string;
  indexName?: string;
  operation?: string;
  metadata: {
    isBlocking: boolean;
    isDestructive: boolean;
    affectsData: boolean;
    requiresLock: boolean;
    estimatedDuration: 'fast' | 'medium' | 'slow';
  };
}

/**
 * SQL parsing result with all operations found
 */
export interface SqlParseResult {
  operations: ParsedSqlOperation[];
  errors: string[];
  warnings: string[];
  totalOperations: number;
  destructiveOperations: number;
  blockingOperations: number;
}

/**
 * SQL Parser class for analyzing migration SQL statements
 */
export class SqlParser {
  private parser: ParserType;

  constructor() {
    // Initialize node-sql-parser with multiple database support
    this.parser = new Parser();
  }

  /**
   * Parse a single SQL statement and return operation details
   */
  public parseSql(sql: string, database: 'postgresql' | 'mysql' | 'sqlite' = 'postgresql'): ParsedSqlOperation {
    try {
      // Clean and normalize the SQL
      const cleanSql = this.cleanSql(sql);
      
      // Parse the SQL into AST
      const ast = this.parser.astify(cleanSql, { database });
      
      // Extract operation details
      const operation = this.extractOperationFromAst(ast, cleanSql);
      
      return operation;
    } catch (error) {
      // If parsing fails, try to determine operation type from SQL text
      const fallbackOperation = this.fallbackParse(sql);
      return {
        ...fallbackOperation,
        ast: null,
        metadata: {
          ...fallbackOperation.metadata,
          estimatedDuration: 'medium' // Default to medium for unparseable operations
        }
      };
    }
  }

  /**
   * Parse multiple SQL statements (common in migration files)
   */
  public parseMultipleSql(sqlStatements: string[], database: 'postgresql' | 'mysql' | 'sqlite' = 'postgresql'): SqlParseResult {
    const operations: ParsedSqlOperation[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const sql of sqlStatements) {
      try {
        const operation = this.parseSql(sql, database);
        operations.push(operation);

        // Add warnings for risky operations
        if (operation.metadata.isDestructive) {
          warnings.push(`Destructive operation detected: ${operation.type} on ${operation.tableName || 'unknown table'}`);
        }
        if (operation.metadata.isBlocking) {
          warnings.push(`Blocking operation detected: ${operation.type} - may cause downtime`);
        }
      } catch (error) {
        errors.push(`Failed to parse SQL: ${sql.substring(0, 50)}... - ${error}`);
      }
    }

    return {
      operations,
      errors,
      warnings,
      totalOperations: operations.length,
      destructiveOperations: operations.filter(op => op.metadata.isDestructive).length,
      blockingOperations: operations.filter(op => op.metadata.isBlocking).length
    };
  }

  /**
   * Clean and normalize SQL for better parsing
   */
  private cleanSql(sql: string): string {
    return sql
      .trim()
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/;\s*$/, ''); // Remove trailing semicolon
  }

  /**
   * Extract operation details from parsed AST
   */
  private extractOperationFromAst(ast: AST | AST[], sql: string): ParsedSqlOperation {
    // Handle array of AST nodes
    if (Array.isArray(ast)) {
      ast = ast[0]; // Take the first statement
    }

    const operation: ParsedSqlOperation = {
      type: SqlOperationType.UNKNOWN,
      sql,
      ast,
      metadata: {
        isBlocking: false,
        isDestructive: false,
        affectsData: false,
        requiresLock: false,
        estimatedDuration: 'fast'
      }
    };

    // Cast to any to handle different AST node types
    const astNode = ast as any;

    switch (astNode.type?.toLowerCase()) {
      case 'create':
        if (astNode.keyword === 'table') {
          operation.type = SqlOperationType.CREATE_TABLE;
          operation.tableName = this.extractTableName(astNode);
          operation.metadata = {
            isBlocking: true,
            isDestructive: false,
            affectsData: false,
            requiresLock: true,
            estimatedDuration: 'medium'
          };
        } else if (astNode.keyword === 'index') {
          operation.type = SqlOperationType.CREATE_INDEX;
          operation.indexName = astNode.index;
          operation.tableName = this.extractTableName(astNode);
          operation.metadata = {
            isBlocking: true,
            isDestructive: false,
            affectsData: false,
            requiresLock: true,
            estimatedDuration: 'slow'
          };
        }
        break;

      case 'alter':
        operation.type = SqlOperationType.ALTER_TABLE;
        operation.tableName = this.extractTableName(astNode);
        operation.operation = astNode.expr?.type || 'unknown';
        
        // Analyze the specific ALTER operation
        const alterMetadata = this.analyzeAlterOperation(astNode);
        operation.metadata = alterMetadata;
        break;

      case 'drop':
        if (astNode.keyword === 'table') {
          operation.type = SqlOperationType.DROP_TABLE;
          operation.tableName = this.extractTableName(astNode);
          operation.metadata = {
            isBlocking: true,
            isDestructive: true,
            affectsData: true,
            requiresLock: true,
            estimatedDuration: 'fast'
          };
        } else if (astNode.keyword === 'index') {
          operation.type = SqlOperationType.DROP_INDEX;
          operation.indexName = astNode.name;
          operation.metadata = {
            isBlocking: false,
            isDestructive: true,
            affectsData: false,
            requiresLock: false,
            estimatedDuration: 'fast'
          };
        }
        break;

      case 'insert':
        operation.type = SqlOperationType.INSERT;
        operation.tableName = this.extractTableName(astNode);
        operation.metadata = {
          isBlocking: false,
          isDestructive: false,
          affectsData: true,
          requiresLock: false,
          estimatedDuration: 'fast'
        };
        break;

      case 'update':
        operation.type = SqlOperationType.UPDATE;
        operation.tableName = this.extractTableName(astNode);
        operation.metadata = {
          isBlocking: false,
          isDestructive: false,
          affectsData: true,
          requiresLock: false,
          estimatedDuration: 'medium'
        };
        break;

      case 'delete':
        operation.type = SqlOperationType.DELETE;
        operation.tableName = this.extractTableName(astNode);
        operation.metadata = {
          isBlocking: false,
          isDestructive: true,
          affectsData: true,
          requiresLock: false,
          estimatedDuration: 'medium'
        };
        break;

      case 'select':
        operation.type = SqlOperationType.SELECT;
        operation.tableName = this.extractTableName(astNode);
        operation.metadata = {
          isBlocking: false,
          isDestructive: false,
          affectsData: false,
          requiresLock: false,
          estimatedDuration: 'fast'
        };
        break;
    }

    return operation;
  }

  /**
   * Analyze ALTER TABLE operations for specific risk assessment
   */
  private analyzeAlterOperation(ast: any): ParsedSqlOperation['metadata'] {
    const baseMetadata = {
      isBlocking: true,
      isDestructive: false,
      affectsData: false,
      requiresLock: true,
      estimatedDuration: 'medium' as const
    };

    // Check for specific ALTER operations
    if (ast.expr) {
      const action = ast.expr.action?.toLowerCase();
      
      switch (action) {
        case 'add':
          if (ast.expr.resource === 'column') {
            // Adding NOT NULL column is blocking and potentially destructive
            const hasNotNull = ast.expr.definition?.nullable === false;
            const hasDefault = ast.expr.definition?.defaultValue !== undefined;
            
            return {
              ...baseMetadata,
              isDestructive: hasNotNull && !hasDefault,
              estimatedDuration: hasNotNull ? 'slow' : 'medium'
            };
          }
          break;

        case 'drop':
          return {
            ...baseMetadata,
            isDestructive: true,
            affectsData: true,
            estimatedDuration: 'fast'
          };

        case 'modify':
        case 'change':
          return {
            ...baseMetadata,
            isDestructive: true,
            affectsData: true,
            estimatedDuration: 'slow'
          };

        case 'rename':
          return {
            ...baseMetadata,
            isDestructive: false,
            affectsData: false,
            estimatedDuration: 'fast'
          };
      }
    }

    return baseMetadata;
  }

  /**
   * Extract table name from AST node
   */
  private extractTableName(ast: any): string | undefined {
    if (ast.table) {
      return typeof ast.table === 'string' ? ast.table : ast.table.table;
    }
    if (ast.name) {
      return typeof ast.name === 'string' ? ast.name : ast.name.table;
    }
    if (ast.from && ast.from.length > 0) {
      const fromTable = ast.from[0];
      return typeof fromTable.table === 'string' ? fromTable.table : fromTable.table?.table;
    }
    return undefined;
  }

  /**
   * Fallback parsing when AST parsing fails
   */
  private fallbackParse(sql: string): Omit<ParsedSqlOperation, 'ast'> {
    const upperSql = sql.toUpperCase().trim();
    
    // Extract operation type from SQL text
    let type = SqlOperationType.UNKNOWN;
    let tableName: string | undefined;
    let isBlocking = false;
    let isDestructive = false;
    let affectsData = false;
    let requiresLock = false;
    let estimatedDuration: 'fast' | 'medium' | 'slow' = 'medium';

    if (upperSql.startsWith('CREATE TABLE')) {
      type = SqlOperationType.CREATE_TABLE;
      tableName = this.extractTableNameFromText(sql, 'CREATE TABLE');
      isBlocking = true;
      requiresLock = true;
    } else if (upperSql.startsWith('CREATE INDEX')) {
      type = SqlOperationType.CREATE_INDEX;
      isBlocking = true;
      requiresLock = true;
      estimatedDuration = 'slow';
    } else if (upperSql.startsWith('ALTER TABLE')) {
      type = SqlOperationType.ALTER_TABLE;
      tableName = this.extractTableNameFromText(sql, 'ALTER TABLE');
      isBlocking = true;
      requiresLock = true;
      
      // Check for destructive ALTER operations
      if (upperSql.includes('DROP COLUMN') || upperSql.includes('DROP CONSTRAINT')) {
        isDestructive = true;
        affectsData = true;
      }
    } else if (upperSql.startsWith('DROP TABLE')) {
      type = SqlOperationType.DROP_TABLE;
      tableName = this.extractTableNameFromText(sql, 'DROP TABLE');
      isBlocking = true;
      isDestructive = true;
      affectsData = true;
      requiresLock = true;
      estimatedDuration = 'fast';
    } else if (upperSql.startsWith('DROP INDEX')) {
      type = SqlOperationType.DROP_INDEX;
      isDestructive = true;
      estimatedDuration = 'fast';
    } else if (upperSql.startsWith('INSERT')) {
      type = SqlOperationType.INSERT;
      affectsData = true;
      estimatedDuration = 'fast';
    } else if (upperSql.startsWith('UPDATE')) {
      type = SqlOperationType.UPDATE;
      affectsData = true;
    } else if (upperSql.startsWith('DELETE')) {
      type = SqlOperationType.DELETE;
      isDestructive = true;
      affectsData = true;
    } else if (upperSql.startsWith('SELECT')) {
      type = SqlOperationType.SELECT;
      estimatedDuration = 'fast';
    }

    return {
      type,
      sql,
      tableName,
      metadata: {
        isBlocking,
        isDestructive,
        affectsData,
        requiresLock,
        estimatedDuration
      }
    };
  }

  /**
   * Extract table name from SQL text using regex
   */
  private extractTableNameFromText(sql: string, operation: string): string | undefined {
    const regex = new RegExp(`${operation}\\s+(?:IF\\s+(?:NOT\\s+)?EXISTS\\s+)?(?:\`|\"|\\[)?([\\w_]+)(?:\`|\"|\\])?`, 'i');
    const match = sql.match(regex);
    return match ? match[1] : undefined;
  }
} 