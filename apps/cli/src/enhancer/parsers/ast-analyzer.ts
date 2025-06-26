import type { AST } from 'node-sql-parser';
import type { ParsedSqlOperation, SqlOperationType } from './sql-parser.js';

/**
 * Column definition extracted from AST
 */
export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  defaultValue?: string | number | boolean;
  autoIncrement: boolean;
  references?: {
    table: string;
    column: string;
    onDelete?: string;
    onUpdate?: string;
  };
}

/**
 * Index definition extracted from AST
 */
export interface IndexDefinition {
  name: string;
  columns: string[];
  unique: boolean;
  type?: string; // btree, hash, etc.
  tableName: string;
  concurrent?: boolean;
}

/**
 * Constraint definition extracted from AST
 */
export interface ConstraintDefinition {
  name?: string;
  type: 'PRIMARY_KEY' | 'FOREIGN_KEY' | 'UNIQUE' | 'CHECK' | 'NOT_NULL';
  columns: string[];
  tableName: string;
  referencedTable?: string;
  referencedColumns?: string[];
  onDelete?: string;
  onUpdate?: string;
  checkExpression?: string;
}

/**
 * Table dependency relationship
 */
export interface TableDependency {
  sourceTable: string;
  targetTable: string;
  type: 'FOREIGN_KEY' | 'REFERENCE' | 'JOIN';
  columns: string[];
  referencedColumns: string[];
}

/**
 * Operation dependency between SQL operations
 */
export interface OperationDependency {
  operation: ParsedSqlOperation;
  dependsOn: ParsedSqlOperation[];
  dependencyType: 'TABLE_CREATION' | 'DATA_DEPENDENCY' | 'CONSTRAINT_DEPENDENCY' | 'INDEX_DEPENDENCY';
  reason: string;
}

/**
 * Analysis result for a SQL operation
 */
export interface SqlOperationAnalysis {
  operation: ParsedSqlOperation;
  columns: ColumnDefinition[];
  indexes: IndexDefinition[];
  constraints: ConstraintDefinition[];
  dependencies: TableDependency[];
  complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedExecutionTime: number; // in milliseconds
  memoryUsage: 'LOW' | 'MEDIUM' | 'HIGH';
  lockScope: 'NONE' | 'ROW' | 'TABLE' | 'DATABASE';
}

/**
 * Complete analysis result for multiple operations
 */
export interface MigrationAnalysisResult {
  operations: SqlOperationAnalysis[];
  operationDependencies: OperationDependency[];
  totalComplexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedTotalTime: number;
  riskFactors: string[];
  recommendations: string[];
}

/**
 * AST Analyzer class for deep SQL operation analysis
 */
export class AstAnalyzer {
  /**
   * Analyze a single SQL operation and its AST
   */
  public analyzeSqlOperation(operation: ParsedSqlOperation): SqlOperationAnalysis {
    const analysis: SqlOperationAnalysis = {
      operation,
      columns: [],
      indexes: [],
      constraints: [],
      dependencies: [],
      complexity: 'LOW',
      estimatedExecutionTime: 100,
      memoryUsage: 'LOW',
      lockScope: 'NONE'
    };

    if (!operation.ast) {
      // If no AST, provide basic analysis based on operation type
      return this.analyzeWithoutAst(operation);
    }

    // Cast AST to any for easier property access
    const ast = operation.ast as any;

    switch (operation.type) {
      case 'CREATE_TABLE':
        return this.analyzeCreateTable(operation, ast);
      case 'ALTER_TABLE':
        return this.analyzeAlterTable(operation, ast);
      case 'CREATE_INDEX':
        return this.analyzeCreateIndex(operation, ast);
      case 'DROP_TABLE':
        return this.analyzeDropTable(operation, ast);
      case 'DROP_INDEX':
        return this.analyzeDropIndex(operation, ast);
      default:
        return this.analyzeGenericOperation(operation, ast);
    }
  }

  /**
   * Analyze multiple operations and their dependencies
   */
  public analyzeMigration(operations: ParsedSqlOperation[]): MigrationAnalysisResult {
    const operationAnalyses = operations.map(op => this.analyzeSqlOperation(op));
    const operationDependencies = this.identifyOperationDependencies(operationAnalyses);
    
    const totalComplexity = this.calculateTotalComplexity(operationAnalyses);
    const estimatedTotalTime = operationAnalyses.reduce((sum, analysis) => sum + analysis.estimatedExecutionTime, 0);
    const riskFactors = this.identifyRiskFactors(operationAnalyses);
    const recommendations = this.generateRecommendations(operationAnalyses, operationDependencies);

    return {
      operations: operationAnalyses,
      operationDependencies,
      totalComplexity,
      estimatedTotalTime,
      riskFactors,
      recommendations
    };
  }

