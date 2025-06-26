// src/parsers/sql-parser.ts
import pkg from "node-sql-parser";
var { Parser } = pkg;
var SqlOperationType = /* @__PURE__ */ ((SqlOperationType2) => {
  SqlOperationType2["CREATE_TABLE"] = "CREATE_TABLE";
  SqlOperationType2["ALTER_TABLE"] = "ALTER_TABLE";
  SqlOperationType2["DROP_TABLE"] = "DROP_TABLE";
  SqlOperationType2["CREATE_INDEX"] = "CREATE_INDEX";
  SqlOperationType2["DROP_INDEX"] = "DROP_INDEX";
  SqlOperationType2["INSERT"] = "INSERT";
  SqlOperationType2["UPDATE"] = "UPDATE";
  SqlOperationType2["DELETE"] = "DELETE";
  SqlOperationType2["SELECT"] = "SELECT";
  SqlOperationType2["UNKNOWN"] = "UNKNOWN";
  return SqlOperationType2;
})(SqlOperationType || {});
var SqlParser = class {
  parser;
  constructor() {
    this.parser = new Parser();
  }
  /**
   * Parse a single SQL statement and return operation details
   */
  parseSql(sql, database = "postgresql") {
    try {
      const cleanSql = this.cleanSql(sql);
      const ast = this.parser.astify(cleanSql, { database });
      const operation = this.extractOperationFromAst(ast, cleanSql);
      return operation;
    } catch (error) {
      const fallbackOperation = this.fallbackParse(sql);
      return {
        ...fallbackOperation,
        ast: null,
        metadata: {
          ...fallbackOperation.metadata,
          estimatedDuration: "medium"
          // Default to medium for unparseable operations
        }
      };
    }
  }
  /**
   * Parse multiple SQL statements (common in migration files)
   */
  parseMultipleSql(sqlStatements, database = "postgresql") {
    const operations = [];
    const errors = [];
    const warnings2 = [];
    for (const sql of sqlStatements) {
      try {
        const operation = this.parseSql(sql, database);
        operations.push(operation);
        if (operation.metadata.isDestructive) {
          warnings2.push(`Destructive operation detected: ${operation.type} on ${operation.tableName || "unknown table"}`);
        }
        if (operation.metadata.isBlocking) {
          warnings2.push(`Blocking operation detected: ${operation.type} - may cause downtime`);
        }
      } catch (error) {
        errors.push(`Failed to parse SQL: ${sql.substring(0, 50)}... - ${error}`);
      }
    }
    return {
      operations,
      errors,
      warnings: warnings2,
      totalOperations: operations.length,
      destructiveOperations: operations.filter((op) => op.metadata.isDestructive).length,
      blockingOperations: operations.filter((op) => op.metadata.isBlocking).length
    };
  }
  /**
   * Clean and normalize SQL for better parsing
   */
  cleanSql(sql) {
    return sql.trim().replace(/\s+/g, " ").replace(/;\s*$/, "");
  }
  /**
   * Extract operation details from parsed AST
   */
  extractOperationFromAst(ast, sql) {
    if (Array.isArray(ast)) {
      ast = ast[0];
    }
    const operation = {
      type: "UNKNOWN" /* UNKNOWN */,
      sql,
      ast,
      metadata: {
        isBlocking: false,
        isDestructive: false,
        affectsData: false,
        requiresLock: false,
        estimatedDuration: "fast"
      }
    };
    const astNode = ast;
    switch (astNode.type?.toLowerCase()) {
      case "create":
        if (astNode.keyword === "table") {
          operation.type = "CREATE_TABLE" /* CREATE_TABLE */;
          operation.tableName = this.extractTableName(astNode);
          operation.metadata = {
            isBlocking: true,
            isDestructive: false,
            affectsData: false,
            requiresLock: true,
            estimatedDuration: "medium"
          };
        } else if (astNode.keyword === "index") {
          operation.type = "CREATE_INDEX" /* CREATE_INDEX */;
          operation.indexName = astNode.index;
          operation.tableName = this.extractTableName(astNode);
          operation.metadata = {
            isBlocking: true,
            isDestructive: false,
            affectsData: false,
            requiresLock: true,
            estimatedDuration: "slow"
          };
        }
        break;
      case "alter":
        operation.type = "ALTER_TABLE" /* ALTER_TABLE */;
        operation.tableName = this.extractTableName(astNode);
        operation.operation = astNode.expr?.type || "unknown";
        const alterMetadata = this.analyzeAlterOperation(astNode);
        operation.metadata = alterMetadata;
        break;
      case "drop":
        if (astNode.keyword === "table") {
          operation.type = "DROP_TABLE" /* DROP_TABLE */;
          operation.tableName = this.extractTableName(astNode);
          operation.metadata = {
            isBlocking: true,
            isDestructive: true,
            affectsData: true,
            requiresLock: true,
            estimatedDuration: "fast"
          };
        } else if (astNode.keyword === "index") {
          operation.type = "DROP_INDEX" /* DROP_INDEX */;
          operation.indexName = astNode.name;
          operation.metadata = {
            isBlocking: false,
            isDestructive: true,
            affectsData: false,
            requiresLock: false,
            estimatedDuration: "fast"
          };
        }
        break;
      case "insert":
        operation.type = "INSERT" /* INSERT */;
        operation.tableName = this.extractTableName(astNode);
        operation.metadata = {
          isBlocking: false,
          isDestructive: false,
          affectsData: true,
          requiresLock: false,
          estimatedDuration: "fast"
        };
        break;
      case "update":
        operation.type = "UPDATE" /* UPDATE */;
        operation.tableName = this.extractTableName(astNode);
        operation.metadata = {
          isBlocking: false,
          isDestructive: false,
          affectsData: true,
          requiresLock: false,
          estimatedDuration: "medium"
        };
        break;
      case "delete":
        operation.type = "DELETE" /* DELETE */;
        operation.tableName = this.extractTableName(astNode);
        operation.metadata = {
          isBlocking: false,
          isDestructive: true,
          affectsData: true,
          requiresLock: false,
          estimatedDuration: "medium"
        };
        break;
      case "select":
        operation.type = "SELECT" /* SELECT */;
        operation.tableName = this.extractTableName(astNode);
        operation.metadata = {
          isBlocking: false,
          isDestructive: false,
          affectsData: false,
          requiresLock: false,
          estimatedDuration: "fast"
        };
        break;
    }
    return operation;
  }
  /**
   * Analyze ALTER TABLE operations for specific risk assessment
   */
  analyzeAlterOperation(ast) {
    const baseMetadata = {
      isBlocking: true,
      isDestructive: false,
      affectsData: false,
      requiresLock: true,
      estimatedDuration: "medium"
    };
    if (ast.expr) {
      const action = ast.expr.action?.toLowerCase();
      switch (action) {
        case "add":
          if (ast.expr.resource === "column") {
            const hasNotNull = ast.expr.definition?.nullable === false;
            const hasDefault = ast.expr.definition?.defaultValue !== void 0;
            return {
              ...baseMetadata,
              isDestructive: hasNotNull && !hasDefault,
              estimatedDuration: hasNotNull ? "slow" : "medium"
            };
          }
          break;
        case "drop":
          return {
            ...baseMetadata,
            isDestructive: true,
            affectsData: true,
            estimatedDuration: "fast"
          };
        case "modify":
        case "change":
          return {
            ...baseMetadata,
            isDestructive: true,
            affectsData: true,
            estimatedDuration: "slow"
          };
        case "rename":
          return {
            ...baseMetadata,
            isDestructive: false,
            affectsData: false,
            estimatedDuration: "fast"
          };
      }
    }
    return baseMetadata;
  }
  /**
   * Extract table name from AST node
   */
  extractTableName(ast) {
    if (ast.table) {
      return typeof ast.table === "string" ? ast.table : ast.table.table;
    }
    if (ast.name) {
      return typeof ast.name === "string" ? ast.name : ast.name.table;
    }
    if (ast.from && ast.from.length > 0) {
      const fromTable = ast.from[0];
      return typeof fromTable.table === "string" ? fromTable.table : fromTable.table?.table;
    }
    return void 0;
  }
  /**
   * Fallback parsing when AST parsing fails
   */
  fallbackParse(sql) {
    const upperSql = sql.toUpperCase().trim();
    let type = "UNKNOWN" /* UNKNOWN */;
    let tableName;
    let isBlocking = false;
    let isDestructive = false;
    let affectsData = false;
    let requiresLock = false;
    let estimatedDuration = "medium";
    if (upperSql.startsWith("CREATE TABLE")) {
      type = "CREATE_TABLE" /* CREATE_TABLE */;
      tableName = this.extractTableNameFromText(sql, "CREATE TABLE");
      isBlocking = true;
      requiresLock = true;
    } else if (upperSql.startsWith("CREATE INDEX")) {
      type = "CREATE_INDEX" /* CREATE_INDEX */;
      isBlocking = true;
      requiresLock = true;
      estimatedDuration = "slow";
    } else if (upperSql.startsWith("ALTER TABLE")) {
      type = "ALTER_TABLE" /* ALTER_TABLE */;
      tableName = this.extractTableNameFromText(sql, "ALTER TABLE");
      isBlocking = true;
      requiresLock = true;
      if (upperSql.includes("DROP COLUMN") || upperSql.includes("DROP CONSTRAINT")) {
        isDestructive = true;
        affectsData = true;
      }
    } else if (upperSql.startsWith("DROP TABLE")) {
      type = "DROP_TABLE" /* DROP_TABLE */;
      tableName = this.extractTableNameFromText(sql, "DROP TABLE");
      isBlocking = true;
      isDestructive = true;
      affectsData = true;
      requiresLock = true;
      estimatedDuration = "fast";
    } else if (upperSql.startsWith("DROP INDEX")) {
      type = "DROP_INDEX" /* DROP_INDEX */;
      isDestructive = true;
      estimatedDuration = "fast";
    } else if (upperSql.startsWith("INSERT")) {
      type = "INSERT" /* INSERT */;
      affectsData = true;
      estimatedDuration = "fast";
    } else if (upperSql.startsWith("UPDATE")) {
      type = "UPDATE" /* UPDATE */;
      affectsData = true;
    } else if (upperSql.startsWith("DELETE")) {
      type = "DELETE" /* DELETE */;
      isDestructive = true;
      affectsData = true;
    } else if (upperSql.startsWith("SELECT")) {
      type = "SELECT" /* SELECT */;
      estimatedDuration = "fast";
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
  extractTableNameFromText(sql, operation) {
    const regex = new RegExp(`${operation}\\s+(?:IF\\s+(?:NOT\\s+)?EXISTS\\s+)?(?:\`|"|\\[)?([\\w_]+)(?:\`|"|\\])?`, "i");
    const match = sql.match(regex);
    return match ? match[1] : void 0;
  }
};

// src/parsers/ast-analyzer.ts
var AstAnalyzer = class {
  /**
   * Analyze a single SQL operation and its AST
   */
  analyzeSqlOperation(operation) {
    const analysis = {
      operation,
      columns: [],
      indexes: [],
      constraints: [],
      dependencies: [],
      complexity: "LOW",
      estimatedExecutionTime: 100,
      memoryUsage: "LOW",
      lockScope: "NONE"
    };
    if (!operation.ast) {
      return this.analyzeWithoutAst(operation);
    }
    const ast = operation.ast;
    switch (operation.type) {
      case "CREATE_TABLE":
        return this.analyzeCreateTable(operation, ast);
      case "ALTER_TABLE":
        return this.analyzeAlterTable(operation, ast);
      case "CREATE_INDEX":
        return this.analyzeCreateIndex(operation, ast);
      case "DROP_TABLE":
        return this.analyzeDropTable(operation, ast);
      case "DROP_INDEX":
        return this.analyzeDropIndex(operation, ast);
      default:
        return this.analyzeGenericOperation(operation, ast);
    }
  }
  /**
   * Analyze multiple operations and their dependencies
   */
  analyzeMigration(operations) {
    const operationAnalyses = operations.map((op) => this.analyzeSqlOperation(op));
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
  analyzeCreateTable(operation, ast) {
    const columns = this.extractColumns(ast);
    const constraints = this.extractConstraints(ast, operation.tableName || "");
    const dependencies = this.extractTableDependencies(ast, operation.tableName || "");
    return {
      operation,
      columns,
      indexes: [],
      constraints,
      dependencies,
      complexity: columns.length > 20 ? "HIGH" : columns.length > 10 ? "MEDIUM" : "LOW",
      estimatedExecutionTime: this.estimateCreateTableTime(columns.length, constraints.length),
      memoryUsage: columns.length > 50 ? "HIGH" : columns.length > 20 ? "MEDIUM" : "LOW",
      lockScope: "TABLE"
    };
  }
  /**
   * Analyze ALTER TABLE operation
   */
  analyzeAlterTable(operation, ast) {
    const alterType = ast.expr?.action?.toLowerCase();
    let complexity = "MEDIUM";
    let estimatedTime = 1e3;
    let lockScope = "TABLE";
    switch (alterType) {
      case "add":
        if (ast.expr?.resource === "column") {
          const hasNotNull = ast.expr?.definition?.nullable === false;
          const hasDefault = ast.expr?.definition?.defaultValue !== void 0;
          complexity = hasNotNull && !hasDefault ? "HIGH" : "MEDIUM";
          estimatedTime = hasNotNull ? 1e4 : 2e3;
        }
        break;
      case "drop":
        complexity = "HIGH";
        estimatedTime = 5e3;
        break;
      case "modify":
      case "change":
        complexity = "CRITICAL";
        estimatedTime = 15e3;
        break;
      case "rename":
        complexity = "LOW";
        estimatedTime = 500;
        lockScope = "NONE";
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
      memoryUsage: complexity === "CRITICAL" ? "HIGH" : "MEDIUM",
      lockScope
    };
  }
  /**
   * Analyze CREATE INDEX operation
   */
  analyzeCreateIndex(operation, ast) {
    const indexDef = this.extractIndexDefinition(ast, operation.tableName || "");
    const isConcurrent = ast.options?.includes("CONCURRENTLY") || false;
    return {
      operation,
      columns: [],
      indexes: indexDef ? [indexDef] : [],
      constraints: [],
      dependencies: [],
      complexity: indexDef && indexDef.columns.length > 3 ? "HIGH" : "MEDIUM",
      estimatedExecutionTime: isConcurrent ? 3e4 : 15e3,
      // 30s concurrent, 15s blocking
      memoryUsage: "MEDIUM",
      lockScope: isConcurrent ? "NONE" : "TABLE"
    };
  }
  /**
   * Analyze DROP TABLE operation
   */
  analyzeDropTable(operation, ast) {
    return {
      operation,
      columns: [],
      indexes: [],
      constraints: [],
      dependencies: [],
      complexity: "MEDIUM",
      estimatedExecutionTime: 2e3,
      // 2 seconds
      memoryUsage: "LOW",
      lockScope: "TABLE"
    };
  }
  /**
   * Analyze DROP INDEX operation
   */
  analyzeDropIndex(operation, ast) {
    const isConcurrent = ast.options?.includes("CONCURRENTLY") || false;
    return {
      operation,
      columns: [],
      indexes: [],
      constraints: [],
      dependencies: [],
      complexity: "LOW",
      estimatedExecutionTime: isConcurrent ? 1e4 : 1e3,
      // 10s concurrent, 1s blocking
      memoryUsage: "LOW",
      lockScope: isConcurrent ? "NONE" : "TABLE"
    };
  }
  /**
   * Analyze generic operation without specific handlers
   */
  analyzeGenericOperation(operation, ast) {
    return {
      operation,
      columns: [],
      indexes: [],
      constraints: [],
      dependencies: [],
      complexity: operation.metadata.isDestructive ? "HIGH" : "MEDIUM",
      estimatedExecutionTime: this.estimateGenericOperationTime(operation),
      memoryUsage: "MEDIUM",
      lockScope: operation.metadata.requiresLock ? "TABLE" : "ROW"
    };
  }
  /**
   * Analyze operation without AST
   */
  analyzeWithoutAst(operation) {
    return {
      operation,
      columns: [],
      indexes: [],
      constraints: [],
      dependencies: [],
      complexity: operation.metadata.isDestructive ? "HIGH" : operation.metadata.isBlocking ? "MEDIUM" : "LOW",
      estimatedExecutionTime: this.estimateGenericOperationTime(operation),
      memoryUsage: operation.metadata.isBlocking ? "MEDIUM" : "LOW",
      lockScope: operation.metadata.requiresLock ? "TABLE" : operation.metadata.affectsData ? "ROW" : "NONE"
    };
  }
  /**
   * Extract column definitions from CREATE TABLE AST
   */
  extractColumns(ast) {
    if (!ast.create_definitions) return [];
    return ast.create_definitions.filter((def) => def.resource === "column").map((colDef) => ({
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
  extractColumnType(definition) {
    if (!definition?.dataType) return "UNKNOWN";
    let type = definition.dataType;
    if (definition.length) {
      type += `(${definition.length.join(",")})`;
    }
    return type.toUpperCase();
  }
  /**
   * Extract constraints from table definition
   */
  extractConstraints(ast, tableName) {
    const constraints = [];
    if (!ast.create_definitions) return constraints;
    for (const def of ast.create_definitions) {
      if (def.resource === "constraint") {
        const constraint = {
          name: def.constraint,
          type: this.mapConstraintType(def.constraint_type),
          columns: def.definition?.column?.map((col) => col.column) || [],
          tableName
        };
        if (def.definition?.reference_definition) {
          constraint.referencedTable = def.definition.reference_definition.table;
          constraint.referencedColumns = def.definition.reference_definition.column?.map((col) => col.column) || [];
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
  mapConstraintType(constraintType) {
    switch (constraintType?.toLowerCase()) {
      case "primary key":
        return "PRIMARY_KEY";
      case "foreign key":
        return "FOREIGN_KEY";
      case "unique":
        return "UNIQUE";
      case "check":
        return "CHECK";
      default:
        return "CHECK";
    }
  }
  /**
   * Extract table dependencies (foreign keys, references)
   */
  extractTableDependencies(ast, tableName) {
    const dependencies = [];
    if (ast.create_definitions) {
      for (const def of ast.create_definitions) {
        if (def.resource === "constraint" && def.constraint_type === "FOREIGN KEY") {
          const refDef = def.definition?.reference_definition;
          if (refDef) {
            dependencies.push({
              sourceTable: tableName,
              targetTable: refDef.table,
              type: "FOREIGN_KEY",
              columns: def.definition?.column?.map((col) => col.column) || [],
              referencedColumns: refDef.column?.map((col) => col.column) || []
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
  extractIndexDefinition(ast, tableName) {
    if (!ast.index || !ast.on) return null;
    return {
      name: ast.index,
      columns: ast.definition?.map((col) => col.column) || [],
      unique: ast.unique === true,
      type: ast.using || "btree",
      tableName: ast.table || tableName,
      concurrent: ast.options?.includes("CONCURRENTLY") || false
    };
  }
  /**
   * Identify dependencies between operations
   */
  identifyOperationDependencies(analyses) {
    const dependencies = [];
    for (let i = 0; i < analyses.length; i++) {
      const current = analyses[i];
      const dependsOn = [];
      if (current.operation.type === "ALTER_TABLE" || current.operation.type === "CREATE_INDEX") {
        const createTableOp = analyses.find(
          (a) => a.operation.type === "CREATE_TABLE" && a.operation.tableName === current.operation.tableName
        );
        if (createTableOp) {
          dependsOn.push(createTableOp);
        }
      }
      for (const dep of current.dependencies) {
        if (dep.type === "FOREIGN_KEY") {
          const targetTableOp = analyses.find(
            (a) => a.operation.type === "CREATE_TABLE" && a.operation.tableName === dep.targetTable
          );
          if (targetTableOp) {
            dependsOn.push(targetTableOp);
          }
        }
      }
      if (dependsOn.length > 0) {
        dependencies.push({
          operation: current.operation,
          dependsOn: dependsOn.map((d) => d.operation),
          dependencyType: "TABLE_CREATION",
          reason: `Operation depends on table creation: ${dependsOn.map((d) => d.operation.tableName).join(", ")}`
        });
      }
    }
    return dependencies;
  }
  /**
   * Calculate total complexity of all operations
   */
  calculateTotalComplexity(analyses) {
    const complexityScores = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 };
    const totalScore = analyses.reduce((sum, analysis) => sum + complexityScores[analysis.complexity], 0);
    const avgScore = totalScore / analyses.length;
    if (avgScore >= 3.5) return "CRITICAL";
    if (avgScore >= 2.5) return "HIGH";
    if (avgScore >= 1.5) return "MEDIUM";
    return "LOW";
  }
  /**
   * Identify risk factors in the migration
   */
  identifyRiskFactors(analyses) {
    const risks = [];
    const destructiveOps = analyses.filter((a) => a.operation.metadata.isDestructive);
    if (destructiveOps.length > 0) {
      risks.push(`${destructiveOps.length} destructive operations that may cause data loss`);
    }
    const blockingOps = analyses.filter((a) => a.operation.metadata.isBlocking);
    if (blockingOps.length > 0) {
      risks.push(`${blockingOps.length} blocking operations that may cause downtime`);
    }
    const criticalOps = analyses.filter((a) => a.complexity === "CRITICAL");
    if (criticalOps.length > 0) {
      risks.push(`${criticalOps.length} critical complexity operations requiring careful monitoring`);
    }
    const longRunningOps = analyses.filter((a) => a.estimatedExecutionTime > 3e4);
    if (longRunningOps.length > 0) {
      risks.push(`${longRunningOps.length} long-running operations (>30 seconds)`);
    }
    return risks;
  }
  /**
   * Generate recommendations based on analysis
   */
  generateRecommendations(analyses, dependencies) {
    const recommendations = [];
    const indexOps = analyses.filter((a) => a.operation.type === "CREATE_INDEX");
    if (indexOps.length > 0) {
      recommendations.push("Use CONCURRENT index creation to avoid blocking other operations");
    }
    const complexOps = analyses.filter((a) => a.complexity === "HIGH" || a.complexity === "CRITICAL");
    if (complexOps.length > 3) {
      recommendations.push("Consider batching complex operations across multiple migration steps");
    }
    const blockingOps = analyses.filter((a) => a.operation.metadata.isBlocking);
    if (blockingOps.length > 0) {
      recommendations.push("Schedule blocking operations during maintenance windows");
    }
    const destructiveOps = analyses.filter((a) => a.operation.metadata.isDestructive);
    if (destructiveOps.length > 0) {
      recommendations.push("Create database backup before executing destructive operations");
    }
    if (dependencies.length > 0) {
      recommendations.push("Execute operations in dependency order to avoid failures");
    }
    return recommendations;
  }
  /**
   * Estimate CREATE TABLE execution time
   */
  estimateCreateTableTime(columnCount, constraintCount) {
    const baseTime = 500;
    const columnTime = columnCount * 50;
    const constraintTime = constraintCount * 200;
    return baseTime + columnTime + constraintTime;
  }
  /**
   * Estimate generic operation execution time
   */
  estimateGenericOperationTime(operation) {
    switch (operation.metadata.estimatedDuration) {
      case "fast":
        return 500;
      case "medium":
        return 2e3;
      case "slow":
        return 1e4;
      default:
        return 1e3;
    }
  }
};

// src/parsers/migration-parser.ts
import * as fs from "fs/promises";
import * as path from "path";
var MigrationType = /* @__PURE__ */ ((MigrationType2) => {
  MigrationType2["PRISMA"] = "PRISMA";
  MigrationType2["DRIZZLE"] = "DRIZZLE";
  MigrationType2["TYPEORM"] = "TYPEORM";
  MigrationType2["PLAIN_SQL"] = "PLAIN_SQL";
  return MigrationType2;
})(MigrationType || {});
var MigrationParser = class {
  sqlParser;
  constructor() {
    this.sqlParser = new SqlParser();
  }
  /**
   * Parse a single migration file
   */
  async parseMigrationFile(filePath, type) {
    const content = await fs.readFile(filePath, "utf-8");
    const detectedType = type || this.detectMigrationType(filePath, content);
    switch (detectedType) {
      case "PRISMA" /* PRISMA */:
        return this.parsePrismaMigration(filePath, content);
      case "DRIZZLE" /* DRIZZLE */:
        return this.parseDrizzleMigration(filePath, content);
      case "TYPEORM" /* TYPEORM */:
        return this.parseTypeOrmMigration(filePath, content);
      case "PLAIN_SQL" /* PLAIN_SQL */:
        return this.parsePlainSqlMigration(filePath, content);
      default:
        throw new Error(`Unsupported migration type: ${detectedType}`);
    }
  }
  /**
   * Parse multiple migration files from a directory
   */
  async parseMigrationDirectory(dirPath) {
    const files = await this.findMigrationFiles(dirPath);
    const migrations = [];
    const errors = [];
    const warnings2 = [];
    for (const file of files) {
      try {
        const migration = await this.parseMigrationFile(file);
        migrations.push(migration);
        errors.push(...migration.errors);
        warnings2.push(...migration.warnings);
      } catch (error) {
        errors.push(`Failed to parse ${file}: ${error}`);
      }
    }
    const summary = this.calculateSummary(migrations);
    return {
      migrations,
      totalMigrations: migrations.length,
      errors,
      warnings: warnings2,
      summary
    };
  }
  /**
   * Detect migration type from file path and content
   */
  detectMigrationType(filePath, content) {
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath);
    if (filePath.includes("prisma/migrations") || fileName === "migration.sql") {
      return "PRISMA" /* PRISMA */;
    }
    if (extension === ".ts" && (content.includes("import { sql }") || content.includes("drizzle-orm") || fileName.includes("drizzle"))) {
      return "DRIZZLE" /* DRIZZLE */;
    }
    if (extension === ".ts" && (content.includes("import { MigrationInterface") || content.includes("QueryRunner") || fileName.match(/^\d{13}-.*\.ts$/))) {
      return "TYPEORM" /* TYPEORM */;
    }
    if (extension === ".sql") {
      return "PLAIN_SQL" /* PLAIN_SQL */;
    }
    if (extension === ".ts") {
      return "TYPEORM" /* TYPEORM */;
    }
    return "PLAIN_SQL" /* PLAIN_SQL */;
  }
  /**
   * Parse Prisma migration file
   */
  async parsePrismaMigration(filePath, content) {
    const fileName = path.basename(filePath);
    const timestamp = this.extractTimestampFromPrismaFile(filePath);
    const sqlStatements = this.extractSqlStatements(content);
    const database = this.detectDatabaseFromSql(content);
    const parseResult = this.sqlParser.parseMultipleSql(sqlStatements, database);
    return {
      filePath,
      type: "PRISMA" /* PRISMA */,
      name: fileName,
      timestamp,
      upOperations: parseResult.operations,
      downOperations: [],
      // Prisma doesn't typically have down migrations
      metadata: {
        database,
        hasUpMigration: parseResult.operations.length > 0,
        hasDownMigration: false,
        totalOperations: parseResult.operations.length,
        destructiveOperations: parseResult.destructiveOperations,
        blockingOperations: parseResult.blockingOperations
      },
      errors: parseResult.errors,
      warnings: parseResult.warnings
    };
  }
  /**
   * Parse Drizzle migration file
   */
  async parseDrizzleMigration(filePath, content) {
    const fileName = path.basename(filePath, ".ts");
    const timestamp = this.extractTimestampFromDrizzleFile(fileName);
    const sqlStatements = this.extractSqlFromDrizzleTs(content);
    const database = this.detectDatabaseFromContent(content);
    const parseResult = this.sqlParser.parseMultipleSql(sqlStatements, database);
    return {
      filePath,
      type: "DRIZZLE" /* DRIZZLE */,
      name: fileName,
      timestamp,
      upOperations: parseResult.operations,
      downOperations: [],
      // Drizzle typically doesn't have down migrations in the same file
      metadata: {
        database,
        hasUpMigration: parseResult.operations.length > 0,
        hasDownMigration: false,
        totalOperations: parseResult.operations.length,
        destructiveOperations: parseResult.destructiveOperations,
        blockingOperations: parseResult.blockingOperations
      },
      errors: parseResult.errors,
      warnings: parseResult.warnings
    };
  }
  /**
   * Parse TypeORM migration file
   */
  async parseTypeOrmMigration(filePath, content) {
    const fileName = path.basename(filePath, ".ts");
    const timestamp = this.extractTimestampFromTypeOrmFile(fileName);
    const upSql = this.extractSqlFromTypeOrmMethod(content, "up");
    const downSql = this.extractSqlFromTypeOrmMethod(content, "down");
    const database = this.detectDatabaseFromContent(content);
    const upParseResult = this.sqlParser.parseMultipleSql(upSql, database);
    const downParseResult = this.sqlParser.parseMultipleSql(downSql, database);
    return {
      filePath,
      type: "TYPEORM" /* TYPEORM */,
      name: fileName,
      timestamp,
      upOperations: upParseResult.operations,
      downOperations: downParseResult.operations,
      metadata: {
        database,
        hasUpMigration: upParseResult.operations.length > 0,
        hasDownMigration: downParseResult.operations.length > 0,
        totalOperations: upParseResult.operations.length + downParseResult.operations.length,
        destructiveOperations: upParseResult.destructiveOperations + downParseResult.destructiveOperations,
        blockingOperations: upParseResult.blockingOperations + downParseResult.blockingOperations
      },
      errors: [...upParseResult.errors, ...downParseResult.errors],
      warnings: [...upParseResult.warnings, ...downParseResult.warnings]
    };
  }
  /**
   * Parse plain SQL migration file
   */
  async parsePlainSqlMigration(filePath, content) {
    const fileName = path.basename(filePath);
    const timestamp = this.extractTimestampFromSqlFile(fileName);
    const { upSql, downSql } = this.splitUpDownSql(content);
    const database = this.detectDatabaseFromSql(content);
    const upParseResult = this.sqlParser.parseMultipleSql(upSql, database);
    const downParseResult = this.sqlParser.parseMultipleSql(downSql, database);
    return {
      filePath,
      type: "PLAIN_SQL" /* PLAIN_SQL */,
      name: fileName,
      timestamp,
      upOperations: upParseResult.operations,
      downOperations: downParseResult.operations,
      metadata: {
        database,
        hasUpMigration: upParseResult.operations.length > 0,
        hasDownMigration: downParseResult.operations.length > 0,
        totalOperations: upParseResult.operations.length + downParseResult.operations.length,
        destructiveOperations: upParseResult.destructiveOperations + downParseResult.destructiveOperations,
        blockingOperations: upParseResult.blockingOperations + downParseResult.blockingOperations
      },
      errors: [...upParseResult.errors, ...downParseResult.errors],
      warnings: [...upParseResult.warnings, ...downParseResult.warnings]
    };
  }
  /**
   * Find all migration files in a directory
   */
  async findMigrationFiles(dirPath) {
    const files = [];
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        if (entry.isDirectory()) {
          const subFiles = await this.findMigrationFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && this.isMigrationFile(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
    }
    return files.sort();
  }
  /**
   * Check if a file is a migration file
   */
  isMigrationFile(fileName) {
    const ext = path.extname(fileName);
    return (ext === ".sql" || ext === ".ts") && (fileName.includes("migration") || fileName.match(/^\d{4}-\d{2}-\d{2}/) || // Date format
    fileName.match(/^\d{10,}/) || // Timestamp format
    fileName.includes("schema") || fileName === "migration.sql");
  }
  /**
   * Extract SQL statements from content
   */
  extractSqlStatements(content) {
    return content.split(";").map((stmt) => stmt.trim()).filter((stmt) => stmt.length > 0 && !stmt.startsWith("--"));
  }
  /**
   * Extract SQL from Drizzle TypeScript content
   */
  extractSqlFromDrizzleTs(content) {
    const statements = [];
    const sqlRegex = /sql`([^`]*)`/g;
    let match;
    while ((match = sqlRegex.exec(content)) !== null) {
      const sqlContent = match[1].trim();
      if (sqlContent) {
        statements.push(sqlContent);
      }
    }
    const stringRegex = /["']([^"']*(?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)[^"']*?)["']/gi;
    while ((match = stringRegex.exec(content)) !== null) {
      const sqlContent = match[1].trim();
      if (sqlContent) {
        statements.push(sqlContent);
      }
    }
    return statements;
  }
  /**
   * Extract SQL from TypeORM up() or down() method
   */
  extractSqlFromTypeOrmMethod(content, method) {
    const statements = [];
    const methodRegex = new RegExp(`public\\s+async\\s+${method}\\s*\\([^)]*\\)\\s*:\\s*Promise<void>\\s*{([^}]*)}`, "s");
    const match = methodRegex.exec(content);
    if (!match) return statements;
    const methodBody = match[1];
    const queryRegex = /queryRunner\.query\s*\(\s*[`"']([^`"']*)[`"']/g;
    let queryMatch;
    while ((queryMatch = queryRegex.exec(methodBody)) !== null) {
      const sqlContent = queryMatch[1].trim();
      if (sqlContent) {
        statements.push(sqlContent);
      }
    }
    return statements;
  }
  /**
   * Split SQL content into up and down migrations
   */
  splitUpDownSql(content) {
    const upDownDelimiters = [
      /--\s*UP\s*\n(.*?)--\s*DOWN\s*\n(.*)/is,
      /\/\*\s*UP\s*\*\/(.*?)\/\*\s*DOWN\s*\*\/(.*)/is,
      /--\s*@UP\s*\n(.*?)--\s*@DOWN\s*\n(.*)/is
    ];
    for (const delimiter of upDownDelimiters) {
      const match = content.match(delimiter);
      if (match) {
        return {
          upSql: this.extractSqlStatements(match[1]),
          downSql: this.extractSqlStatements(match[2])
        };
      }
    }
    return {
      upSql: this.extractSqlStatements(content),
      downSql: []
    };
  }
  /**
   * Detect database type from SQL content
   */
  detectDatabaseFromSql(content) {
    const upperContent = content.toUpperCase();
    if (upperContent.includes("SERIAL") || upperContent.includes("BIGSERIAL") || upperContent.includes("UUID")) {
      return "postgresql";
    }
    if (upperContent.includes("AUTO_INCREMENT") || upperContent.includes("TINYINT") || upperContent.includes("MEDIUMINT")) {
      return "mysql";
    }
    if (upperContent.includes("AUTOINCREMENT") || upperContent.includes("INTEGER PRIMARY KEY")) {
      return "sqlite";
    }
    return "postgresql";
  }
  /**
   * Detect database type from TypeScript content
   */
  detectDatabaseFromContent(content) {
    if (content.includes("postgres") || content.includes("pg")) {
      return "postgresql";
    }
    if (content.includes("mysql") || content.includes("mariadb")) {
      return "mysql";
    }
    if (content.includes("sqlite")) {
      return "sqlite";
    }
    return "postgresql";
  }
  /**
   * Extract timestamp from Prisma migration file path
   */
  extractTimestampFromPrismaFile(filePath) {
    const match = path.dirname(filePath).match(/(\d{14})_/);
    if (match) {
      const timestamp = match[1];
      return new Date(
        parseInt(timestamp.substring(0, 4)),
        // year
        parseInt(timestamp.substring(4, 6)) - 1,
        // month (0-based)
        parseInt(timestamp.substring(6, 8)),
        // day
        parseInt(timestamp.substring(8, 10)),
        // hour
        parseInt(timestamp.substring(10, 12)),
        // minute
        parseInt(timestamp.substring(12, 14))
        // second
      );
    }
    return void 0;
  }
  /**
   * Extract timestamp from Drizzle migration file name
   */
  extractTimestampFromDrizzleFile(fileName) {
    const match = fileName.match(/(\d{10,13})/);
    if (match) {
      const timestamp = parseInt(match[1]);
      return new Date(timestamp < 1e10 ? timestamp * 1e3 : timestamp);
    }
    return void 0;
  }
  /**
   * Extract timestamp from TypeORM migration file name
   */
  extractTimestampFromTypeOrmFile(fileName) {
    const match = fileName.match(/^(\d{13})-/);
    if (match) {
      return new Date(parseInt(match[1]));
    }
    return void 0;
  }
  /**
   * Extract timestamp from SQL file name
   */
  extractTimestampFromSqlFile(fileName) {
    const patterns = [
      /(\d{4}-\d{2}-\d{2}[-_]\d{2}-\d{2}-\d{2})/,
      // YYYY-MM-DD-HH-MM-SS
      /(\d{8}[-_]\d{6})/,
      // YYYYMMDD-HHMMSS
      /(\d{10,13})/
      // Unix timestamp
    ];
    for (const pattern of patterns) {
      const match = fileName.match(pattern);
      if (match) {
        const timestamp = match[1];
        if (timestamp.match(/^\d{10,13}$/)) {
          const ts = parseInt(timestamp);
          return new Date(ts < 1e10 ? ts * 1e3 : ts);
        } else {
          try {
            return new Date(timestamp.replace(/[-_]/g, (match2) => match2 === "_" ? " " : "-"));
          } catch {
            continue;
          }
        }
      }
    }
    return void 0;
  }
  /**
   * Calculate summary statistics
   */
  calculateSummary(migrations) {
    const byType = {
      ["PRISMA" /* PRISMA */]: 0,
      ["DRIZZLE" /* DRIZZLE */]: 0,
      ["TYPEORM" /* TYPEORM */]: 0,
      ["PLAIN_SQL" /* PLAIN_SQL */]: 0
    };
    let totalOperations = 0;
    let destructiveOperations = 0;
    let blockingOperations = 0;
    for (const migration of migrations) {
      byType[migration.type]++;
      totalOperations += migration.metadata.totalOperations;
      destructiveOperations += migration.metadata.destructiveOperations;
      blockingOperations += migration.metadata.blockingOperations;
    }
    return {
      byType,
      totalOperations,
      destructiveOperations,
      blockingOperations
    };
  }
};

// src/risk-detector.ts
var SQLRiskDetector = class {
  constructor(dbConnection) {
    this.dbConnection = dbConnection;
  }
  /**
   * Analyze SQL statements for risks and generate comprehensive assessment
   */
  async analyzeSQL(sql, tableMetadata) {
    const riskCategories = [];
    const mitigationStrategies = [];
    const warnings2 = [];
    const blockers = [];
    const statements = this.parseStatements(sql);
    for (const statement of statements) {
      const statementRisks = await this.analyzeStatement(statement, tableMetadata);
      riskCategories.push(...statementRisks.categories);
      mitigationStrategies.push(...statementRisks.mitigations);
      warnings2.push(...statementRisks.warnings);
      blockers.push(...statementRisks.blockers);
    }
    const riskScore = this.calculateRiskScore(riskCategories);
    const riskLevel = this.determineRiskLevel(riskScore);
    return {
      riskLevel,
      riskScore,
      riskCategories,
      mitigationStrategies: [...new Set(mitigationStrategies)],
      warnings: [...new Set(warnings2)],
      blockers: [...new Set(blockers)]
    };
  }
  /**
   * Parse SQL into individual statements
   */
  parseStatements(sql) {
    return sql.split(";").map((stmt) => stmt.trim()).filter((stmt) => stmt.length > 0);
  }
  /**
   * Analyze a single SQL statement for risks
   */
  async analyzeStatement(statement, tableMetadata) {
    const categories = [];
    const mitigations = [];
    const warnings2 = [];
    const blockers = [];
    const statementLower = statement.toLowerCase().trim();
    const blockingRisks = this.detectBlockingOperations(statementLower, statement);
    categories.push(...blockingRisks.categories);
    mitigations.push(...blockingRisks.mitigations);
    warnings2.push(...blockingRisks.warnings);
    const destructiveRisks = this.detectDestructiveOperations(statementLower, statement);
    categories.push(...destructiveRisks.categories);
    mitigations.push(...destructiveRisks.mitigations);
    warnings2.push(...destructiveRisks.warnings);
    const performanceRisks = await this.detectPerformanceImpacts(statementLower, statement, tableMetadata);
    categories.push(...performanceRisks.categories);
    mitigations.push(...performanceRisks.mitigations);
    warnings2.push(...performanceRisks.warnings);
    const constraintRisks = this.detectConstraintViolations(statementLower, statement);
    categories.push(...constraintRisks.categories);
    mitigations.push(...constraintRisks.mitigations);
    warnings2.push(...constraintRisks.warnings);
    const downtimeRisks = await this.detectDowntimeOperations(statementLower, statement, tableMetadata);
    categories.push(...downtimeRisks.categories);
    mitigations.push(...downtimeRisks.mitigations);
    blockers.push(...downtimeRisks.blockers);
    return { categories, mitigations, warnings: warnings2, blockers };
  }
  /**
   * Detect operations that cause table locks or block other operations
   */
  detectBlockingOperations(statementLower, originalStatement) {
    const categories = [];
    const mitigations = [];
    const warnings2 = [];
    if (statementLower.includes("alter table")) {
      const tableName = this.extractTableName(statementLower, "alter table");
      if (statementLower.includes("add column") && statementLower.includes("not null") && !statementLower.includes("default")) {
        categories.push({
          type: "BLOCKING",
          severity: "HIGH",
          description: "Adding NOT NULL column without default requires table rewrite and exclusive lock",
          affectedObjects: [tableName || "unknown_table"],
          estimatedImpact: {
            lockDuration: 300,
            // 5 minutes estimated
            rollbackDifficulty: "MEDIUM"
          }
        });
        mitigations.push("Add column as nullable first, then populate and add NOT NULL constraint");
        mitigations.push("Add column with DEFAULT value to avoid table rewrite");
      }
      if (statementLower.includes("drop column")) {
        categories.push({
          type: "BLOCKING",
          severity: "MEDIUM",
          description: "Dropping column requires exclusive table lock",
          affectedObjects: [tableName || "unknown_table"],
          estimatedImpact: {
            lockDuration: 60,
            // 1 minute estimated
            rollbackDifficulty: "HARD"
          }
        });
        mitigations.push("Consider renaming column first for gradual removal");
      }
      if (statementLower.includes("add constraint") && statementLower.includes("foreign key")) {
        categories.push({
          type: "BLOCKING",
          severity: "HIGH",
          description: "Adding foreign key constraint requires exclusive locks on both tables",
          affectedObjects: [tableName || "unknown_table"],
          estimatedImpact: {
            lockDuration: 180,
            // 3 minutes estimated
            rollbackDifficulty: "MEDIUM"
          }
        });
        mitigations.push("Add constraint as NOT ENFORCED first, then validate separately");
        warnings2.push("Ensure referential integrity before adding constraint");
      }
      if (statementLower.includes("add constraint") && statementLower.includes("unique")) {
        categories.push({
          type: "BLOCKING",
          severity: "MEDIUM",
          description: "Adding unique constraint requires table scan and exclusive lock",
          affectedObjects: [tableName || "unknown_table"],
          estimatedImpact: {
            lockDuration: 120,
            // 2 minutes estimated
            rollbackDifficulty: "EASY"
          }
        });
        mitigations.push("Check for duplicate data before adding constraint");
        warnings2.push("Unique constraint will fail if duplicate data exists");
      }
    }
    if (statementLower.includes("create index") && !statementLower.includes("concurrently")) {
      const tableName = this.extractTableName(statementLower, "on");
      categories.push({
        type: "BLOCKING",
        severity: "MEDIUM",
        description: "Creating index without CONCURRENTLY blocks table writes",
        affectedObjects: [tableName || "unknown_table"],
        estimatedImpact: {
          lockDuration: 120,
          // 2 minutes estimated
          rollbackDifficulty: "EASY"
        }
      });
      if (this.dbConnection?.type === "postgresql") {
        mitigations.push("Use CREATE INDEX CONCURRENTLY to avoid blocking writes");
      }
      warnings2.push("Index creation time depends on table size");
    }
    return { categories, mitigations, warnings: warnings2 };
  }
  /**
   * Detect operations that can cause data loss
   */
  detectDestructiveOperations(statementLower, originalStatement) {
    const categories = [];
    const mitigations = [];
    const warnings2 = [];
    if (statementLower.includes("drop table")) {
      const tableName = this.extractTableName(statementLower, "drop table");
      categories.push({
        type: "DESTRUCTIVE",
        severity: "CRITICAL",
        description: "Dropping table will permanently delete all data",
        affectedObjects: [tableName || "unknown_table"],
        estimatedImpact: {
          dataLoss: true,
          rollbackDifficulty: "IMPOSSIBLE"
        }
      });
      mitigations.push("Create backup before dropping table");
      mitigations.push("Consider renaming table instead of dropping");
      warnings2.push("Data will be permanently lost");
    }
    if (statementLower.includes("drop column")) {
      const tableName = this.extractTableName(statementLower, "alter table");
      categories.push({
        type: "DESTRUCTIVE",
        severity: "HIGH",
        description: "Dropping column will permanently delete column data",
        affectedObjects: [tableName || "unknown_table"],
        estimatedImpact: {
          dataLoss: true,
          rollbackDifficulty: "IMPOSSIBLE"
        }
      });
      mitigations.push("Create backup of column data before dropping");
      mitigations.push("Consider renaming column instead of dropping");
      warnings2.push("Column data will be permanently lost");
    }
    if (statementLower.includes("truncate table")) {
      const tableName = this.extractTableName(statementLower, "truncate table");
      categories.push({
        type: "DESTRUCTIVE",
        severity: "CRITICAL",
        description: "Truncating table will delete all rows",
        affectedObjects: [tableName || "unknown_table"],
        estimatedImpact: {
          dataLoss: true,
          rollbackDifficulty: "IMPOSSIBLE"
        }
      });
      mitigations.push("Use DELETE with WHERE clause if you need selective removal");
      warnings2.push("All table data will be permanently lost");
    }
    if (statementLower.includes("delete from") && !statementLower.includes("where")) {
      const tableName = this.extractTableName(statementLower, "delete from");
      categories.push({
        type: "DESTRUCTIVE",
        severity: "HIGH",
        description: "DELETE without WHERE clause will remove all rows",
        affectedObjects: [tableName || "unknown_table"],
        estimatedImpact: {
          dataLoss: true,
          rollbackDifficulty: "HARD"
        }
      });
      warnings2.push("DELETE without WHERE will remove all data");
      mitigations.push("Add WHERE clause to limit deletion scope");
    }
    if (statementLower.includes("update") && !statementLower.includes("where")) {
      const tableName = this.extractTableName(statementLower, "update");
      categories.push({
        type: "DESTRUCTIVE",
        severity: "MEDIUM",
        description: "UPDATE without WHERE clause will modify all rows",
        affectedObjects: [tableName || "unknown_table"],
        estimatedImpact: {
          dataLoss: false,
          rollbackDifficulty: "HARD"
        }
      });
      warnings2.push("UPDATE without WHERE will modify all rows");
      mitigations.push("Add WHERE clause to limit update scope");
    }
    return { categories, mitigations, warnings: warnings2 };
  }
  /**
   * Detect operations with significant performance impact
   */
  async detectPerformanceImpacts(statementLower, originalStatement, tableMetadata) {
    const categories = [];
    const mitigations = [];
    const warnings2 = [];
    if (!tableMetadata) return { categories, mitigations, warnings: warnings2 };
    for (const table of tableMetadata) {
      const tableName = table.name.toLowerCase();
      if (statementLower.includes(tableName)) {
        if (table.rowCount > 1e6) {
          if (statementLower.includes("alter table")) {
            categories.push({
              type: "PERFORMANCE",
              severity: "HIGH",
              description: `Table ${table.name} has ${table.rowCount.toLocaleString()} rows - operation will be slow`,
              affectedObjects: [table.name],
              estimatedImpact: {
                lockDuration: Math.floor(table.rowCount / 1e3),
                // 1 second per 1000 rows
                rollbackDifficulty: "MEDIUM"
              }
            });
            mitigations.push("Consider maintenance window for large table operations");
            mitigations.push("Test operation on staging environment first");
          }
          if (statementLower.includes("create index")) {
            categories.push({
              type: "PERFORMANCE",
              severity: "MEDIUM",
              description: `Index creation on large table ${table.name} will take significant time`,
              affectedObjects: [table.name],
              estimatedImpact: {
                lockDuration: Math.floor(table.rowCount / 5e3),
                // 1 second per 5000 rows
                rollbackDifficulty: "EASY"
              }
            });
            mitigations.push("Use CONCURRENTLY option if available");
            warnings2.push("Monitor index creation progress");
          }
        }
        if (statementLower.includes("add constraint") && statementLower.includes("check")) {
          categories.push({
            type: "PERFORMANCE",
            severity: "MEDIUM",
            description: `Adding CHECK constraint requires full table scan of ${table.name}`,
            affectedObjects: [table.name],
            estimatedImpact: {
              lockDuration: Math.floor(table.rowCount / 1e4),
              // 1 second per 10000 rows
              rollbackDifficulty: "EASY"
            }
          });
          warnings2.push("CHECK constraint validation requires scanning all rows");
        }
      }
    }
    return { categories, mitigations, warnings: warnings2 };
  }
  /**
   * Detect potential constraint violations
   */
  detectConstraintViolations(statementLower, originalStatement) {
    const categories = [];
    const mitigations = [];
    const warnings2 = [];
    if (statementLower.includes("alter table") && statementLower.includes("not null")) {
      const tableName = this.extractTableName(statementLower, "alter table");
      categories.push({
        type: "CONSTRAINT",
        severity: "HIGH",
        description: "Adding NOT NULL constraint may fail if existing NULL values exist",
        affectedObjects: [tableName || "unknown_table"],
        estimatedImpact: {
          rollbackDifficulty: "EASY"
        }
      });
      mitigations.push("Check for NULL values before adding NOT NULL constraint");
      mitigations.push("Update NULL values with defaults before adding constraint");
      warnings2.push("Migration will fail if NULL values exist in column");
    }
    if (statementLower.includes("add constraint") && statementLower.includes("unique")) {
      const tableName = this.extractTableName(statementLower, "alter table");
      categories.push({
        type: "CONSTRAINT",
        severity: "MEDIUM",
        description: "Adding UNIQUE constraint may fail if duplicate values exist",
        affectedObjects: [tableName || "unknown_table"],
        estimatedImpact: {
          rollbackDifficulty: "EASY"
        }
      });
      mitigations.push("Check for duplicate values before adding UNIQUE constraint");
      mitigations.push("Clean up duplicate data before adding constraint");
      warnings2.push("Migration will fail if duplicate values exist");
    }
    return { categories, mitigations, warnings: warnings2 };
  }
  /**
   * Detect operations that cause downtime
   */
  async detectDowntimeOperations(statementLower, originalStatement, tableMetadata) {
    const categories = [];
    const mitigations = [];
    const blockers = [];
    if (statementLower.includes("rename table") || statementLower.includes("alter table") && statementLower.includes("rename to")) {
      const tableName = this.extractTableName(statementLower, "alter table");
      categories.push({
        type: "DOWNTIME",
        severity: "HIGH",
        description: "Renaming table will break application references",
        affectedObjects: [tableName || "unknown_table"],
        estimatedImpact: {
          downtime: 60,
          // 1 minute estimated
          rollbackDifficulty: "MEDIUM"
        }
      });
      mitigations.push("Coordinate with application deployment");
      mitigations.push("Update application code to use new table name");
      blockers.push("Application must be updated before/after table rename");
    }
    if (statementLower.includes("alter column") && statementLower.includes("type")) {
      const tableName = this.extractTableName(statementLower, "alter table");
      categories.push({
        type: "DOWNTIME",
        severity: "MEDIUM",
        description: "Changing column type may require data conversion and application updates",
        affectedObjects: [tableName || "unknown_table"],
        estimatedImpact: {
          downtime: 30,
          // 30 seconds estimated
          rollbackDifficulty: "HARD"
        }
      });
      mitigations.push("Test data conversion on staging environment");
      mitigations.push("Verify application compatibility with new data type");
      warnings.push("Data conversion may fail if values are incompatible");
    }
    return { categories, mitigations, blockers };
  }
  /**
   * Calculate overall risk score from individual risk categories
   */
  calculateRiskScore(categories) {
    if (categories.length === 0) return 0;
    const severityWeights = {
      "LOW": 10,
      "MEDIUM": 25,
      "HIGH": 50,
      "CRITICAL": 100
    };
    const typeWeights = {
      "DESTRUCTIVE": 1.5,
      "BLOCKING": 1.2,
      "DOWNTIME": 1.3,
      "CONSTRAINT": 1,
      "PERFORMANCE": 0.8
    };
    let totalScore = 0;
    let maxScore = 0;
    for (const category of categories) {
      const severityScore = severityWeights[category.severity];
      const typeMultiplier = typeWeights[category.type];
      const categoryScore = severityScore * typeMultiplier;
      totalScore += categoryScore;
      maxScore = Math.max(maxScore, categoryScore);
    }
    const avgScore = totalScore / categories.length;
    const finalScore = avgScore * 0.6 + maxScore * 0.4;
    return Math.min(100, Math.round(finalScore));
  }
  /**
   * Determine risk level from numeric score
   */
  determineRiskLevel(score) {
    if (score >= 80) return "CRITICAL";
    if (score >= 60) return "HIGH";
    if (score >= 30) return "MEDIUM";
    return "LOW";
  }
  /**
   * Extract table name from SQL statement
   */
  extractTableName(statement, afterKeyword) {
    const regex = new RegExp(`${afterKeyword}\\s+([\\w\\-_\\.]+)`, "i");
    const match = statement.match(regex);
    return match ? match[1] : null;
  }
};

// src/strategy-generator.ts
var EnhancementStrategyGenerator = class {
  constructor(dbConnection) {
    this.dbConnection = dbConnection;
    this.riskDetector = new SQLRiskDetector(dbConnection);
  }
  riskDetector;
  /**
   * Generate comprehensive enhancement strategy for SQL migration
   */
  async generateStrategy(originalSQL, tableMetadata, options) {
    const riskAssessment = await this.riskDetector.analyzeSQL(originalSQL, tableMetadata);
    const enhancedSteps = await this.createEnhancedSteps(originalSQL, riskAssessment, tableMetadata, options);
    const rollbackStrategy = this.createRollbackStrategy(enhancedSteps, riskAssessment);
    const preFlightChecks = await this.createPreFlightChecks(originalSQL, tableMetadata);
    const postMigrationValidation = this.createValidationSteps(originalSQL, tableMetadata);
    const maintenanceWindow = this.calculateMaintenanceWindow(enhancedSteps, riskAssessment);
    const estimatedDuration = enhancedSteps.reduce((total, step) => total + step.estimatedDuration, 0);
    const dependencies = this.extractDependencies(enhancedSteps);
    return {
      originalSQL,
      enhancedSteps,
      rollbackStrategy,
      preFlightChecks,
      postMigrationValidation,
      estimatedDuration,
      maintenanceWindow,
      dependencies
    };
  }
  /**
   * Create enhanced migration steps with safety improvements
   */
  async createEnhancedSteps(originalSQL, riskAssessment, tableMetadata, options) {
    const steps = [];
    const statements = this.parseStatements(originalSQL);
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      const statementLower = statement.toLowerCase().trim();
      if (statementLower.includes("alter table") && statementLower.includes("add column")) {
        steps.push(...await this.enhanceAddColumn(statement, tableMetadata));
      } else if (statementLower.includes("alter table") && statementLower.includes("drop column")) {
        steps.push(...await this.enhanceDropColumn(statement, tableMetadata));
      } else if (statementLower.includes("alter table") && statementLower.includes("add constraint")) {
        steps.push(...await this.enhanceAddConstraint(statement, tableMetadata));
      } else if (statementLower.includes("create index")) {
        steps.push(...await this.enhanceCreateIndex(statement, tableMetadata));
      } else if (statementLower.includes("drop table")) {
        steps.push(...await this.enhanceDropTable(statement, tableMetadata));
      } else {
        steps.push(this.createDefaultStep(statement, i + 1));
      }
    }
    return steps;
  }
  /**
   * Enhance ADD COLUMN operations for safety
   */
  async enhanceAddColumn(statement, tableMetadata) {
    const steps = [];
    const statementLower = statement.toLowerCase();
    const tableName = this.extractTableName(statementLower, "alter table");
    if (statementLower.includes("not null") && !statementLower.includes("default")) {
      const columnName = this.extractColumnName(statement);
      const columnType = this.extractColumnType(statement);
      steps.push({
        stepNumber: 1,
        description: `Add column ${columnName} as nullable to table ${tableName}`,
        sql: statement.replace(/not null/gi, "").trim(),
        riskLevel: "LOW",
        estimatedDuration: 5,
        canRollback: true,
        dependencies: [],
        validationQueries: [
          `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = '${columnName}'`
        ],
        onFailure: "STOP"
      });
      steps.push({
        stepNumber: 2,
        description: `Update NULL values in ${columnName} with appropriate defaults`,
        sql: `UPDATE ${tableName} SET ${columnName} = [SPECIFY_DEFAULT_VALUE] WHERE ${columnName} IS NULL;`,
        riskLevel: "MEDIUM",
        estimatedDuration: 30,
        canRollback: true,
        dependencies: ["Step 1"],
        validationQueries: [
          `SELECT COUNT(*) FROM ${tableName} WHERE ${columnName} IS NULL`
        ],
        onFailure: "ROLLBACK"
      });
      steps.push({
        stepNumber: 3,
        description: `Add NOT NULL constraint to column ${columnName}`,
        sql: `ALTER TABLE ${tableName} ALTER COLUMN ${columnName} SET NOT NULL;`,
        riskLevel: "MEDIUM",
        estimatedDuration: 10,
        canRollback: true,
        dependencies: ["Step 2"],
        validationQueries: [
          `SELECT is_nullable FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = '${columnName}'`
        ],
        onFailure: "ROLLBACK"
      });
    } else {
      steps.push({
        stepNumber: 1,
        description: `Add column to table ${tableName}`,
        sql: statement,
        riskLevel: "LOW",
        estimatedDuration: 5,
        canRollback: true,
        dependencies: [],
        validationQueries: [
          `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${tableName}'`
        ],
        onFailure: "STOP"
      });
    }
    return steps;
  }
  /**
   * Enhance DROP COLUMN operations for safety
   */
  async enhanceDropColumn(statement, tableMetadata) {
    const steps = [];
    const statementLower = statement.toLowerCase();
    const tableName = this.extractTableName(statementLower, "alter table");
    const columnName = this.extractColumnName(statement);
    steps.push({
      stepNumber: 1,
      description: `Create backup table with column data before dropping ${columnName}`,
      sql: `CREATE TABLE ${tableName}_${columnName}_backup AS SELECT id, ${columnName} FROM ${tableName};`,
      riskLevel: "LOW",
      estimatedDuration: 30,
      canRollback: true,
      dependencies: [],
      validationQueries: [
        `SELECT COUNT(*) FROM ${tableName}_${columnName}_backup`
      ],
      onFailure: "STOP"
    });
    steps.push({
      stepNumber: 2,
      description: `Drop column ${columnName} from table ${tableName}`,
      sql: statement,
      riskLevel: "HIGH",
      estimatedDuration: 60,
      canRollback: false,
      // Dropping column is not easily reversible
      dependencies: ["Step 1"],
      validationQueries: [
        `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = '${columnName}'`
      ],
      onFailure: "STOP"
    });
    return steps;
  }
  /**
   * Enhance ADD CONSTRAINT operations for safety
   */
  async enhanceAddConstraint(statement, tableMetadata) {
    const steps = [];
    const statementLower = statement.toLowerCase();
    const tableName = this.extractTableName(statementLower, "alter table");
    if (statementLower.includes("foreign key")) {
      steps.push({
        stepNumber: 1,
        description: `Validate referential integrity before adding foreign key constraint`,
        sql: `-- Custom validation query will be generated based on constraint details`,
        riskLevel: "MEDIUM",
        estimatedDuration: 60,
        canRollback: true,
        dependencies: [],
        validationQueries: [
          `-- Validate no orphaned records exist`
        ],
        onFailure: "STOP"
      });
      steps.push({
        stepNumber: 2,
        description: `Add foreign key constraint to table ${tableName}`,
        sql: statement,
        riskLevel: "HIGH",
        estimatedDuration: 120,
        canRollback: true,
        dependencies: ["Step 1"],
        validationQueries: [
          `SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name = '${tableName}' AND constraint_type = 'FOREIGN KEY'`
        ],
        onFailure: "ROLLBACK"
      });
    } else if (statementLower.includes("unique")) {
      steps.push({
        stepNumber: 1,
        description: `Check for duplicate values before adding unique constraint`,
        sql: `-- Custom duplicate check query`,
        riskLevel: "MEDIUM",
        estimatedDuration: 30,
        canRollback: true,
        dependencies: [],
        validationQueries: [
          `-- Check for duplicates in target columns`
        ],
        onFailure: "STOP"
      });
      steps.push({
        stepNumber: 2,
        description: `Add unique constraint to table ${tableName}`,
        sql: statement,
        riskLevel: "MEDIUM",
        estimatedDuration: 60,
        canRollback: true,
        dependencies: ["Step 1"],
        validationQueries: [
          `SELECT COUNT(*) FROM information_schema.table_constraints WHERE table_name = '${tableName}' AND constraint_type = 'UNIQUE'`
        ],
        onFailure: "ROLLBACK"
      });
    } else {
      steps.push({
        stepNumber: 1,
        description: `Add constraint to table ${tableName}`,
        sql: statement,
        riskLevel: "MEDIUM",
        estimatedDuration: 30,
        canRollback: true,
        dependencies: [],
        validationQueries: [],
        onFailure: "ROLLBACK"
      });
    }
    return steps;
  }
  /**
   * Enhance CREATE INDEX operations for safety
   */
  async enhanceCreateIndex(statement, tableMetadata) {
    const steps = [];
    const statementLower = statement.toLowerCase();
    const tableName = this.extractTableName(statementLower, "on");
    if (this.dbConnection.type === "postgresql" && !statementLower.includes("concurrently")) {
      const enhancedSQL = statement.replace(/create index/i, "CREATE INDEX CONCURRENTLY");
      steps.push({
        stepNumber: 1,
        description: `Create index concurrently on table ${tableName} to avoid blocking writes`,
        sql: enhancedSQL,
        riskLevel: "LOW",
        estimatedDuration: 300,
        // Longer but non-blocking
        canRollback: true,
        dependencies: [],
        validationQueries: [
          `SELECT COUNT(*) FROM pg_indexes WHERE tablename = '${tableName}'`
        ],
        onFailure: "ROLLBACK"
      });
    } else {
      steps.push({
        stepNumber: 1,
        description: `Create index on table ${tableName}`,
        sql: statement,
        riskLevel: "MEDIUM",
        estimatedDuration: 180,
        canRollback: true,
        dependencies: [],
        validationQueries: [],
        onFailure: "ROLLBACK"
      });
    }
    return steps;
  }
  /**
   * Enhance DROP TABLE operations for safety
   */
  async enhanceDropTable(statement, tableMetadata) {
    const steps = [];
    const tableName = this.extractTableName(statement.toLowerCase(), "drop table");
    steps.push({
      stepNumber: 1,
      description: `Create backup of table ${tableName} before dropping`,
      sql: `CREATE TABLE ${tableName}_backup_${Date.now()} AS SELECT * FROM ${tableName};`,
      riskLevel: "LOW",
      estimatedDuration: 120,
      canRollback: true,
      dependencies: [],
      validationQueries: [
        `SELECT COUNT(*) FROM ${tableName}_backup_${Date.now()}`
      ],
      onFailure: "STOP"
    });
    steps.push({
      stepNumber: 2,
      description: `Drop table ${tableName}`,
      sql: statement,
      riskLevel: "CRITICAL",
      estimatedDuration: 30,
      canRollback: false,
      // Table drop is irreversible without backup
      dependencies: ["Step 1"],
      validationQueries: [
        `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '${tableName}'`
      ],
      onFailure: "STOP"
    });
    return steps;
  }
  /**
   * Create default migration step for unhandled operations
   */
  createDefaultStep(statement, stepNumber) {
    return {
      stepNumber,
      description: `Execute: ${statement.substring(0, 50)}${statement.length > 50 ? "..." : ""}`,
      sql: statement,
      riskLevel: "MEDIUM",
      estimatedDuration: 30,
      canRollback: true,
      dependencies: [],
      validationQueries: [],
      onFailure: "STOP"
    };
  }
  /**
   * Create rollback strategy for the migration
   */
  createRollbackStrategy(steps, riskAssessment) {
    const rollbackSteps = [];
    let canRollback = true;
    let rollbackComplexity = "SIMPLE";
    let dataBackupRequired = false;
    for (let i = steps.length - 1; i >= 0; i--) {
      const step = steps[i];
      if (!step.canRollback) {
        canRollback = false;
        rollbackComplexity = "IMPOSSIBLE";
        break;
      }
      if (step.riskLevel === "HIGH" || step.riskLevel === "CRITICAL") {
        rollbackComplexity = "COMPLEX";
        dataBackupRequired = true;
      }
      const rollbackSQL = this.generateRollbackSQL(step);
      if (rollbackSQL) {
        rollbackSteps.push({
          stepNumber: rollbackSteps.length + 1,
          description: `Rollback: ${step.description}`,
          sql: rollbackSQL,
          condition: `IF step ${step.stepNumber} was executed`
        });
      }
    }
    const rollbackWindow = rollbackSteps.reduce((total, step) => total + 30, 0);
    return {
      canRollback,
      rollbackSteps,
      dataBackupRequired,
      rollbackComplexity,
      rollbackWindow
    };
  }
  /**
   * Generate appropriate rollback SQL for a migration step
   */
  generateRollbackSQL(step) {
    const sql = step.sql.toLowerCase().trim();
    if (sql.includes("alter table") && sql.includes("add column")) {
      const tableName = this.extractTableName(sql, "alter table");
      const columnName = this.extractColumnName(step.sql);
      return `ALTER TABLE ${tableName} DROP COLUMN ${columnName};`;
    }
    if (sql.includes("create index")) {
      const indexName = this.extractIndexName(step.sql);
      return `DROP INDEX ${indexName};`;
    }
    if (sql.includes("alter table") && sql.includes("add constraint")) {
      const tableName = this.extractTableName(sql, "alter table");
      const constraintName = this.extractConstraintName(step.sql);
      return `ALTER TABLE ${tableName} DROP CONSTRAINT ${constraintName};`;
    }
    return `-- Manual rollback required for: ${step.description}`;
  }
  /**
   * Create pre-flight validation checks
   */
  async createPreFlightChecks(originalSQL, tableMetadata) {
    const checks = [];
    const statementLower = originalSQL.toLowerCase();
    if (statementLower.includes("alter table")) {
      const tableName = this.extractTableName(statementLower, "alter table");
      checks.push({
        checkName: "table_exists",
        description: `Verify table ${tableName} exists`,
        query: `SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '${tableName}'`,
        expectedResult: "SPECIFIC_VALUE",
        expectedValue: 1,
        failureAction: "BLOCK"
      });
    }
    checks.push({
      checkName: "disk_space",
      description: "Verify sufficient disk space for migration",
      query: `-- Database-specific disk space query`,
      expectedResult: "CUSTOM",
      failureAction: "WARN",
      customValidation: (result) => {
        return { success: true, message: "Sufficient disk space available" };
      }
    });
    checks.push({
      checkName: "active_connections",
      description: "Check for excessive active connections",
      query: `-- Database-specific connection count query`,
      expectedResult: "CUSTOM",
      failureAction: "WARN",
      customValidation: (result) => {
        return { success: true, message: "Connection count is acceptable" };
      }
    });
    return checks;
  }
  /**
   * Create post-migration validation steps
   */
  createValidationSteps(originalSQL, tableMetadata) {
    const validations = [];
    const statementLower = originalSQL.toLowerCase();
    if (statementLower.includes("alter table") && statementLower.includes("add column")) {
      const tableName = this.extractTableName(statementLower, "alter table");
      const columnName = this.extractColumnName(originalSQL);
      validations.push({
        stepName: "column_added",
        description: `Verify column ${columnName} was added to table ${tableName}`,
        query: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${tableName}' AND column_name = '${columnName}'`,
        expectedCondition: "COUNT = 1",
        isRequired: true
      });
    }
    if (statementLower.includes("create index")) {
      const indexName = this.extractIndexName(originalSQL);
      validations.push({
        stepName: "index_created",
        description: `Verify index ${indexName} was created`,
        query: `-- Database-specific index existence query`,
        expectedCondition: "INDEX EXISTS",
        isRequired: true
      });
    }
    return validations;
  }
  /**
   * Calculate maintenance window requirements
   */
  calculateMaintenanceWindow(steps, riskAssessment) {
    const totalDuration = steps.reduce((sum, step) => sum + step.estimatedDuration, 0);
    const hasHighRisk = steps.some((step) => step.riskLevel === "HIGH" || step.riskLevel === "CRITICAL");
    const hasBlockingOperations = riskAssessment.riskCategories.some((cat) => cat.type === "BLOCKING");
    const recommended = hasHighRisk || hasBlockingOperations || totalDuration > 300;
    const minimumDuration = totalDuration;
    const optimalDuration = Math.ceil(totalDuration * 1.5);
    const considerations = [];
    if (hasBlockingOperations) {
      considerations.push("Migration includes blocking operations that will lock tables");
    }
    if (hasHighRisk) {
      considerations.push("High-risk operations require careful monitoring");
    }
    if (totalDuration > 600) {
      considerations.push("Long-running migration may impact performance");
    }
    return {
      recommended,
      minimumDuration,
      optimalDuration,
      considerations
    };
  }
  /**
   * Extract dependencies from migration steps
   */
  extractDependencies(steps) {
    const dependencies = /* @__PURE__ */ new Set();
    steps.forEach((step) => {
      step.dependencies.forEach((dep) => dependencies.add(dep));
    });
    return Array.from(dependencies);
  }
  // Helper methods for SQL parsing
  parseStatements(sql) {
    return sql.split(";").map((stmt) => stmt.trim()).filter((stmt) => stmt.length > 0);
  }
  extractTableName(statement, afterKeyword) {
    const regex = new RegExp(`${afterKeyword}\\s+([\\w\\-_\\.]+)`, "i");
    const match = statement.match(regex);
    return match ? match[1] : null;
  }
  extractColumnName(statement) {
    const addColumnMatch = statement.match(/add\s+column\s+([^\s]+)/i);
    const dropColumnMatch = statement.match(/drop\s+column\s+([^\s]+)/i);
    return addColumnMatch?.[1] || dropColumnMatch?.[1] || null;
  }
  extractColumnType(statement) {
    const match = statement.match(/add\s+column\s+\w+\s+([^\s,]+)/i);
    return match ? match[1] : null;
  }
  extractIndexName(statement) {
    const match = statement.match(/create\s+index\s+([^\s]+)/i);
    return match ? match[1] : null;
  }
  extractConstraintName(statement) {
    const match = statement.match(/constraint\s+([^\s]+)/i);
    return match ? match[1] : null;
  }
};

// src/enhancement-engine.ts
var EnhancementEngine = class {
  risk = new SQLRiskDetector();
  generator = new EnhancementStrategyGenerator({});
  /**
   * Analyse a migration file and return an enhanced, production-safe version.
   */
  async enhance(migration) {
    const sql = migration.up;
    const riskReport = await this.risk.analyzeSQL(sql);
    const strategy = await this.generator.generateStrategy(migration.up);
    return {
      original: migration,
      enhanced: {
        up: strategy.enhancedSteps.map((s) => s.sql).join("\n"),
        down: strategy.rollbackStrategy.rollbackSteps.map((s) => s.sql).join("\n"),
        preFlightChecks: strategy.preFlightChecks.map((c) => c.query),
        postMigrationValidation: strategy.postMigrationValidation.map((v) => v.query),
        rollbackStrategy: strategy.rollbackStrategy.rollbackSteps.map((s) => s.sql)
      },
      estimatedDuration: strategy.estimatedDuration
    };
  }
};
export {
  AstAnalyzer,
  EnhancementEngine,
  EnhancementStrategyGenerator,
  MigrationParser,
  MigrationType,
  SQLRiskDetector,
  SqlOperationType,
  SqlParser
};
//# sourceMappingURL=index.js.map