  /**
   * Analyze CREATE TABLE operation
   */
  private analyzeCreateTable(operation: ParsedSqlOperation, ast: any): SqlOperationAnalysis {
    const columns = this.extractColumns(ast);
    const constraints = this.extractConstraints(ast, operation.tableName || '');
    const dependencies = this.extractTableDependencies(ast, operation.tableName || '');

    return {
      operation,
      columns,
      indexes: [],
      constraints,
      dependencies,
      complexity: columns.length > 20 ? 'HIGH' : columns.length > 10 ? 'MEDIUM' : 'LOW',
      estimatedExecutionTime: this.estimateCreateTableTime(columns.length, constraints.length),
      memoryUsage: columns.length > 50 ? 'HIGH' : columns.length > 20 ? 'MEDIUM' : 'LOW',
      lockScope: 'TABLE'
    };
  }

  /**
   * Analyze ALTER TABLE operation
   */
  private analyzeAlterTable(operation: ParsedSqlOperation, ast: any): SqlOperationAnalysis {
    const alterType = ast.expr?.action?.toLowerCase();
    let complexity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'MEDIUM';
    let estimatedTime = 1000; // Default 1 second
    let lockScope: 'NONE' | 'ROW' | 'TABLE' | 'DATABASE' = 'TABLE';

    // Analyze specific ALTER operations
    switch (alterType) {
      case 'add':
        if (ast.expr?.resource === 'column') {
          const hasNotNull = ast.expr?.definition?.nullable === false;
          const hasDefault = ast.expr?.definition?.defaultValue !== undefined;
          complexity = hasNotNull && !hasDefault ? 'HIGH' : 'MEDIUM';
          estimatedTime = hasNotNull ? 10000 : 2000; // 10 sec for NOT NULL, 2 sec for nullable
        }
        break;
      case 'drop':
        complexity = 'HIGH';
        estimatedTime = 5000; // 5 seconds
        break;
      case 'modify':
      case 'change':
        complexity = 'CRITICAL';
        estimatedTime = 15000; // 15 seconds
        break;
      case 'rename':
        complexity = 'LOW';
        estimatedTime = 500; // 0.5 seconds
        lockScope = 'NONE';
        break;
    }

    return {
      operation,
      columns: [],
      indexes: [],
      constraints: [],
      dependencies: [],
      complexity,
      estimatedExecutionTime: estimatedTime,
      memoryUsage: complexity === 'CRITICAL' ? 'HIGH' : 'MEDIUM',
      lockScope
    };
  }

  /**
   * Analyze CREATE INDEX operation
   */
  private analyzeCreateIndex(operation: ParsedSqlOperation, ast: any): SqlOperationAnalysis {
    const indexDef = this.extractIndexDefinition(ast, operation.tableName || '');
    const isConcurrent = ast.options?.includes('CONCURRENTLY') || false;
    
    return {
      operation,
      columns: [],
      indexes: indexDef ? [indexDef] : [],
      constraints: [],
      dependencies: [],
      complexity: indexDef && indexDef.columns.length > 3 ? 'HIGH' : 'MEDIUM',
      estimatedExecutionTime: isConcurrent ? 30000 : 15000, // 30s concurrent, 15s blocking
      memoryUsage: 'MEDIUM',
      lockScope: isConcurrent ? 'NONE' : 'TABLE'
    };
  }

  /**
   * Analyze DROP TABLE operation
   */
  private analyzeDropTable(operation: ParsedSqlOperation, ast: any): SqlOperationAnalysis {
    return {
      operation,
      columns: [],
      indexes: [],
      constraints: [],
      dependencies: [],
      complexity: 'MEDIUM',
      estimatedExecutionTime: 2000, // 2 seconds
      memoryUsage: 'LOW',
      lockScope: 'TABLE'
    };
  }

  /**
   * Analyze DROP INDEX operation
   */
  private analyzeDropIndex(operation: ParsedSqlOperation, ast: any): SqlOperationAnalysis {
    const isConcurrent = ast.options?.includes('CONCURRENTLY') || false;
    
    return {
      operation,
      columns: [],
      indexes: [],
      constraints: [],
      dependencies: [],
      complexity: 'LOW',
      estimatedExecutionTime: isConcurrent ? 10000 : 1000, // 10s concurrent, 1s blocking
      memoryUsage: 'LOW',
      lockScope: isConcurrent ? 'NONE' : 'TABLE'
    };
  }

  /**
   * Analyze generic operation without specific handlers
   */
  private analyzeGenericOperation(operation: ParsedSqlOperation, ast: any): SqlOperationAnalysis {
    return {
      operation,
      columns: [],
      indexes: [],
      constraints: [],
      dependencies: [],
      complexity: operation.metadata.isDestructive ? 'HIGH' : 'MEDIUM',
      estimatedExecutionTime: this.estimateGenericOperationTime(operation),
      memoryUsage: 'MEDIUM',
      lockScope: operation.metadata.requiresLock ? 'TABLE' : 'ROW'
    };
  }

  /**
   * Analyze operation without AST
   */
  private analyzeWithoutAst(operation: ParsedSqlOperation): SqlOperationAnalysis {
    return {
      operation,
      columns: [],
      indexes: [],
      constraints: [],
      dependencies: [],
      complexity: operation.metadata.isDestructive ? 'HIGH' : operation.metadata.isBlocking ? 'MEDIUM' : 'LOW',
      estimatedExecutionTime: this.estimateGenericOperationTime(operation),
      memoryUsage: operation.metadata.isBlocking ? 'MEDIUM' : 'LOW',
      lockScope: operation.metadata.requiresLock ? 'TABLE' : operation.metadata.affectsData ? 'ROW' : 'NONE'
    };
  }

  /**
   * Extract column definitions from CREATE TABLE AST
   */
  private extractColumns(ast: any): ColumnDefinition[] {
    if (!ast.create_definitions) return [];

    return ast.create_definitions
      .filter((def: any) => def.resource === 'column')
      .map((colDef: any) => ({
        name: colDef.column?.column || colDef.column,
        type: this.extractColumnType(colDef.definition),
        nullable: colDef.definition?.nullable !== false,
        primaryKey: colDef.definition?.primary_key === true,
        unique: colDef.definition?.unique === true,
        autoIncrement: colDef.definition?.auto_increment === true,
        defaultValue: colDef.definition?.default_val?.value
      }));
  }

  /**
   * Extract column type from definition
   */  
  private extractColumnType(definition: any): string {
    if (!definition?.dataType) return 'UNKNOWN';
    
    let type = definition.dataType;
    if (definition.length) {
      type += `(${definition.length.join(',')})`;
    }
    return type.toUpperCase();
  }

  /**
   * Extract constraints from table definition
   */
  private extractConstraints(ast: any, tableName: string): ConstraintDefinition[] {
    const constraints: ConstraintDefinition[] = [];

    if (!ast.create_definitions) return constraints;

    for (const def of ast.create_definitions) {
      if (def.resource === 'constraint') {
        const constraint: ConstraintDefinition = {
          name: def.constraint,
          type: this.mapConstraintType(def.constraint_type),
          columns: def.definition?.column?.map((col: any) => col.column) || [],
          tableName
        };

        if (def.definition?.reference_definition) {
          constraint.referencedTable = def.definition.reference_definition.table;
          constraint.referencedColumns = def.definition.reference_definition.column?.map((col: any) => col.column) || [];
          constraint.onDelete = def.definition.reference_definition.on_delete;
          constraint.onUpdate = def.definition.reference_definition.on_update;
        }

        constraints.push(constraint);
      }
    }

    return constraints;
  }

  /**
   * Map AST constraint type to our enum
   */
  private mapConstraintType(constraintType: string): ConstraintDefinition['type'] {
    switch (constraintType?.toLowerCase()) {
      case 'primary key': return 'PRIMARY_KEY';
      case 'foreign key': return 'FOREIGN_KEY';
      case 'unique': return 'UNIQUE';
      case 'check': return 'CHECK';
      default: return 'CHECK';
    }
  }

  /**
   * Extract table dependencies (foreign keys, references)
   */
  private extractTableDependencies(ast: any, tableName: string): TableDependency[] {
    const dependencies: TableDependency[] = [];

    if (ast.create_definitions) {
      for (const def of ast.create_definitions) {
        if (def.resource === 'constraint' && def.constraint_type === 'FOREIGN KEY') {
          const refDef = def.definition?.reference_definition;
          if (refDef) {
            dependencies.push({
              sourceTable: tableName,
              targetTable: refDef.table,
              type: 'FOREIGN_KEY',
              columns: def.definition?.column?.map((col: any) => col.column) || [],
              referencedColumns: refDef.column?.map((col: any) => col.column) || []
            });
          }
        }
      }
    }

    return dependencies;
  }

  /**
   * Extract index definition from CREATE INDEX AST
   */
  private extractIndexDefinition(ast: any, tableName: string): IndexDefinition | null {
    if (!ast.index || !ast.on) return null;

    return {
      name: ast.index,
      columns: ast.definition?.map((col: any) => col.column) || [],
      unique: ast.unique === true,
      type: ast.using || 'btree',
      tableName: ast.table || tableName,
      concurrent: ast.options?.includes('CONCURRENTLY') || false
    };
  }

  /**
   * Identify dependencies between operations
   */
  private identifyOperationDependencies(analyses: SqlOperationAnalysis[]): OperationDependency[] {
    const dependencies: OperationDependency[] = [];

    for (let i = 0; i < analyses.length; i++) {
      const current = analyses[i];
      const dependsOn: SqlOperationAnalysis[] = [];

      // Check for table creation dependencies
      if (current.operation.type === 'ALTER_TABLE' || current.operation.type === 'CREATE_INDEX') {
        const createTableOp = analyses.find(a => 
          a.operation.type === 'CREATE_TABLE' && 
          a.operation.tableName === current.operation.tableName
        );
        if (createTableOp) {
          dependsOn.push(createTableOp);
        }
      }

      // Check for foreign key dependencies
      for (const dep of current.dependencies) {
        if (dep.type === 'FOREIGN_KEY') {
          const targetTableOp = analyses.find(a => 
            a.operation.type === 'CREATE_TABLE' && 
            a.operation.tableName === dep.targetTable
          );
          if (targetTableOp) {
            dependsOn.push(targetTableOp);
          }
        }
      }

      if (dependsOn.length > 0) {
        dependencies.push({
          operation: current.operation,
          dependsOn: dependsOn.map(d => d.operation),
          dependencyType: 'TABLE_CREATION',
          reason: `Operation depends on table creation: ${dependsOn.map(d => d.operation.tableName).join(', ')}`
        });
      }
    }

    return dependencies;
  }

  /**
   * Calculate total complexity of all operations
   */
  private calculateTotalComplexity(analyses: SqlOperationAnalysis[]): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const complexityScores = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    const totalScore = analyses.reduce((sum, analysis) => sum + complexityScores[analysis.complexity], 0);
    const avgScore = totalScore / analyses.length;

    if (avgScore >= 3.5) return 'CRITICAL';
    if (avgScore >= 2.5) return 'HIGH';
    if (avgScore >= 1.5) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Identify risk factors in the migration
   */
  private identifyRiskFactors(analyses: SqlOperationAnalysis[]): string[] {
    const risks: string[] = [];

    const destructiveOps = analyses.filter(a => a.operation.metadata.isDestructive);
    if (destructiveOps.length > 0) {
      risks.push(`${destructiveOps.length} destructive operations that may cause data loss`);
    }

    const blockingOps = analyses.filter(a => a.operation.metadata.isBlocking);
    if (blockingOps.length > 0) {
      risks.push(`${blockingOps.length} blocking operations that may cause downtime`);
    }

    const criticalOps = analyses.filter(a => a.complexity === 'CRITICAL');
    if (criticalOps.length > 0) {
      risks.push(`${criticalOps.length} critical complexity operations requiring careful monitoring`);
    }

    const longRunningOps = analyses.filter(a => a.estimatedExecutionTime > 30000);
    if (longRunningOps.length > 0) {
      risks.push(`${longRunningOps.length} long-running operations (>30 seconds)`);
    }

    return risks;
  }

  /**
   * Generate recommendations based on analysis
   */
  private generateRecommendations(analyses: SqlOperationAnalysis[], dependencies: OperationDependency[]): string[] {
    const recommendations: string[] = [];

    // Recommend concurrent index creation
    const indexOps = analyses.filter(a => a.operation.type === 'CREATE_INDEX');
    if (indexOps.length > 0) {
      recommendations.push('Use CONCURRENT index creation to avoid blocking other operations');
    }

    // Recommend batching for large operations
    const complexOps = analyses.filter(a => a.complexity === 'HIGH' || a.complexity === 'CRITICAL');
    if (complexOps.length > 3) {
      recommendations.push('Consider batching complex operations across multiple migration steps');
    }

    // Recommend maintenance window for blocking operations
    const blockingOps = analyses.filter(a => a.operation.metadata.isBlocking);
    if (blockingOps.length > 0) {
      recommendations.push('Schedule blocking operations during maintenance windows');
    }

    // Recommend backup before destructive operations
    const destructiveOps = analyses.filter(a => a.operation.metadata.isDestructive);
    if (destructiveOps.length > 0) {
      recommendations.push('Create database backup before executing destructive operations');
    }

    // Recommend dependency ordering
    if (dependencies.length > 0) {
      recommendations.push('Execute operations in dependency order to avoid failures');
    }

    return recommendations;
  }

  /**
   * Estimate CREATE TABLE execution time
   */
  private estimateCreateTableTime(columnCount: number, constraintCount: number): number {
    const baseTime = 500; // Base 0.5 seconds
    const columnTime = columnCount * 50; // 50ms per column
    const constraintTime = constraintCount * 200; // 200ms per constraint
    return baseTime + columnTime + constraintTime;
  }

  /**
   * Estimate generic operation execution time
   */
  private estimateGenericOperationTime(operation: ParsedSqlOperation): number {
    switch (operation.metadata.estimatedDuration) {
      case 'fast': return 500;
      case 'medium': return 2000;
      case 'slow': return 10000;
      default: return 1000;
    }
  }
} 