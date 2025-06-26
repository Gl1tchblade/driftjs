"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AddColumnPattern: () => AddColumnPattern,
  AddConstraintPattern: () => AddConstraintPattern,
  ConcurrentIndexPattern: () => ConcurrentIndexPattern,
  CreateIndexPattern: () => CreateIndexPattern,
  DropColumnPattern: () => DropColumnPattern,
  DropConstraintPattern: () => DropConstraintPattern,
  DropIndexPattern: () => DropIndexPattern,
  ForeignKeyPattern: () => ForeignKeyPattern,
  ModifyColumnPattern: () => ModifyColumnPattern,
  RenameColumnPattern: () => RenameColumnPattern,
  UniqueConstraintPattern: () => UniqueConstraintPattern
});
module.exports = __toCommonJS(index_exports);

// src/column-ops/add-column-pattern.ts
var AddColumnPattern = class {
  /**
   * Generate safe column addition steps
   */
  generateSafeSteps(config) {
    const steps = [];
    const rollbackSteps = [];
    const preflightChecks = [];
    const warnings = [];
    const isNotNullWithoutDefault = !config.nullable && config.defaultValue === void 0;
    const riskLevel = this.assessRiskLevel(config);
    this.addPreflightChecks(config, preflightChecks);
    if (isNotNullWithoutDefault) {
      this.generateNotNullWithoutDefaultSteps(config, steps, rollbackSteps, warnings);
    } else if (!config.nullable && config.defaultValue !== void 0) {
      this.generateNotNullWithDefaultSteps(config, steps, rollbackSteps, warnings);
    } else {
      this.generateNullableColumnSteps(config, steps, rollbackSteps);
    }
    const estimatedDurationMs = steps.reduce((total, step) => total + step.estimatedDurationMs, 0);
    return {
      steps,
      estimatedDurationMs,
      riskLevel,
      rollbackSteps: rollbackSteps.reverse(),
      // Reverse for proper rollback order
      preflightChecks,
      warnings
    };
  }
  /**
   * Assess risk level for column addition
   */
  assessRiskLevel(config) {
    if (!config.nullable && config.defaultValue === void 0) {
      return "HIGH";
    }
    if (!config.nullable && config.defaultValue !== void 0) {
      return "MEDIUM";
    }
    return "LOW";
  }
  /**
   * Add preflight checks for the operation
   */
  addPreflightChecks(config, checks) {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Check if column '${config.columnName}' already exists`,
      `Verify database has sufficient storage space`,
      `Check for active long-running transactions`,
      `Verify table is not currently locked`
    );
    if (!config.nullable && config.defaultValue === void 0) {
      checks.push(
        `Verify table '${config.tableName}' has no existing rows (or plan for data migration)`,
        `Check table size to estimate operation duration`
      );
    }
  }
  /**
   * Generate steps for NOT NULL column without default (highest risk)
   */
  generateNotNullWithoutDefaultSteps(config, steps, rollbackSteps, warnings) {
    warnings.push(
      "Adding NOT NULL column without default value is high-risk",
      "This operation will fail if table contains existing data",
      "Consider adding a default value or making column nullable initially"
    );
    steps.push({
      id: "add-nullable-column",
      description: `Add column ${config.columnName} as nullable`,
      sql: `ALTER TABLE ${config.tableName} ADD COLUMN ${config.columnName} ${config.columnType} NULL${config.comment ? ` COMMENT '${config.comment}'` : ""};`,
      estimatedDurationMs: 2e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      validationQuery: `SELECT column_name FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      expectedResult: config.columnName
    });
    rollbackSteps.push({
      id: "rollback-add-nullable-column",
      description: `Remove column ${config.columnName}`,
      sql: `ALTER TABLE ${config.tableName} DROP COLUMN ${config.columnName};`,
      estimatedDurationMs: 1e3,
      canRollback: false,
      requiresMaintenanceWindow: false
    });
    steps.push({
      id: "populate-column-values",
      description: `Populate values for column ${config.columnName}`,
      sql: `UPDATE ${config.tableName} SET ${config.columnName} = 'PLACEHOLDER_VALUE' WHERE ${config.columnName} IS NULL;`,
      estimatedDurationMs: 1e4,
      canRollback: true,
      requiresMaintenanceWindow: true,
      validationQuery: `SELECT COUNT(*) FROM ${config.tableName} WHERE ${config.columnName} IS NULL;`,
      expectedResult: 0
    });
    steps.push({
      id: "add-not-null-constraint",
      description: `Add NOT NULL constraint to column ${config.columnName}`,
      sql: `ALTER TABLE ${config.tableName} ALTER COLUMN ${config.columnName} SET NOT NULL;`,
      estimatedDurationMs: 5e3,
      canRollback: true,
      requiresMaintenanceWindow: true,
      validationQuery: `SELECT is_nullable FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      expectedResult: "NO"
    });
    rollbackSteps.push({
      id: "rollback-not-null-constraint",
      description: `Remove NOT NULL constraint from column ${config.columnName}`,
      sql: `ALTER TABLE ${config.tableName} ALTER COLUMN ${config.columnName} DROP NOT NULL;`,
      estimatedDurationMs: 1e3,
      canRollback: false,
      requiresMaintenanceWindow: false
    });
  }
  /**
   * Generate steps for NOT NULL column with default (medium risk)
   */
  generateNotNullWithDefaultSteps(config, steps, rollbackSteps, warnings) {
    warnings.push(
      "Adding NOT NULL column with default value requires table scan",
      "Operation duration depends on table size",
      "Consider adding during maintenance window for large tables"
    );
    const defaultValue = typeof config.defaultValue === "string" ? `'${config.defaultValue}'` : config.defaultValue;
    steps.push({
      id: "add-not-null-column-with-default",
      description: `Add NOT NULL column ${config.columnName} with default value`,
      sql: `ALTER TABLE ${config.tableName} ADD COLUMN ${config.columnName} ${config.columnType} NOT NULL DEFAULT ${defaultValue}${config.comment ? ` COMMENT '${config.comment}'` : ""};`,
      estimatedDurationMs: 8e3,
      canRollback: true,
      requiresMaintenanceWindow: true,
      validationQuery: `SELECT column_name, is_nullable, column_default FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      expectedResult: { column_name: config.columnName, is_nullable: "NO", column_default: defaultValue }
    });
    rollbackSteps.push({
      id: "rollback-add-not-null-column",
      description: `Remove column ${config.columnName}`,
      sql: `ALTER TABLE ${config.tableName} DROP COLUMN ${config.columnName};`,
      estimatedDurationMs: 2e3,
      canRollback: false,
      requiresMaintenanceWindow: false
    });
  }
  /**
   * Generate steps for nullable column (low risk)
   */
  generateNullableColumnSteps(config, steps, rollbackSteps) {
    const defaultClause = config.defaultValue ? ` DEFAULT ${typeof config.defaultValue === "string" ? `'${config.defaultValue}'` : config.defaultValue}` : "";
    steps.push({
      id: "add-nullable-column",
      description: `Add nullable column ${config.columnName}`,
      sql: `ALTER TABLE ${config.tableName} ADD COLUMN ${config.columnName} ${config.columnType}${defaultClause}${config.comment ? ` COMMENT '${config.comment}'` : ""};`,
      estimatedDurationMs: 1e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      validationQuery: `SELECT column_name FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      expectedResult: config.columnName
    });
    rollbackSteps.push({
      id: "rollback-add-nullable-column",
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
  generateValidationQueries(config) {
    return [
      `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      `SELECT data_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      `SELECT COUNT(*) FROM ${config.tableName} WHERE ${config.columnName} IS NULL;`
    ];
  }
  /**
   * Generate performance impact estimation
   */
  estimatePerformanceImpact(config, tableRowCount) {
    const baseTime = 1e3;
    const rowProcessingTime = tableRowCount * 0.1;
    const typeOverhead = this.getTypeOverhead(config.columnType);
    const estimatedDurationMs = baseTime + rowProcessingTime + typeOverhead;
    const memoryUsageMB = Math.max(10, tableRowCount * 1e-3);
    const diskSpaceRequiredMB = tableRowCount * this.getColumnSize(config.columnType) / (1024 * 1024);
    const recommendedMaintenanceWindow = estimatedDurationMs > 3e4 || !config.nullable;
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
  getTypeOverhead(columnType) {
    const type = columnType.toLowerCase();
    if (type.includes("text") || type.includes("varchar")) {
      return 2e3;
    }
    if (type.includes("json") || type.includes("jsonb")) {
      return 3e3;
    }
    if (type.includes("decimal") || type.includes("numeric")) {
      return 1500;
    }
    return 500;
  }
  /**
   * Get approximate storage size for column types
   */
  getColumnSize(columnType) {
    const type = columnType.toLowerCase();
    if (type.includes("bigint") || type.includes("int8")) return 8;
    if (type.includes("int") || type.includes("integer")) return 4;
    if (type.includes("smallint") || type.includes("int2")) return 2;
    if (type.includes("boolean") || type.includes("bool")) return 1;
    if (type.includes("uuid")) return 16;
    if (type.includes("timestamp")) return 8;
    if (type.includes("date")) return 4;
    if (type.includes("decimal") || type.includes("numeric")) return 8;
    if (type.includes("varchar") || type.includes("text")) return 50;
    if (type.includes("json")) return 100;
    return 8;
  }
};

// src/column-ops/drop-column-pattern.ts
var DropColumnPattern = class {
  /**
   * Generate safe column drop steps
   */
  generateSafeSteps(config) {
    const steps = [];
    const rollbackSteps = [];
    const preflightChecks = [];
    const warnings = [];
    const dataLossWarnings = [];
    const riskLevel = this.assessRiskLevel(config);
    this.addPreflightChecks(config, preflightChecks);
    this.addDataLossWarnings(config, dataLossWarnings);
    if (config.createBackup) {
      this.generateBackupAndDropSteps(config, steps, rollbackSteps, warnings);
    } else {
      this.generateDirectDropSteps(config, steps, rollbackSteps, warnings);
    }
    const estimatedDurationMs = steps.reduce((total, step) => total + step.estimatedDurationMs, 0);
    return {
      steps,
      estimatedDurationMs,
      riskLevel,
      rollbackSteps: rollbackSteps.reverse(),
      // Reverse for proper rollback order
      preflightChecks,
      warnings,
      dataLossWarnings
    };
  }
  /**
   * Assess risk level for column drop
   */
  assessRiskLevel(config) {
    if (!config.confirmDataLoss) {
      return "CRITICAL";
    }
    if (!config.createBackup) {
      return "HIGH";
    }
    return "MEDIUM";
  }
  /**
   * Add preflight checks for the operation
   */
  addPreflightChecks(config, checks) {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Verify column '${config.columnName}' exists in table '${config.tableName}'`,
      `Check if column '${config.columnName}' is part of any indexes`,
      `Check if column '${config.columnName}' is part of any constraints`,
      `Check if column '${config.columnName}' is referenced by foreign keys`,
      `Verify database has sufficient storage space for backup (if creating backup)`,
      `Check for active long-running transactions`,
      `Verify table is not currently locked`
    );
    if (config.createBackup) {
      const backupTableName = config.backupTableName || `${config.tableName}_backup_${Date.now()}`;
      checks.push(
        `Verify backup table name '${backupTableName}' is available`,
        `Check permissions to create backup table`
      );
    }
  }
  /**
   * Add data loss warnings
   */
  addDataLossWarnings(config, warnings) {
    warnings.push(
      `\u26A0\uFE0F  CRITICAL: Dropping column '${config.columnName}' will permanently delete all data in this column`,
      `\u26A0\uFE0F  This operation cannot be undone without a backup`,
      `\u26A0\uFE0F  Ensure all applications and queries no longer reference this column`
    );
    if (!config.createBackup) {
      warnings.push(
        `\u26A0\uFE0F  DANGER: No backup will be created - data will be permanently lost`,
        `\u26A0\uFE0F  Consider creating a backup table before proceeding`
      );
    }
    if (!config.confirmDataLoss) {
      warnings.push(
        `\u26A0\uFE0F  BLOCKED: Cannot proceed without explicit data loss confirmation`,
        `\u26A0\uFE0F  Set confirmDataLoss: true to acknowledge data will be permanently deleted`
      );
    }
  }
  /**
   * Generate steps with backup creation (safer approach)
   */
  generateBackupAndDropSteps(config, steps, rollbackSteps, warnings) {
    const backupTableName = config.backupTableName || `${config.tableName}_backup_${Date.now()}`;
    warnings.push(
      "Creating backup table before dropping column",
      `Backup will be stored in table: ${backupTableName}`,
      "This operation will require additional storage space"
    );
    steps.push({
      id: "create-backup-table",
      description: `Create backup table ${backupTableName}`,
      sql: `CREATE TABLE ${backupTableName} AS SELECT * FROM ${config.tableName};`,
      estimatedDurationMs: 5e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      isDestructive: false,
      validationQuery: `SELECT COUNT(*) FROM ${backupTableName};`,
      expectedResult: "row_count > 0"
    });
    rollbackSteps.push({
      id: "cleanup-backup-table",
      description: `Remove backup table ${backupTableName}`,
      sql: `DROP TABLE IF EXISTS ${backupTableName};`,
      estimatedDurationMs: 1e3,
      canRollback: false,
      requiresMaintenanceWindow: false,
      isDestructive: true
    });
    steps.push({
      id: "drop-dependent-objects",
      description: `Drop indexes and constraints dependent on column ${config.columnName}`,
      sql: `-- This step will be dynamically generated based on discovered dependencies`,
      estimatedDurationMs: 2e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      isDestructive: true,
      validationQuery: `SELECT COUNT(*) FROM information_schema.statistics WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      expectedResult: 0
    });
    steps.push({
      id: "drop-column",
      description: `Drop column ${config.columnName} from table ${config.tableName}`,
      sql: `ALTER TABLE ${config.tableName} DROP COLUMN ${config.columnName};`,
      estimatedDurationMs: 3e3,
      canRollback: false,
      // Cannot rollback after column is dropped
      requiresMaintenanceWindow: true,
      isDestructive: true,
      validationQuery: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      expectedResult: 0
    });
    rollbackSteps.push({
      id: "restore-from-backup",
      description: `Restore table ${config.tableName} from backup ${backupTableName}`,
      sql: `-- MANUAL PROCESS: Compare schemas and restore data as needed from ${backupTableName}`,
      estimatedDurationMs: 3e4,
      canRollback: false,
      requiresMaintenanceWindow: true,
      isDestructive: true
    });
  }
  /**
   * Generate steps for direct drop (higher risk)
   */
  generateDirectDropSteps(config, steps, rollbackSteps, warnings) {
    if (!config.confirmDataLoss) {
      steps.push({
        id: "blocked-operation",
        description: "Operation blocked - data loss confirmation required",
        sql: "-- BLOCKED: Set confirmDataLoss: true to proceed",
        estimatedDurationMs: 0,
        canRollback: false,
        requiresMaintenanceWindow: false,
        isDestructive: false
      });
      return;
    }
    warnings.push(
      "Performing direct column drop without backup",
      "Data will be permanently lost and cannot be recovered",
      "Ensure this is intended and all dependencies are handled"
    );
    steps.push({
      id: "drop-dependent-objects",
      description: `Drop indexes and constraints dependent on column ${config.columnName}`,
      sql: `-- This step will be dynamically generated based on discovered dependencies`,
      estimatedDurationMs: 2e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      isDestructive: true,
      validationQuery: `SELECT COUNT(*) FROM information_schema.statistics WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      expectedResult: 0
    });
    steps.push({
      id: "drop-column",
      description: `Drop column ${config.columnName} from table ${config.tableName}`,
      sql: `ALTER TABLE ${config.tableName} DROP COLUMN ${config.columnName};`,
      estimatedDurationMs: 3e3,
      canRollback: false,
      // Cannot rollback after column is dropped
      requiresMaintenanceWindow: true,
      isDestructive: true,
      validationQuery: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      expectedResult: 0
    });
    rollbackSteps.push({
      id: "no-rollback-available",
      description: "No rollback available - data permanently lost",
      sql: "-- NO ROLLBACK: Column and data permanently deleted",
      estimatedDurationMs: 0,
      canRollback: false,
      requiresMaintenanceWindow: false,
      isDestructive: false
    });
  }
  /**
   * Generate validation queries for the operation
   */
  generateValidationQueries(config) {
    return [
      `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      `SELECT COUNT(*) FROM information_schema.statistics WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      `SELECT COUNT(*) FROM information_schema.key_column_usage WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      `SELECT data_type, is_nullable FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`
    ];
  }
  /**
   * Generate queries to discover dependencies before dropping
   */
  generateDependencyQueries(config) {
    return [
      // Find indexes that include this column
      `SELECT index_name FROM information_schema.statistics WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      // Find foreign key constraints
      `SELECT constraint_name FROM information_schema.key_column_usage WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}' AND referenced_table_name IS NOT NULL;`,
      // Find check constraints (MySQL/PostgreSQL specific)
      `SELECT constraint_name FROM information_schema.check_constraints cc JOIN information_schema.constraint_column_usage ccu ON cc.constraint_name = ccu.constraint_name WHERE ccu.table_name = '${config.tableName}' AND ccu.column_name = '${config.columnName}';`,
      // Find unique constraints
      `SELECT constraint_name FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name WHERE tc.table_name = '${config.tableName}' AND kcu.column_name = '${config.columnName}' AND tc.constraint_type = 'UNIQUE';`
    ];
  }
  /**
   * Generate performance impact estimation
   */
  estimatePerformanceImpact(config, tableRowCount) {
    const baseTime = 2e3;
    const rowProcessingTime = tableRowCount * 0.05;
    const backupTime = config.createBackup ? tableRowCount * 0.2 : 0;
    const estimatedDurationMs = baseTime + rowProcessingTime + backupTime;
    const memoryUsageMB = Math.max(5, tableRowCount * 5e-4);
    const avgColumnSize = 50;
    const diskSpaceFreedMB = tableRowCount * avgColumnSize / (1024 * 1024);
    const diskSpaceRequiredForBackupMB = config.createBackup ? tableRowCount * 200 / (1024 * 1024) : 0;
    const recommendedMaintenanceWindow = estimatedDurationMs > 1e4 || config.createBackup;
    return {
      estimatedDurationMs,
      memoryUsageMB,
      diskSpaceFreedMB,
      diskSpaceRequiredForBackupMB,
      recommendedMaintenanceWindow
    };
  }
  /**
   * Validate configuration before execution
   */
  validateConfig(config) {
    const errors = [];
    if (!config.tableName) {
      errors.push("Table name is required");
    }
    if (!config.columnName) {
      errors.push("Column name is required");
    }
    if (!config.confirmDataLoss) {
      errors.push("Data loss confirmation is required (confirmDataLoss: true)");
    }
    if (config.createBackup && config.backupTableName) {
      if (config.backupTableName === config.tableName) {
        errors.push("Backup table name cannot be the same as source table");
      }
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// src/column-ops/rename-column-pattern.ts
var RenameColumnPattern = class {
  /**
   * Generate safe column rename steps
   */
  generateSafeSteps(config) {
    const steps = [];
    const rollbackSteps = [];
    const preflightChecks = [];
    const warnings = [];
    const riskLevel = this.assessRiskLevel(config);
    this.addPreflightChecks(config, preflightChecks);
    if (config.useTemporaryColumn) {
      this.generateTemporaryColumnSteps(config, steps, rollbackSteps, warnings);
    } else {
      this.generateDirectRenameSteps(config, steps, rollbackSteps, warnings);
    }
    const estimatedDurationMs = steps.reduce((total, step) => total + step.estimatedDurationMs, 0);
    return {
      steps,
      estimatedDurationMs,
      riskLevel,
      rollbackSteps: rollbackSteps.reverse(),
      // Reverse for proper rollback order
      preflightChecks,
      warnings
    };
  }
  /**
   * Assess risk level for column rename
   */
  assessRiskLevel(config) {
    if (config.useTemporaryColumn && config.migrateData) {
      return "MEDIUM";
    }
    if (config.useTemporaryColumn) {
      return "LOW";
    }
    return "MEDIUM";
  }
  /**
   * Add preflight checks for the operation
   */
  addPreflightChecks(config, checks) {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Verify column '${config.oldColumnName}' exists in table '${config.tableName}'`,
      `Verify column '${config.newColumnName}' does not already exist in table '${config.tableName}'`,
      `Check if column '${config.oldColumnName}' is part of any indexes`,
      `Check if column '${config.oldColumnName}' is part of any constraints`,
      `Check if column '${config.oldColumnName}' is referenced by foreign keys`,
      `Verify database has sufficient storage space (if using temporary column)`,
      `Check for active long-running transactions`,
      `Verify table is not currently locked`
    );
    if (config.migrateData) {
      checks.push(
        `Verify data compatibility between old and new column definitions`,
        `Check table size to estimate data migration duration`
      );
    }
  }
  /**
   * Generate steps using temporary column approach (safer)
   */
  generateTemporaryColumnSteps(config, steps, rollbackSteps, warnings) {
    warnings.push(
      "Using temporary column approach for safer rename operation",
      "This method allows for gradual migration and easier rollback",
      "Operation will require temporary storage space"
    );
    const getColumnDefStep = {
      id: "get-column-definition",
      description: `Get definition of column ${config.oldColumnName}`,
      sql: `SELECT column_type, is_nullable, column_default, extra FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.oldColumnName}';`,
      estimatedDurationMs: 500,
      canRollback: false,
      requiresMaintenanceWindow: false,
      validationQuery: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.oldColumnName}';`,
      expectedResult: 1
    };
    steps.push(getColumnDefStep);
    steps.push({
      id: "add-new-column",
      description: `Add new column ${config.newColumnName} with same definition as ${config.oldColumnName}`,
      sql: `-- This will be dynamically generated based on the original column definition`,
      estimatedDurationMs: 2e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      validationQuery: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.newColumnName}';`,
      expectedResult: 1
    });
    rollbackSteps.push({
      id: "remove-new-column",
      description: `Remove new column ${config.newColumnName}`,
      sql: `ALTER TABLE ${config.tableName} DROP COLUMN ${config.newColumnName};`,
      estimatedDurationMs: 1e3,
      canRollback: false,
      requiresMaintenanceWindow: false
    });
    if (config.migrateData) {
      steps.push({
        id: "migrate-data",
        description: `Copy data from ${config.oldColumnName} to ${config.newColumnName}`,
        sql: `UPDATE ${config.tableName} SET ${config.newColumnName} = ${config.oldColumnName};`,
        estimatedDurationMs: 1e4,
        canRollback: true,
        requiresMaintenanceWindow: true,
        validationQuery: `SELECT COUNT(*) FROM ${config.tableName} WHERE ${config.oldColumnName} != ${config.newColumnName} OR (${config.oldColumnName} IS NULL AND ${config.newColumnName} IS NOT NULL) OR (${config.oldColumnName} IS NOT NULL AND ${config.newColumnName} IS NULL);`,
        expectedResult: 0
      });
      steps.push({
        id: "verify-data-integrity",
        description: `Verify data was copied correctly from ${config.oldColumnName} to ${config.newColumnName}`,
        sql: `SELECT COUNT(*) as mismatched_rows FROM ${config.tableName} WHERE ${config.oldColumnName} != ${config.newColumnName};`,
        estimatedDurationMs: 2e3,
        canRollback: false,
        requiresMaintenanceWindow: false,
        validationQuery: `SELECT COUNT(*) FROM ${config.tableName} WHERE ${config.oldColumnName} != ${config.newColumnName};`,
        expectedResult: 0
      });
    }
    steps.push({
      id: "drop-old-column",
      description: `Drop old column ${config.oldColumnName}`,
      sql: `ALTER TABLE ${config.tableName} DROP COLUMN ${config.oldColumnName};`,
      estimatedDurationMs: 3e3,
      canRollback: false,
      // Cannot rollback after column is dropped
      requiresMaintenanceWindow: true,
      validationQuery: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.oldColumnName}';`,
      expectedResult: 0
    });
    rollbackSteps.push({
      id: "rollback-warning",
      description: "Manual intervention required to restore dropped column",
      sql: `-- WARNING: Original column ${config.oldColumnName} was dropped and cannot be automatically restored`,
      estimatedDurationMs: 0,
      canRollback: false,
      requiresMaintenanceWindow: false
    });
  }
  /**
   * Generate steps for direct rename (faster but less safe)
   */
  generateDirectRenameSteps(config, steps, rollbackSteps, warnings) {
    warnings.push(
      "Using direct rename approach - faster but less safe",
      "This method may not be supported on all database systems",
      "Rollback capabilities are limited with this approach"
    );
    const mysqlSql = `ALTER TABLE ${config.tableName} CHANGE ${config.oldColumnName} ${config.newColumnName} -- COLUMN_DEFINITION_HERE;`;
    const postgresqlSql = `ALTER TABLE ${config.tableName} RENAME COLUMN ${config.oldColumnName} TO ${config.newColumnName};`;
    steps.push({
      id: "direct-rename",
      description: `Directly rename column ${config.oldColumnName} to ${config.newColumnName}`,
      sql: `-- Database-specific SQL will be generated: MySQL uses CHANGE, PostgreSQL uses RENAME COLUMN`,
      estimatedDurationMs: 2e3,
      canRollback: true,
      requiresMaintenanceWindow: true,
      validationQuery: `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.newColumnName}';`,
      expectedResult: 1
    });
    rollbackSteps.push({
      id: "rollback-direct-rename",
      description: `Rename column ${config.newColumnName} back to ${config.oldColumnName}`,
      sql: `-- Database-specific rollback SQL will be generated`,
      estimatedDurationMs: 2e3,
      canRollback: false,
      requiresMaintenanceWindow: true
    });
  }
  /**
   * Generate database-specific rename SQL
   */
  generateDatabaseSpecificSql(config, database, columnDefinition) {
    switch (database) {
      case "postgresql":
        return {
          renameSql: `ALTER TABLE ${config.tableName} RENAME COLUMN ${config.oldColumnName} TO ${config.newColumnName};`,
          rollbackSql: `ALTER TABLE ${config.tableName} RENAME COLUMN ${config.newColumnName} TO ${config.oldColumnName};`
        };
      case "mysql":
        const columnDef = columnDefinition || "TEXT";
        return {
          renameSql: `ALTER TABLE ${config.tableName} CHANGE ${config.oldColumnName} ${config.newColumnName} ${columnDef};`,
          rollbackSql: `ALTER TABLE ${config.tableName} CHANGE ${config.newColumnName} ${config.oldColumnName} ${columnDef};`
        };
      case "sqlite":
        return {
          renameSql: `-- SQLite requires table recreation for column rename - use temporary column approach`,
          rollbackSql: `-- SQLite rollback requires table recreation`
        };
      default:
        throw new Error(`Unsupported database: ${database}`);
    }
  }
  /**
   * Generate validation queries for the operation
   */
  generateValidationQueries(config) {
    return [
      `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.oldColumnName}';`,
      `SELECT COUNT(*) FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.newColumnName}';`,
      `SELECT column_type, is_nullable, column_default FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.oldColumnName}';`,
      `SELECT COUNT(*) FROM information_schema.statistics WHERE table_name = '${config.tableName}' AND column_name = '${config.oldColumnName}';`
    ];
  }
  /**
   * Generate performance impact estimation
   */
  estimatePerformanceImpact(config, tableRowCount) {
    const baseTime = config.useTemporaryColumn ? 5e3 : 2e3;
    const dataMigrationTime = config.migrateData ? tableRowCount * 0.1 : 0;
    const estimatedDurationMs = baseTime + dataMigrationTime;
    const memoryUsageMB = Math.max(5, tableRowCount * 5e-4);
    const diskSpaceRequiredMB = config.useTemporaryColumn ? tableRowCount * 50 / (1024 * 1024) : 0;
    const recommendedMaintenanceWindow = config.migrateData || estimatedDurationMs > 1e4;
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
  validateConfig(config) {
    const errors = [];
    if (!config.tableName) {
      errors.push("Table name is required");
    }
    if (!config.oldColumnName) {
      errors.push("Old column name is required");
    }
    if (!config.newColumnName) {
      errors.push("New column name is required");
    }
    if (config.oldColumnName === config.newColumnName) {
      errors.push("Old and new column names must be different");
    }
    const columnNamePattern = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
    if (config.newColumnName && !columnNamePattern.test(config.newColumnName)) {
      errors.push("New column name contains invalid characters");
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// src/column-ops/modify-column-pattern.ts
var ModifyColumnPattern = class {
  /**
   * Generate safe column modification steps
   */
  generateSafeSteps(config) {
    const steps = [];
    const rollbackSteps = [];
    const preflightChecks = [];
    const warnings = [];
    const compatibilityIssues = [];
    const riskLevel = this.assessRiskLevel(config);
    this.addPreflightChecks(config, preflightChecks);
    if (config.validateDataCompatibility) {
      const compatibility = this.checkDataTypeCompatibility(config);
      compatibilityIssues.push(...compatibility.issues);
      if (!compatibility.isCompatible) {
        warnings.push(...compatibility.recommendations);
      }
    }
    if (config.createBackup) {
      this.generateBackupAndModifySteps(config, steps, rollbackSteps, warnings);
    } else if (riskLevel === "CRITICAL") {
      this.generateBlockedSteps(config, steps, warnings);
    } else {
      this.generateDirectModifySteps(config, steps, rollbackSteps, warnings);
    }
    const estimatedDurationMs = steps.reduce((total, step) => total + step.estimatedDurationMs, 0);
    return {
      steps,
      estimatedDurationMs,
      riskLevel,
      rollbackSteps: rollbackSteps.reverse(),
      // Reverse for proper rollback order
      preflightChecks,
      warnings,
      compatibilityIssues
    };
  }
  /**
   * Assess risk level for column modification
   */
  assessRiskLevel(config) {
    const compatibility = this.checkDataTypeCompatibility(config);
    if (compatibility.potentialDataLoss && !config.createBackup) {
      return "CRITICAL";
    }
    if (compatibility.riskLevel === "CRITICAL") {
      return "CRITICAL";
    }
    if (compatibility.riskLevel === "HIGH" || compatibility.potentialDataLoss) {
      return "HIGH";
    }
    if (compatibility.riskLevel === "MEDIUM") {
      return "MEDIUM";
    }
    return "LOW";
  }
  /**
   * Add preflight checks for the operation
   */
  addPreflightChecks(config, checks) {
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
  checkDataTypeCompatibility(config) {
    const result = {
      isCompatible: true,
      riskLevel: "LOW",
      potentialDataLoss: false,
      issues: [],
      recommendations: []
    };
    const newType = config.newColumnType.toLowerCase();
    if (newType.includes("varchar") && newType.includes("(")) {
      const lengthMatch = newType.match(/varchar\((\d+)\)/);
      if (lengthMatch) {
        const newLength = parseInt(lengthMatch[1]);
        if (newLength < 255) {
          result.issues.push(`Reducing VARCHAR length to ${newLength} may cause data truncation`);
          result.potentialDataLoss = true;
          result.riskLevel = "HIGH";
        }
      }
    }
    const typeConversions = [
      { from: ["text", "varchar", "char"], to: ["int", "bigint", "decimal", "numeric"], risk: "CRITICAL" },
      { from: ["int", "bigint"], to: ["varchar", "text"], risk: "MEDIUM" },
      { from: ["decimal", "numeric"], to: ["int", "bigint"], risk: "HIGH" },
      { from: ["timestamp", "datetime"], to: ["date"], risk: "HIGH" },
      { from: ["json", "jsonb"], to: ["text", "varchar"], risk: "MEDIUM" }
    ];
    for (const conversion of typeConversions) {
      if (conversion.to.some((type) => newType.includes(type))) {
        result.issues.push(`Converting to ${config.newColumnType} may require data validation`);
        result.riskLevel = conversion.risk;
        if (conversion.risk === "CRITICAL" || conversion.risk === "HIGH") {
          result.potentialDataLoss = true;
          result.isCompatible = false;
        }
      }
    }
    if (config.newNullable === false) {
      result.issues.push("Making column NOT NULL may fail if existing NULL values exist");
      result.riskLevel = "HIGH";
    }
    if (result.potentialDataLoss) {
      result.recommendations.push(
        "Create a backup before proceeding",
        "Test the conversion on a copy of the data first",
        "Consider using a temporary column approach"
      );
    }
    if (result.riskLevel === "CRITICAL") {
      result.recommendations.push(
        "Manual data validation required before conversion",
        "Consider data migration script instead of direct type change"
      );
    }
    return result;
  }
  /**
   * Generate steps with backup creation (safest approach)
   */
  generateBackupAndModifySteps(config, steps, rollbackSteps, warnings) {
    const backupTableName = `${config.tableName}_backup_${Date.now()}`;
    warnings.push(
      "Creating backup table before modifying column",
      `Backup will be stored in table: ${backupTableName}`,
      "This operation will require additional storage space"
    );
    steps.push({
      id: "create-backup-table",
      description: `Create backup table ${backupTableName}`,
      sql: `CREATE TABLE ${backupTableName} AS SELECT * FROM ${config.tableName};`,
      estimatedDurationMs: 5e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      isDestructive: false,
      validationQuery: `SELECT COUNT(*) FROM ${backupTableName};`,
      expectedResult: "row_count > 0"
    });
    rollbackSteps.push({
      id: "cleanup-backup-table",
      description: `Remove backup table ${backupTableName}`,
      sql: `DROP TABLE IF EXISTS ${backupTableName};`,
      estimatedDurationMs: 1e3,
      canRollback: false,
      requiresMaintenanceWindow: false,
      isDestructive: true
    });
    if (config.validateDataCompatibility) {
      steps.push({
        id: "validate-data-compatibility",
        description: `Validate existing data compatibility with new type ${config.newColumnType}`,
        sql: `-- Data validation queries will be generated based on type conversion`,
        estimatedDurationMs: 3e3,
        canRollback: false,
        requiresMaintenanceWindow: false,
        isDestructive: false,
        validationQuery: `SELECT COUNT(*) FROM ${config.tableName} WHERE ${config.columnName} IS NOT NULL;`,
        expectedResult: "validation_passed"
      });
    }
    steps.push({
      id: "modify-column",
      description: `Modify column ${config.columnName} to type ${config.newColumnType}`,
      sql: this.generateModifyColumnSql(config),
      estimatedDurationMs: 15e3,
      canRollback: false,
      // Column modification is not easily reversible
      requiresMaintenanceWindow: true,
      isDestructive: true,
      validationQuery: `SELECT data_type FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      expectedResult: config.newColumnType.toUpperCase()
    });
    rollbackSteps.push({
      id: "restore-from-backup",
      description: `Restore table ${config.tableName} from backup ${backupTableName}`,
      sql: `-- MANUAL PROCESS: Compare schemas and restore data as needed from ${backupTableName}`,
      estimatedDurationMs: 3e4,
      canRollback: false,
      requiresMaintenanceWindow: true,
      isDestructive: true
    });
  }
  /**
   * Generate steps for direct modification (higher risk)
   */
  generateDirectModifySteps(config, steps, rollbackSteps, warnings) {
    warnings.push(
      "Performing direct column modification without backup",
      "This operation cannot be easily rolled back",
      "Ensure data compatibility has been verified"
    );
    if (config.validateDataCompatibility) {
      steps.push({
        id: "validate-data-compatibility",
        description: `Validate existing data compatibility with new type ${config.newColumnType}`,
        sql: `-- Data validation queries will be generated based on type conversion`,
        estimatedDurationMs: 3e3,
        canRollback: false,
        requiresMaintenanceWindow: false,
        isDestructive: false,
        validationQuery: `SELECT COUNT(*) FROM ${config.tableName} WHERE ${config.columnName} IS NOT NULL;`,
        expectedResult: "validation_passed"
      });
    }
    steps.push({
      id: "modify-column",
      description: `Modify column ${config.columnName} to type ${config.newColumnType}`,
      sql: this.generateModifyColumnSql(config),
      estimatedDurationMs: 15e3,
      canRollback: false,
      // Column modification is not easily reversible
      requiresMaintenanceWindow: true,
      isDestructive: true,
      validationQuery: `SELECT data_type FROM information_schema.columns WHERE table_name = '${config.tableName}' AND column_name = '${config.columnName}';`,
      expectedResult: config.newColumnType.toUpperCase()
    });
    rollbackSteps.push({
      id: "no-rollback-available",
      description: "No automatic rollback available for column type modification",
      sql: "-- NO ROLLBACK: Column type changed and cannot be automatically reverted",
      estimatedDurationMs: 0,
      canRollback: false,
      requiresMaintenanceWindow: false,
      isDestructive: false
    });
  }
  /**
   * Generate blocked steps for critical risk operations
   */
  generateBlockedSteps(config, steps, warnings) {
    warnings.push(
      "Operation blocked due to critical risk level",
      "Potential data loss detected without backup",
      "Create backup or validate data compatibility before proceeding"
    );
    steps.push({
      id: "blocked-operation",
      description: "Operation blocked - critical risk detected",
      sql: "-- BLOCKED: Enable backup creation or fix compatibility issues to proceed",
      estimatedDurationMs: 0,
      canRollback: false,
      requiresMaintenanceWindow: false,
      isDestructive: false
    });
  }
  /**
   * Generate database-specific MODIFY COLUMN SQL
   */
  generateModifyColumnSql(config) {
    let sql = `ALTER TABLE ${config.tableName} MODIFY COLUMN ${config.columnName} ${config.newColumnType}`;
    if (config.newNullable !== void 0) {
      sql += config.newNullable ? "" : " NOT NULL";
    }
    if (config.newDefaultValue !== void 0) {
      const defaultValue = typeof config.newDefaultValue === "string" ? `'${config.newDefaultValue}'` : config.newDefaultValue;
      sql += ` DEFAULT ${defaultValue}`;
    }
    return sql + ";";
  }
  /**
   * Generate database-specific MODIFY COLUMN SQL for different databases
   */
  generateDatabaseSpecificSql(config, database) {
    switch (database) {
      case "postgresql":
        const statements = [];
        statements.push(`ALTER TABLE ${config.tableName} ALTER COLUMN ${config.columnName} TYPE ${config.newColumnType};`);
        if (config.newNullable !== void 0) {
          statements.push(`ALTER TABLE ${config.tableName} ALTER COLUMN ${config.columnName} ${config.newNullable ? "DROP NOT NULL" : "SET NOT NULL"};`);
        }
        if (config.newDefaultValue !== void 0) {
          const defaultValue = typeof config.newDefaultValue === "string" ? `'${config.newDefaultValue}'` : config.newDefaultValue;
          statements.push(`ALTER TABLE ${config.tableName} ALTER COLUMN ${config.columnName} SET DEFAULT ${defaultValue};`);
        }
        return statements.join("\n");
      case "mysql":
        return this.generateModifyColumnSql(config);
      case "sqlite":
        return "-- SQLite requires table recreation for column modification - use backup/restore approach";
      default:
        throw new Error(`Unsupported database: ${database}`);
    }
  }
  /**
   * Generate data validation queries
   */
  generateDataValidationQueries(config) {
    const queries = [];
    const newType = config.newColumnType.toLowerCase();
    if (config.newNullable === false) {
      queries.push(`SELECT COUNT(*) as null_count FROM ${config.tableName} WHERE ${config.columnName} IS NULL;`);
    }
    if (newType.includes("varchar")) {
      const lengthMatch = newType.match(/varchar\((\d+)\)/);
      if (lengthMatch) {
        const maxLength = lengthMatch[1];
        queries.push(`SELECT COUNT(*) as oversized_values FROM ${config.tableName} WHERE LENGTH(${config.columnName}) > ${maxLength};`);
      }
    }
    if (newType.includes("int") || newType.includes("decimal") || newType.includes("numeric")) {
      queries.push(`SELECT COUNT(*) as non_numeric FROM ${config.tableName} WHERE ${config.columnName} IS NOT NULL AND ${config.columnName} NOT REGEXP '^[0-9.-]+$';`);
    }
    if (newType.includes("date") || newType.includes("timestamp")) {
      queries.push(`SELECT COUNT(*) as invalid_dates FROM ${config.tableName} WHERE ${config.columnName} IS NOT NULL AND STR_TO_DATE(${config.columnName}, '%Y-%m-%d') IS NULL;`);
    }
    return queries;
  }
  /**
   * Generate performance impact estimation
   */
  estimatePerformanceImpact(config, tableRowCount) {
    const baseTime = 1e4;
    const rowProcessingTime = tableRowCount * 0.5;
    const backupTime = config.createBackup ? tableRowCount * 0.2 : 0;
    const validationTime = config.validateDataCompatibility ? tableRowCount * 0.1 : 0;
    const estimatedDurationMs = baseTime + rowProcessingTime + backupTime + validationTime;
    const memoryUsageMB = Math.max(20, tableRowCount * 2e-3);
    const diskSpaceRequiredMB = config.createBackup ? tableRowCount * 200 / (1024 * 1024) : 0;
    const recommendedMaintenanceWindow = true;
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
  validateConfig(config) {
    const errors = [];
    if (!config.tableName) {
      errors.push("Table name is required");
    }
    if (!config.columnName) {
      errors.push("Column name is required");
    }
    if (!config.newColumnType) {
      errors.push("New column type is required");
    }
    const validTypes = ["VARCHAR", "TEXT", "INT", "BIGINT", "DECIMAL", "NUMERIC", "DATE", "TIMESTAMP", "BOOLEAN", "JSON"];
    const hasValidType = validTypes.some((type) => config.newColumnType.toUpperCase().includes(type));
    if (!hasValidType) {
      errors.push("Invalid column type specified");
    }
    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

// src/constraint-ops/add-constraint.ts
var AddConstraintPattern = class {
  /**
   * Generate safe constraint addition steps
   */
  generateSafeSteps(config) {
    const steps = [];
    const rollbackSteps = [];
    const preflightChecks = [];
    const warnings = [];
    const constraintName = this.generateConstraintName(config);
    const riskLevel = this.assessRiskLevel(config);
    this.addPreflightChecks(config, constraintName, preflightChecks);
    if (config.constraintType === "CHECK") {
      this.generateCheckConstraintSteps(config, constraintName, steps, rollbackSteps, warnings);
    } else if (config.constraintType === "PRIMARY_KEY") {
      this.generatePrimaryKeySteps(config, constraintName, steps, rollbackSteps, warnings);
    }
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
   * Generate appropriate constraint name
   */
  generateConstraintName(config) {
    if (config.constraintName) {
      return config.constraintName;
    }
    if (config.constraintType === "CHECK") {
      return `chk_${config.tableName}_${Date.now()}`;
    } else if (config.constraintType === "PRIMARY_KEY") {
      const columnPart = config.columnNames?.join("_") || "pk";
      return `pk_${config.tableName}_${columnPart}`;
    }
    return `constraint_${config.tableName}_${Date.now()}`;
  }
  /**
   * Assess risk level for constraint addition
   */
  assessRiskLevel(config) {
    if (config.constraintType === "PRIMARY_KEY" && config.replaceExisting) {
      return "CRITICAL";
    }
    if (config.constraintType === "CHECK" && !config.validateExistingData) {
      return "HIGH";
    }
    if (config.constraintType === "PRIMARY_KEY") {
      return "HIGH";
    }
    return "MEDIUM";
  }
  /**
   * Add preflight checks for constraint addition
   */
  addPreflightChecks(config, constraintName, checks) {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Check if constraint '${constraintName}' already exists`,
      `Verify table is not currently locked`,
      `Check for active long-running transactions`
    );
    if (config.constraintType === "CHECK") {
      checks.push(
        `Validate CHECK expression syntax: ${config.checkExpression}`,
        `Test CHECK expression against existing data`
      );
    } else if (config.constraintType === "PRIMARY_KEY") {
      checks.push(
        `Verify all primary key columns exist: ${config.columnNames?.join(", ")}`,
        `Check for NULL values in primary key columns`,
        `Check for duplicate values in primary key columns`
      );
      if (config.replaceExisting) {
        checks.push(
          `Identify existing primary key constraint`,
          `Verify impact of dropping existing primary key`
        );
      }
    }
  }
  /**
   * Generate CHECK constraint addition steps
   */
  generateCheckConstraintSteps(config, constraintName, steps, rollbackSteps, warnings) {
    if (!config.checkExpression) {
      throw new Error("CHECK expression is required for CHECK constraints");
    }
    if (config.validateExistingData !== false) {
      steps.push({
        id: "validate-existing-data",
        description: `Validate existing data against CHECK constraint`,
        sql: this.generateCheckValidationQuery(config),
        estimatedDurationMs: 8e3,
        canRollback: true,
        requiresMaintenanceWindow: false,
        riskLevel: "LOW",
        validationQuery: this.generateCheckValidationQuery(config),
        expectedResult: 0
      });
      warnings.push(
        "Existing data will be validated against the CHECK constraint",
        "Operation will fail if any existing rows violate the constraint"
      );
    } else {
      warnings.push(
        "CRITICAL: Existing data validation is disabled",
        "Constraint addition may fail if existing data violates the constraint",
        "Consider enabling validation to avoid runtime failures"
      );
    }
    steps.push({
      id: "add-check-constraint",
      description: `Add CHECK constraint ${constraintName}`,
      sql: `ALTER TABLE ${config.tableName} ADD CONSTRAINT ${constraintName} CHECK (${config.checkExpression});`,
      estimatedDurationMs: 3e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "MEDIUM",
      validationQuery: this.generateConstraintValidationQuery(config.tableName, constraintName, "CHECK"),
      expectedResult: constraintName
    });
    rollbackSteps.push({
      id: "rollback-check-constraint",
      description: `Drop CHECK constraint ${constraintName}`,
      sql: `ALTER TABLE ${config.tableName} DROP CONSTRAINT IF EXISTS ${constraintName};`,
      estimatedDurationMs: 2e3,
      canRollback: false,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW"
    });
  }
  /**
   * Generate PRIMARY KEY constraint addition steps
   */
  generatePrimaryKeySteps(config, constraintName, steps, rollbackSteps, warnings) {
    if (!config.columnNames || config.columnNames.length === 0) {
      throw new Error("Column names are required for PRIMARY KEY constraints");
    }
    const columnList = config.columnNames.join(", ");
    steps.push({
      id: "validate-pk-requirements",
      description: `Validate primary key requirements for columns: ${columnList}`,
      sql: this.generatePrimaryKeyValidationQuery(config),
      estimatedDurationMs: 1e4,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "MEDIUM",
      validationQuery: this.generatePrimaryKeyValidationQuery(config),
      expectedResult: 0
    });
    if (config.replaceExisting) {
      warnings.push(
        "CRITICAL: Existing primary key will be dropped",
        "This may affect foreign key relationships",
        "Ensure no foreign keys reference the current primary key",
        "Application code may be affected by primary key changes"
      );
      steps.push({
        id: "backup-existing-pk",
        description: "Backup information about existing primary key",
        sql: this.generatePrimaryKeyBackupQuery(config.tableName),
        estimatedDurationMs: 2e3,
        canRollback: true,
        requiresMaintenanceWindow: false,
        riskLevel: "LOW"
      });
      steps.push({
        id: "drop-existing-pk",
        description: "Drop existing primary key constraint",
        sql: this.generateDropPrimaryKeySQL(config.tableName),
        estimatedDurationMs: 5e3,
        canRollback: false,
        // Cannot easily rollback PK drops
        requiresMaintenanceWindow: true,
        riskLevel: "CRITICAL"
      });
    }
    if (config.createUniqueIndex !== false) {
      const indexName = `idx_${constraintName}_unique`;
      steps.push({
        id: "create-unique-index",
        description: `Create unique index for primary key`,
        sql: `CREATE UNIQUE INDEX ${indexName} ON ${config.tableName} (${columnList});`,
        estimatedDurationMs: 15e3,
        canRollback: true,
        requiresMaintenanceWindow: true,
        riskLevel: "MEDIUM"
      });
      rollbackSteps.push({
        id: "rollback-unique-index",
        description: `Drop unique index ${indexName}`,
        sql: `DROP INDEX IF EXISTS ${indexName};`,
        estimatedDurationMs: 2e3,
        canRollback: false,
        requiresMaintenanceWindow: false,
        riskLevel: "LOW"
      });
    }
    steps.push({
      id: "add-primary-key",
      description: `Add primary key constraint ${constraintName}`,
      sql: `ALTER TABLE ${config.tableName} ADD CONSTRAINT ${constraintName} PRIMARY KEY (${columnList});`,
      estimatedDurationMs: 8e3,
      canRollback: true,
      requiresMaintenanceWindow: true,
      riskLevel: "HIGH",
      validationQuery: this.generateConstraintValidationQuery(config.tableName, constraintName, "PRIMARY KEY"),
      expectedResult: constraintName
    });
    rollbackSteps.push({
      id: "rollback-primary-key",
      description: `Drop primary key constraint ${constraintName}`,
      sql: `ALTER TABLE ${config.tableName} DROP CONSTRAINT IF EXISTS ${constraintName};`,
      estimatedDurationMs: 3e3,
      canRollback: false,
      requiresMaintenanceWindow: false,
      riskLevel: "MEDIUM"
    });
    warnings.push(
      "Primary key changes require maintenance window",
      "Ensure all primary key columns are NOT NULL",
      "Primary key addition will create an implicit unique index"
    );
  }
  /**
   * Generate CHECK constraint validation query
   */
  generateCheckValidationQuery(config) {
    return `
      SELECT COUNT(*) as violation_count
      FROM ${config.tableName}
      WHERE NOT (${config.checkExpression});
    `.trim();
  }
  /**
   * Generate primary key validation query
   */
  generatePrimaryKeyValidationQuery(config) {
    const columnList = config.columnNames.join(", ");
    const nullChecks = config.columnNames.map((col) => `${col} IS NULL`).join(" OR ");
    return `
      SELECT 
        (SELECT COUNT(*) FROM ${config.tableName} WHERE ${nullChecks}) as null_count,
        (SELECT COUNT(*) - COUNT(DISTINCT ${columnList}) FROM ${config.tableName}) as duplicate_count;
    `.trim();
  }
  /**
   * Generate primary key backup query
   */
  generatePrimaryKeyBackupQuery(tableName) {
    return `
      SELECT constraint_name, column_name
      FROM information_schema.key_column_usage
      WHERE table_name = '${tableName}'
        AND constraint_name IN (
          SELECT constraint_name
          FROM information_schema.table_constraints
          WHERE table_name = '${tableName}'
            AND constraint_type = 'PRIMARY KEY'
        );
    `.trim();
  }
  /**
   * Generate drop primary key SQL
   */
  generateDropPrimaryKeySQL(tableName) {
    return `
      ALTER TABLE ${tableName} DROP CONSTRAINT (
        SELECT constraint_name
        FROM information_schema.table_constraints
        WHERE table_name = '${tableName}'
          AND constraint_type = 'PRIMARY KEY'
      );
    `.trim();
  }
  /**
   * Generate constraint validation query
   */
  generateConstraintValidationQuery(tableName, constraintName, constraintType) {
    return `
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = '${tableName}'
        AND constraint_name = '${constraintName}'
        AND constraint_type = '${constraintType}';
    `.trim();
  }
  /**
   * Generate validation queries for the constraint
   */
  generateValidationQueries(config) {
    const constraintName = this.generateConstraintName(config);
    const constraintType = config.constraintType === "PRIMARY_KEY" ? "PRIMARY KEY" : "CHECK";
    const queries = [
      this.generateConstraintValidationQuery(config.tableName, constraintName, constraintType),
      `SELECT COUNT(*) FROM ${config.tableName};`
      // Verify no data loss
    ];
    if (config.constraintType === "CHECK" && config.checkExpression) {
      queries.push(this.generateCheckValidationQuery(config));
    } else if (config.constraintType === "PRIMARY_KEY" && config.columnNames) {
      queries.push(this.generatePrimaryKeyValidationQuery(config));
    }
    return queries;
  }
  /**
   * Estimate performance impact of constraint addition
   */
  estimatePerformanceImpact(config, tableRowCount) {
    const rowsPerSecond = 12e3;
    const memoryPerRow = 15e-4;
    let validationDuration = Math.max(1e3, tableRowCount / rowsPerSecond * 1e3);
    let constraintAdditionDuration = 3e3;
    if (config.constraintType === "PRIMARY_KEY") {
      constraintAdditionDuration = Math.max(8e3, tableRowCount / rowsPerSecond * 2e3);
      if (config.createUniqueIndex !== false) {
        constraintAdditionDuration += Math.max(15e3, tableRowCount / rowsPerSecond * 1500);
      }
    }
    let totalDuration = validationDuration + constraintAdditionDuration;
    if (config.constraintType === "PRIMARY_KEY" && config.replaceExisting) {
      totalDuration += 1e4;
    }
    const memoryUsageMB = Math.max(30, tableRowCount * memoryPerRow);
    const avgRowSize = 100;
    let diskSpaceRequiredMB = 5;
    if (config.constraintType === "PRIMARY_KEY") {
      const pkColumns = config.columnNames?.length || 1;
      diskSpaceRequiredMB = Math.max(10, tableRowCount * avgRowSize * pkColumns / (1024 * 1024));
    }
    const recommendedMaintenanceWindow = tableRowCount > 1e5 || // Large tables
    config.constraintType === "PRIMARY_KEY" || // PK operations
    config.constraintType === "PRIMARY_KEY" && Boolean(config.replaceExisting) || // PK replacement
    config.validateExistingData === false;
    return {
      estimatedDurationMs: Math.round(totalDuration),
      memoryUsageMB: Math.round(memoryUsageMB),
      diskSpaceRequiredMB: Math.round(diskSpaceRequiredMB),
      recommendedMaintenanceWindow
    };
  }
};

// src/constraint-ops/drop-constraint.ts
var DropConstraintPattern = class {
  /**
   * Generate safe constraint drop steps
   */
  generateSafeSteps(config) {
    const steps = [];
    const rollbackSteps = [];
    const preflightChecks = [];
    const warnings = [];
    const riskLevel = this.assessRiskLevel(config);
    this.addPreflightChecks(config, preflightChecks);
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
  assessRiskLevel(config) {
    if (config.constraintType === "PRIMARY_KEY") {
      return "CRITICAL";
    }
    if (config.constraintType === "FOREIGN_KEY" && config.cascadeDelete) {
      return "CRITICAL";
    }
    if (config.constraintType === "FOREIGN_KEY") {
      return "HIGH";
    }
    if (config.constraintType === "UNIQUE") {
      return "MEDIUM";
    }
    return "LOW";
  }
  /**
   * Add preflight checks for constraint drop
   */
  addPreflightChecks(config, checks) {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Verify constraint '${config.constraintName}' exists`,
      `Check constraint type matches expected type: ${config.constraintType}`,
      `Verify table is not currently locked`,
      `Check for active transactions that might be affected`
    );
    if (config.constraintType === "FOREIGN_KEY") {
      checks.push(
        `Identify dependent foreign key relationships`,
        `Check for potential orphan records after constraint drop`,
        `Verify impact on referential integrity`
      );
    }
    if (config.constraintType === "PRIMARY_KEY") {
      checks.push(
        `CRITICAL: Identify all foreign keys referencing this primary key`,
        `Check for applications depending on primary key constraint`,
        `Verify no replication or clustering dependencies on primary key`
      );
    }
    if (config.constraintType === "UNIQUE") {
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
  generateDropSteps(config, steps, rollbackSteps, warnings) {
    if (config.createBackup !== false) {
      steps.push({
        id: "backup-constraint-definition",
        description: `Backup constraint definition for ${config.constraintName}`,
        sql: this.generateConstraintBackupQuery(config),
        estimatedDurationMs: 3e3,
        canRollback: true,
        requiresMaintenanceWindow: false,
        riskLevel: "LOW"
      });
    }
    if (config.validateImpact !== false) {
      steps.push({
        id: "analyze-dependencies",
        description: `Analyze dependencies for constraint ${config.constraintName}`,
        sql: this.generateDependencyAnalysisQuery(config),
        estimatedDurationMs: 5e3,
        canRollback: true,
        requiresMaintenanceWindow: false,
        riskLevel: "LOW"
      });
    }
    this.addConstraintSpecificSteps(config, steps, rollbackSteps, warnings);
    const dropSQL = this.generateDropConstraintSQL(config);
    const dropRisk = this.getDropRiskLevel(config);
    steps.push({
      id: "drop-constraint",
      description: `Drop ${config.constraintType} constraint ${config.constraintName}`,
      sql: dropSQL,
      estimatedDurationMs: this.estimateDropDuration(config),
      canRollback: false,
      // Constraint drops are generally not easily reversible
      requiresMaintenanceWindow: this.requiresMaintenanceWindow(config),
      riskLevel: dropRisk,
      validationQuery: this.generateDropValidationQuery(config),
      expectedResult: 0
      // Should return 0 rows if constraint is dropped
    });
    this.addRollbackSteps(config, rollbackSteps);
    this.addConstraintSpecificWarnings(config, warnings);
  }
  /**
   * Add constraint-specific preparation steps
   */
  addConstraintSpecificSteps(config, steps, rollbackSteps, warnings) {
    switch (config.constraintType) {
      case "PRIMARY_KEY":
        this.addPrimaryKeyDropSteps(config, steps, rollbackSteps, warnings);
        break;
      case "FOREIGN_KEY":
        this.addForeignKeyDropSteps(config, steps, rollbackSteps, warnings);
        break;
      case "UNIQUE":
        this.addUniqueConstraintDropSteps(config, steps, rollbackSteps, warnings);
        break;
      case "CHECK":
        this.addCheckConstraintDropSteps(config, steps, rollbackSteps, warnings);
        break;
    }
  }
  /**
   * Add primary key specific drop steps
   */
  addPrimaryKeyDropSteps(config, steps, rollbackSteps, warnings) {
    warnings.push(
      "CRITICAL: Dropping primary key constraint is extremely dangerous",
      "This will affect all foreign key relationships",
      "Application code may fail without primary key constraint",
      "Consider adding a new primary key before dropping the old one"
    );
    steps.push({
      id: "check-pk-dependencies",
      description: "Check for foreign key dependencies on primary key",
      sql: this.generatePrimaryKeyDependencyQuery(config),
      estimatedDurationMs: 8e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "HIGH",
      validationQuery: this.generatePrimaryKeyDependencyQuery(config),
      expectedResult: 0
      // Should be 0 if no dependencies
    });
  }
  /**
   * Add foreign key specific drop steps
   */
  addForeignKeyDropSteps(config, steps, rollbackSteps, warnings) {
    warnings.push(
      "Dropping foreign key constraint removes referential integrity protection",
      "Applications may be able to create orphan records after constraint removal",
      "Consider the impact on data consistency"
    );
    if (config.cascadeDelete) {
      warnings.push(
        "CRITICAL: CASCADE option may delete related data",
        "Ensure you have complete backups before proceeding"
      );
    }
    steps.push({
      id: "analyze-referential-integrity",
      description: "Analyze current referential integrity before FK drop",
      sql: this.generateReferentialIntegrityQuery(config),
      estimatedDurationMs: 12e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "MEDIUM"
    });
  }
  /**
   * Add unique constraint specific drop steps
   */
  addUniqueConstraintDropSteps(config, steps, rollbackSteps, warnings) {
    warnings.push(
      "Dropping unique constraint allows duplicate values to be inserted",
      "Applications depending on uniqueness guarantee may fail",
      "Associated unique index may also be dropped"
    );
    steps.push({
      id: "check-associated-indexes",
      description: "Check for indexes associated with unique constraint",
      sql: this.generateAssociatedIndexQuery(config),
      estimatedDurationMs: 3e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW"
    });
  }
  /**
   * Add check constraint specific drop steps
   */
  addCheckConstraintDropSteps(config, steps, rollbackSteps, warnings) {
    warnings.push(
      "Dropping check constraint removes data validation rules",
      "Invalid data may be inserted after constraint removal"
    );
    steps.push({
      id: "get-check-definition",
      description: "Retrieve CHECK constraint definition for rollback",
      sql: this.generateCheckDefinitionQuery(config),
      estimatedDurationMs: 2e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW"
    });
  }
  /**
   * Generate constraint backup query
   */
  generateConstraintBackupQuery(config) {
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
  generateDependencyAnalysisQuery(config) {
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
  generateDropConstraintSQL(config) {
    let sql = `ALTER TABLE ${config.tableName} DROP CONSTRAINT ${config.constraintName}`;
    if (config.cascadeDelete && config.constraintType === "FOREIGN_KEY") {
      sql += " CASCADE";
    }
    return sql + ";";
  }
  /**
   * Generate primary key dependency query
   */
  generatePrimaryKeyDependencyQuery(config) {
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
  generateReferentialIntegrityQuery(config) {
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
  generateAssociatedIndexQuery(config) {
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
  generateCheckDefinitionQuery(config) {
    return `
      SELECT check_clause
      FROM information_schema.check_constraints
      WHERE constraint_name = '${config.constraintName}';
    `.trim();
  }
  /**
   * Generate drop validation query
   */
  generateDropValidationQuery(config) {
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
  getDropRiskLevel(config) {
    return this.assessRiskLevel(config);
  }
  /**
   * Estimate drop duration
   */
  estimateDropDuration(config) {
    switch (config.constraintType) {
      case "PRIMARY_KEY":
        return 1e4;
      // PK drops are complex
      case "FOREIGN_KEY":
        return 5e3;
      // FK drops require integrity checks
      case "UNIQUE":
        return 3e3;
      // May need to drop associated index
      case "CHECK":
        return 2e3;
      // Simple constraint drops
      default:
        return 3e3;
    }
  }
  /**
   * Check if maintenance window is required
   */
  requiresMaintenanceWindow(config) {
    return config.constraintType === "PRIMARY_KEY" || config.constraintType === "FOREIGN_KEY" && config.cascadeDelete === true;
  }
  /**
   * Add rollback steps for constraint recreation
   */
  addRollbackSteps(config, rollbackSteps) {
    rollbackSteps.push({
      id: "rollback-constraint-drop",
      description: `Recreate ${config.constraintType} constraint ${config.constraintName}`,
      sql: `-- Rollback requires manual intervention with backed up constraint definition`,
      estimatedDurationMs: 5e3,
      canRollback: false,
      requiresMaintenanceWindow: true,
      riskLevel: "HIGH"
    });
  }
  /**
   * Add constraint-specific warnings
   */
  addConstraintSpecificWarnings(config, warnings) {
    warnings.push(
      `Constraint drop cannot be easily rolled back`,
      `Ensure you have backed up the constraint definition`,
      `Consider the impact on application functionality`
    );
    if (config.constraintType === "PRIMARY_KEY") {
      warnings.push(
        "Primary key drop will affect table replication",
        "Some database tools may not work without primary key"
      );
    }
  }
  /**
   * Generate validation queries for the constraint drop
   */
  generateValidationQueries(config) {
    return [
      this.generateDropValidationQuery(config),
      `SELECT COUNT(*) FROM ${config.tableName};`,
      // Verify no data loss
      this.generateConstraintBackupQuery(config)
    ];
  }
  /**
   * Estimate performance impact of constraint drop
   */
  estimatePerformanceImpact(config, tableRowCount) {
    const baseDropDuration = this.estimateDropDuration(config);
    const memoryUsageMB = Math.max(10, tableRowCount * 5e-4);
    const diskSpaceRequiredMB = 5;
    const recommendedMaintenanceWindow = this.requiresMaintenanceWindow(config);
    return {
      estimatedDurationMs: baseDropDuration,
      memoryUsageMB: Math.round(memoryUsageMB),
      diskSpaceRequiredMB,
      recommendedMaintenanceWindow
    };
  }
};

// src/constraint-ops/foreign-key.ts
var ForeignKeyPattern = class {
  /**
   * Generate safe foreign key constraint addition steps
   */
  generateSafeSteps(config) {
    const steps = [];
    const rollbackSteps = [];
    const preflightChecks = [];
    const warnings = [];
    const constraintName = config.constraintName || `fk_${config.tableName}_${config.columnNames.join("_")}_${config.referencedTableName}`;
    const riskLevel = this.assessRiskLevel(config);
    this.addPreflightChecks(config, constraintName, preflightChecks);
    this.generateConstraintSteps(config, constraintName, steps, rollbackSteps, warnings);
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
   * Assess risk level for foreign key constraint addition
   */
  assessRiskLevel(config) {
    if (config.handleOrphans === "fail") {
      return "CRITICAL";
    }
    if (config.handleOrphans === "remove") {
      return "HIGH";
    }
    if (config.onDelete === "CASCADE" || config.onUpdate === "CASCADE") {
      return "HIGH";
    }
    if (config.handleOrphans === "set_null" && config.columnNames.some((col) => !col.endsWith("_nullable"))) {
      return "MEDIUM";
    }
    return "LOW";
  }
  /**
   * Add preflight checks for foreign key constraint addition
   */
  addPreflightChecks(config, constraintName, checks) {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Verify referenced table '${config.referencedTableName}' exists`,
      `Check if constraint '${constraintName}' already exists`,
      `Verify all source columns exist: ${config.columnNames.join(", ")}`,
      `Verify all referenced columns exist: ${config.referencedColumnNames.join(", ")}`,
      `Check for orphan records that violate the foreign key`,
      `Verify referenced table has appropriate indexes on referenced columns`,
      `Check for active transactions on both tables`,
      `Verify sufficient privileges for constraint creation`
    );
    if (config.handleOrphans === "remove") {
      checks.push(
        `Backup orphan records before removal`,
        `Verify orphan handling strategy is acceptable`
      );
    }
    if (config.onDelete === "CASCADE" || config.onUpdate === "CASCADE") {
      checks.push(
        `WARNING: Cascading operations can affect multiple rows`,
        `Verify cascade behavior is intended and safe`
      );
    }
  }
  /**
   * Generate foreign key constraint addition steps
   */
  generateConstraintSteps(config, constraintName, steps, rollbackSteps, warnings) {
    steps.push({
      id: "check-orphans",
      description: `Check for orphan records that would violate foreign key constraint`,
      sql: this.generateOrphanCheckQuery(config),
      estimatedDurationMs: 1e4,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW",
      validationQuery: this.generateOrphanCheckQuery(config),
      expectedResult: 0
    });
    if (config.handleOrphans === "remove") {
      this.addOrphanRemovalSteps(config, steps, rollbackSteps, warnings);
    } else if (config.handleOrphans === "mark") {
      this.addOrphanMarkingSteps(config, steps, rollbackSteps, warnings);
    } else if (config.handleOrphans === "set_null") {
      this.addOrphanNullificationSteps(config, steps, rollbackSteps, warnings);
    }
    steps.push({
      id: "ensure-referenced-index",
      description: `Ensure index exists on referenced columns`,
      sql: this.generateReferencedIndexSQL(config),
      estimatedDurationMs: 8e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW"
    });
    const constraintSQL = this.generateForeignKeyConstraintSQL(config, constraintName);
    const constraintRisk = config.deferrable ? "LOW" : "MEDIUM";
    steps.push({
      id: "add-foreign-key-constraint",
      description: `Add foreign key constraint ${constraintName}`,
      sql: constraintSQL,
      estimatedDurationMs: 5e3,
      canRollback: true,
      requiresMaintenanceWindow: !config.deferrable,
      riskLevel: constraintRisk,
      validationQuery: this.generateConstraintValidationQuery(config.tableName, constraintName),
      expectedResult: constraintName
    });
    rollbackSteps.push({
      id: "rollback-foreign-key-constraint",
      description: `Drop foreign key constraint ${constraintName}`,
      sql: `ALTER TABLE ${config.tableName} DROP CONSTRAINT IF EXISTS ${constraintName};`,
      estimatedDurationMs: 2e3,
      canRollback: false,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW"
    });
    this.addWarnings(config, warnings);
  }
  /**
   * Generate SQL to check for orphan records
   */
  generateOrphanCheckQuery(config) {
    const sourceColumns = config.columnNames.join(", ");
    const referencedColumns = config.referencedColumnNames.join(", ");
    const joinConditions = config.columnNames.map(
      (col, index) => `child.${col} = parent.${config.referencedColumnNames[index]}`
    ).join(" AND ");
    return `
      SELECT COUNT(*) as orphan_count
      FROM ${config.tableName} child
      LEFT JOIN ${config.referencedTableName} parent ON ${joinConditions}
      WHERE parent.${config.referencedColumnNames[0]} IS NULL
        AND child.${config.columnNames[0]} IS NOT NULL;
    `.trim();
  }
  /**
   * Add orphan removal steps
   */
  addOrphanRemovalSteps(config, steps, rollbackSteps, warnings) {
    warnings.push(
      "DESTRUCTIVE OPERATION: Orphan record removal will permanently delete data",
      "Ensure you have a complete backup before proceeding",
      "Consider manual orphan resolution instead of automatic removal"
    );
    if (config.orphanHandlingStrategy === "backup_first") {
      steps.push({
        id: "backup-orphans",
        description: "Create backup of orphan records",
        sql: this.generateOrphanBackupSQL(config),
        estimatedDurationMs: 15e3,
        canRollback: true,
        requiresMaintenanceWindow: false,
        riskLevel: "MEDIUM"
      });
    }
    steps.push({
      id: "remove-orphans",
      description: "Remove orphan records that violate foreign key constraint",
      sql: this.generateOrphanRemovalSQL(config),
      estimatedDurationMs: 25e3,
      canRollback: false,
      // Cannot rollback data deletion
      requiresMaintenanceWindow: true,
      riskLevel: "HIGH"
    });
  }
  /**
   * Add orphan marking steps
   */
  addOrphanMarkingSteps(config, steps, rollbackSteps, warnings) {
    warnings.push(
      "Orphan records will be marked but not removed",
      "Manual intervention required to resolve orphan relationships",
      "Constraint addition will fail until orphans are resolved"
    );
    steps.push({
      id: "add-orphan-marker",
      description: "Add column to mark orphan records",
      sql: `ALTER TABLE ${config.tableName} ADD COLUMN IF NOT EXISTS _orphan_marker BOOLEAN DEFAULT FALSE;`,
      estimatedDurationMs: 2e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW"
    });
    steps.push({
      id: "mark-orphans",
      description: "Mark orphan records for manual resolution",
      sql: this.generateOrphanMarkingSQL(config),
      estimatedDurationMs: 12e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW"
    });
  }
  /**
   * Add orphan nullification steps
   */
  addOrphanNullificationSteps(config, steps, rollbackSteps, warnings) {
    warnings.push(
      "Orphan records will have foreign key columns set to NULL",
      "Ensure foreign key columns are nullable before proceeding",
      "This may affect application logic that depends on these values"
    );
    steps.push({
      id: "nullify-orphans",
      description: "Set orphan foreign key values to NULL",
      sql: this.generateOrphanNullificationSQL(config),
      estimatedDurationMs: 15e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "MEDIUM"
    });
  }
  /**
   * Generate referenced table index SQL
   */
  generateReferencedIndexSQL(config) {
    const referencedColumns = config.referencedColumnNames.join(", ");
    const indexName = `idx_${config.referencedTableName}_${config.referencedColumnNames.join("_")}_fk`;
    return `
      CREATE INDEX IF NOT EXISTS ${indexName} 
      ON ${config.referencedTableName} (${referencedColumns});
    `.trim();
  }
  /**
   * Generate foreign key constraint SQL
   */
  generateForeignKeyConstraintSQL(config, constraintName) {
    const sourceColumns = config.columnNames.join(", ");
    const referencedColumns = config.referencedColumnNames.join(", ");
    let sql = `ALTER TABLE ${config.tableName} ADD CONSTRAINT ${constraintName} `;
    sql += `FOREIGN KEY (${sourceColumns}) `;
    sql += `REFERENCES ${config.referencedTableName} (${referencedColumns})`;
    if (config.onDelete) {
      sql += ` ON DELETE ${config.onDelete}`;
    }
    if (config.onUpdate) {
      sql += ` ON UPDATE ${config.onUpdate}`;
    }
    if (config.deferrable) {
      sql += ` DEFERRABLE`;
      if (config.initiallyDeferred) {
        sql += ` INITIALLY DEFERRED`;
      }
    }
    return sql + ";";
  }
  /**
   * Generate orphan backup SQL
   */
  generateOrphanBackupSQL(config) {
    const backupTableName = `${config.tableName}_orphans_backup_${Date.now()}`;
    const joinConditions = config.columnNames.map(
      (col, index) => `child.${col} = parent.${config.referencedColumnNames[index]}`
    ).join(" AND ");
    return `
      CREATE TABLE ${backupTableName} AS
      SELECT child.*
      FROM ${config.tableName} child
      LEFT JOIN ${config.referencedTableName} parent ON ${joinConditions}
      WHERE parent.${config.referencedColumnNames[0]} IS NULL
        AND child.${config.columnNames[0]} IS NOT NULL;
    `.trim();
  }
  /**
   * Generate orphan removal SQL
   */
  generateOrphanRemovalSQL(config) {
    const joinConditions = config.columnNames.map(
      (col, index) => `child.${col} = parent.${config.referencedColumnNames[index]}`
    ).join(" AND ");
    return `
      DELETE child
      FROM ${config.tableName} child
      LEFT JOIN ${config.referencedTableName} parent ON ${joinConditions}
      WHERE parent.${config.referencedColumnNames[0]} IS NULL
        AND child.${config.columnNames[0]} IS NOT NULL;
    `.trim();
  }
  /**
   * Generate orphan marking SQL
   */
  generateOrphanMarkingSQL(config) {
    const joinConditions = config.columnNames.map(
      (col, index) => `child.${col} = parent.${config.referencedColumnNames[index]}`
    ).join(" AND ");
    return `
      UPDATE ${config.tableName} child
      LEFT JOIN ${config.referencedTableName} parent ON ${joinConditions}
      SET child._orphan_marker = TRUE
      WHERE parent.${config.referencedColumnNames[0]} IS NULL
        AND child.${config.columnNames[0]} IS NOT NULL;
    `.trim();
  }
  /**
   * Generate orphan nullification SQL
   */
  generateOrphanNullificationSQL(config) {
    const joinConditions = config.columnNames.map(
      (col, index) => `child.${col} = parent.${config.referencedColumnNames[index]}`
    ).join(" AND ");
    const nullificationSets = config.columnNames.map((col) => `child.${col} = NULL`).join(", ");
    return `
      UPDATE ${config.tableName} child
      LEFT JOIN ${config.referencedTableName} parent ON ${joinConditions}
      SET ${nullificationSets}
      WHERE parent.${config.referencedColumnNames[0]} IS NULL
        AND child.${config.columnNames[0]} IS NOT NULL;
    `.trim();
  }
  /**
   * Generate constraint validation query
   */
  generateConstraintValidationQuery(tableName, constraintName) {
    return `
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = '${tableName}'
        AND constraint_name = '${constraintName}'
        AND constraint_type = 'FOREIGN KEY';
    `.trim();
  }
  /**
   * Add configuration-specific warnings
   */
  addWarnings(config, warnings) {
    if (config.onDelete === "CASCADE" || config.onUpdate === "CASCADE") {
      warnings.push("CASCADE operations can affect multiple tables and rows");
    }
    if (config.handleOrphans === "fail") {
      warnings.push("Operation will fail if any orphan records exist");
    }
    if (!config.deferrable) {
      warnings.push("Non-deferrable constraints are checked immediately and may require maintenance window");
    }
    if (config.handleOrphans === "set_null") {
      warnings.push("Ensure foreign key columns are nullable before using set_null strategy");
    }
  }
  /**
   * Generate validation queries for the constraint
   */
  generateValidationQueries(config) {
    const constraintName = config.constraintName || `fk_${config.tableName}_${config.columnNames.join("_")}_${config.referencedTableName}`;
    return [
      this.generateOrphanCheckQuery(config),
      this.generateConstraintValidationQuery(config.tableName, constraintName),
      `SELECT COUNT(*) FROM ${config.tableName};`,
      // Verify no data loss
      `SELECT COUNT(*) FROM ${config.referencedTableName};`
      // Verify referenced table integrity
    ];
  }
  /**
   * Estimate performance impact of foreign key constraint addition
   */
  estimatePerformanceImpact(config, sourceTableRowCount, referencedTableRowCount) {
    const rowsPerSecond = 8e3;
    const memoryPerRow = 2e-3;
    const orphanCheckDuration = Math.max(2e3, sourceTableRowCount / rowsPerSecond * 1e3);
    const indexCreationDuration = Math.max(3e3, referencedTableRowCount / rowsPerSecond * 1e3);
    const constraintAdditionDuration = Math.max(5e3, sourceTableRowCount / rowsPerSecond * 2e3);
    let totalDuration = orphanCheckDuration + indexCreationDuration + constraintAdditionDuration;
    if (config.handleOrphans === "remove") {
      totalDuration += sourceTableRowCount / rowsPerSecond * 3e3;
    } else if (config.handleOrphans === "set_null") {
      totalDuration += sourceTableRowCount / rowsPerSecond * 1500;
    }
    const memoryUsageMB = Math.max(100, (sourceTableRowCount + referencedTableRowCount) * memoryPerRow);
    const avgRowSize = 150;
    const diskSpaceRequiredMB = Math.max(
      20,
      sourceTableRowCount * avgRowSize * config.columnNames.length / (1024 * 1024)
    );
    const recommendedMaintenanceWindow = sourceTableRowCount > 5e4 || // Large source tables
    referencedTableRowCount > 1e5 || // Large referenced tables
    config.handleOrphans === "remove" || // Data deletion
    !config.deferrable || // Non-deferrable constraints
    config.onDelete === "CASCADE" || config.onUpdate === "CASCADE";
    return {
      estimatedDurationMs: Math.round(totalDuration),
      memoryUsageMB: Math.round(memoryUsageMB),
      diskSpaceRequiredMB: Math.round(diskSpaceRequiredMB),
      recommendedMaintenanceWindow
    };
  }
};

// src/constraint-ops/unique-constraint.ts
var UniqueConstraintPattern = class {
  /**
   * Generate safe unique constraint addition steps
   */
  generateSafeSteps(config) {
    const steps = [];
    const rollbackSteps = [];
    const preflightChecks = [];
    const warnings = [];
    const constraintName = config.constraintName || `uq_${config.tableName}_${config.columnNames.join("_")}`;
    const riskLevel = this.assessRiskLevel(config);
    this.addPreflightChecks(config, constraintName, preflightChecks);
    this.generateConstraintSteps(config, constraintName, steps, rollbackSteps, warnings);
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
   * Assess risk level for unique constraint addition
   */
  assessRiskLevel(config) {
    if (config.handleDuplicates === "fail") {
      return "CRITICAL";
    }
    if (config.handleDuplicates === "remove") {
      return "HIGH";
    }
    if (config.columnNames.length > 3) {
      return "MEDIUM";
    }
    return "LOW";
  }
  /**
   * Add preflight checks for unique constraint addition
   */
  addPreflightChecks(config, constraintName, checks) {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Check if constraint '${constraintName}' already exists`,
      `Verify all columns exist: ${config.columnNames.join(", ")}`,
      `Check for duplicate values in target columns`,
      `Verify table is not currently locked`,
      `Check available disk space for operation`
    );
    if (config.handleDuplicates === "remove") {
      checks.push(
        `Backup table data before duplicate removal`,
        `Verify duplicate handling strategy is acceptable`
      );
    }
  }
  /**
   * Generate constraint addition steps
   */
  generateConstraintSteps(config, constraintName, steps, rollbackSteps, warnings) {
    const columnList = config.columnNames.join(", ");
    steps.push({
      id: "check-duplicates",
      description: `Check for duplicate values in columns: ${columnList}`,
      sql: this.generateDuplicateCheckQuery(config),
      estimatedDurationMs: 5e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW",
      validationQuery: this.generateDuplicateCheckQuery(config),
      expectedResult: 0
    });
    if (config.handleDuplicates === "remove") {
      this.addDuplicateRemovalSteps(config, steps, rollbackSteps, warnings);
    } else if (config.handleDuplicates === "mark") {
      this.addDuplicateMarkingSteps(config, steps, rollbackSteps, warnings);
    }
    const usesConcurrentIndex = config.createConcurrently === true;
    steps.push({
      id: "create-unique-index",
      description: `Create unique index for constraint ${constraintName}`,
      sql: this.generateUniqueIndexSQL(config, constraintName, usesConcurrentIndex),
      estimatedDurationMs: usesConcurrentIndex ? 3e4 : 15e3,
      canRollback: true,
      requiresMaintenanceWindow: !usesConcurrentIndex,
      riskLevel: usesConcurrentIndex ? "LOW" : "MEDIUM"
    });
    rollbackSteps.push({
      id: "rollback-unique-index",
      description: `Drop unique index for constraint ${constraintName}`,
      sql: `DROP INDEX IF EXISTS idx_${constraintName};`,
      estimatedDurationMs: 2e3,
      canRollback: false,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW"
    });
    steps.push({
      id: "add-unique-constraint",
      description: `Add unique constraint ${constraintName}`,
      sql: `ALTER TABLE ${config.tableName} ADD CONSTRAINT ${constraintName} UNIQUE (${columnList});`,
      estimatedDurationMs: 3e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW",
      validationQuery: this.generateConstraintValidationQuery(config.tableName, constraintName),
      expectedResult: constraintName
    });
    rollbackSteps.push({
      id: "rollback-unique-constraint",
      description: `Drop unique constraint ${constraintName}`,
      sql: `ALTER TABLE ${config.tableName} DROP CONSTRAINT IF EXISTS ${constraintName};`,
      estimatedDurationMs: 2e3,
      canRollback: false,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW"
    });
    this.addWarnings(config, warnings);
  }
  /**
   * Generate SQL to check for duplicate values
   */
  generateDuplicateCheckQuery(config) {
    const columnList = config.columnNames.join(", ");
    return `
      SELECT COUNT(*) as duplicate_count
      FROM (
        SELECT ${columnList}, COUNT(*) as cnt
        FROM ${config.tableName}
        WHERE ${config.columnNames.map((col) => `${col} IS NOT NULL`).join(" AND ")}
        GROUP BY ${columnList}
        HAVING COUNT(*) > 1
      ) duplicates;
    `.trim();
  }
  /**
   * Add duplicate removal steps
   */
  addDuplicateRemovalSteps(config, steps, rollbackSteps, warnings) {
    warnings.push(
      "DESTRUCTIVE OPERATION: Duplicate removal will permanently delete data",
      "Ensure you have a complete backup before proceeding",
      "Consider manual duplicate resolution instead of automatic removal"
    );
    steps.push({
      id: "backup-duplicates",
      description: "Create backup of duplicate records",
      sql: this.generateDuplicateBackupSQL(config),
      estimatedDurationMs: 1e4,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "MEDIUM"
    });
    steps.push({
      id: "remove-duplicates",
      description: "Remove duplicate records",
      sql: this.generateDuplicateRemovalSQL(config),
      estimatedDurationMs: 2e4,
      canRollback: false,
      // Cannot rollback data deletion
      requiresMaintenanceWindow: true,
      riskLevel: "HIGH"
    });
  }
  /**
   * Add duplicate marking steps
   */
  addDuplicateMarkingSteps(config, steps, rollbackSteps, warnings) {
    warnings.push(
      "Duplicate records will be marked but not removed",
      "Manual intervention required to resolve duplicates",
      "Constraint addition will fail until duplicates are resolved"
    );
    steps.push({
      id: "add-duplicate-marker",
      description: "Add column to mark duplicate records",
      sql: `ALTER TABLE ${config.tableName} ADD COLUMN IF NOT EXISTS _duplicate_marker BOOLEAN DEFAULT FALSE;`,
      estimatedDurationMs: 2e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW"
    });
    steps.push({
      id: "mark-duplicates",
      description: "Mark duplicate records for manual resolution",
      sql: this.generateDuplicateMarkingSQL(config),
      estimatedDurationMs: 1e4,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW"
    });
  }
  /**
   * Generate unique index creation SQL
   */
  generateUniqueIndexSQL(config, constraintName, concurrent) {
    const columnList = config.columnNames.join(", ");
    const concurrentClause = concurrent ? "CONCURRENTLY" : "";
    return `CREATE UNIQUE INDEX ${concurrentClause} idx_${constraintName} ON ${config.tableName} (${columnList});`.trim();
  }
  /**
   * Generate duplicate backup SQL
   */
  generateDuplicateBackupSQL(config) {
    const columnList = config.columnNames.join(", ");
    const backupTableName = `${config.tableName}_duplicates_backup_${Date.now()}`;
    return `
      CREATE TABLE ${backupTableName} AS
      SELECT *
      FROM ${config.tableName}
      WHERE (${columnList}) IN (
        SELECT ${columnList}
        FROM ${config.tableName}
        WHERE ${config.columnNames.map((col) => `${col} IS NOT NULL`).join(" AND ")}
        GROUP BY ${columnList}
        HAVING COUNT(*) > 1
      );
    `.trim();
  }
  /**
   * Generate duplicate removal SQL
   */
  generateDuplicateRemovalSQL(config) {
    const columnList = config.columnNames.join(", ");
    const keepStrategy = config.duplicateHandlingStrategy || "keep_first";
    const orderClause = keepStrategy === "keep_last" ? "DESC" : "ASC";
    return `
      DELETE FROM ${config.tableName}
      WHERE ctid NOT IN (
        SELECT ctid
        FROM (
          SELECT ctid, ROW_NUMBER() OVER (
            PARTITION BY ${columnList} 
            ORDER BY ctid ${orderClause}
          ) as rn
          FROM ${config.tableName}
          WHERE ${config.columnNames.map((col) => `${col} IS NOT NULL`).join(" AND ")}
        ) ranked
        WHERE rn = 1
      );
    `.trim();
  }
  /**
   * Generate duplicate marking SQL
   */
  generateDuplicateMarkingSQL(config) {
    const columnList = config.columnNames.join(", ");
    return `
      UPDATE ${config.tableName}
      SET _duplicate_marker = TRUE
      WHERE (${columnList}) IN (
        SELECT ${columnList}
        FROM ${config.tableName}
        WHERE ${config.columnNames.map((col) => `${col} IS NOT NULL`).join(" AND ")}
        GROUP BY ${columnList}
        HAVING COUNT(*) > 1
      );
    `.trim();
  }
  /**
   * Generate constraint validation query
   */
  generateConstraintValidationQuery(tableName, constraintName) {
    return `
      SELECT constraint_name
      FROM information_schema.table_constraints
      WHERE table_name = '${tableName}'
        AND constraint_name = '${constraintName}'
        AND constraint_type = 'UNIQUE';
    `.trim();
  }
  /**
   * Add configuration-specific warnings
   */
  addWarnings(config, warnings) {
    if (config.columnNames.length > 3) {
      warnings.push("Complex composite unique constraints may impact query performance");
    }
    if (config.createConcurrently === false) {
      warnings.push("Non-concurrent index creation will require maintenance window");
    }
    if (config.handleDuplicates === "fail") {
      warnings.push("Operation will fail if any duplicate values exist");
    }
  }
  /**
   * Generate validation queries for the constraint
   */
  generateValidationQueries(config) {
    const constraintName = config.constraintName || `uq_${config.tableName}_${config.columnNames.join("_")}`;
    return [
      this.generateDuplicateCheckQuery(config),
      this.generateConstraintValidationQuery(config.tableName, constraintName),
      `SELECT COUNT(*) FROM ${config.tableName};`
      // Verify no data loss
    ];
  }
  /**
   * Estimate performance impact of constraint addition
   */
  estimatePerformanceImpact(config, tableRowCount) {
    const rowsPerSecond = 1e4;
    const indexOverheadFactor = 1.5;
    const memoryPerRow = 1e-3;
    const duplicateCheckDuration = Math.max(1e3, tableRowCount / rowsPerSecond * 1e3);
    const indexCreationDuration = Math.max(5e3, tableRowCount / rowsPerSecond * 1e3 * indexOverheadFactor);
    const constraintAdditionDuration = 3e3;
    let totalDuration = duplicateCheckDuration + indexCreationDuration + constraintAdditionDuration;
    if (config.handleDuplicates === "remove") {
      totalDuration += tableRowCount / rowsPerSecond * 2e3;
    }
    const memoryUsageMB = Math.max(50, tableRowCount * memoryPerRow);
    const avgRowSize = 100;
    const indexColumns = config.columnNames.length;
    const diskSpaceRequiredMB = Math.max(10, tableRowCount * avgRowSize * indexColumns / (1024 * 1024));
    const recommendedMaintenanceWindow = tableRowCount > 1e5 || // Large tables
    config.handleDuplicates === "remove" || // Data deletion
    config.createConcurrently === false;
    return {
      estimatedDurationMs: Math.round(totalDuration),
      memoryUsageMB: Math.round(memoryUsageMB),
      diskSpaceRequiredMB: Math.round(diskSpaceRequiredMB),
      recommendedMaintenanceWindow
    };
  }
};

// src/index-ops/create-index.ts
var CreateIndexPattern = class {
  /**
   * Generate safe index creation steps
   */
  generateSafeSteps(config) {
    const steps = [];
    const rollbackSteps = [];
    const preflightChecks = [];
    const warnings = [];
    const redundantIndexes = [];
    const optimizationSuggestions = [];
    const indexName = config.indexName || this.generateIndexName(config);
    const riskLevel = this.assessRiskLevel(config);
    this.addPreflightChecks(config, indexName, preflightChecks);
    this.generateIndexCreationSteps(config, indexName, steps, rollbackSteps, warnings);
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
  generateIndexName(config) {
    const columnPart = config.columnNames.join("_");
    const uniquePart = config.unique ? "unique_" : "";
    const typePart = config.indexType && config.indexType !== "BTREE" ? `_${config.indexType.toLowerCase()}` : "";
    return `idx_${uniquePart}${config.tableName}_${columnPart}${typePart}`;
  }
  /**
   * Assess risk level for index creation
   */
  assessRiskLevel(config) {
    if (config.columnNames.length > 6) {
      return "HIGH";
    }
    if (config.indexType === "GIN" || config.indexType === "GIST") {
      return "MEDIUM";
    }
    if (config.unique && !config.partial) {
      return "MEDIUM";
    }
    return "LOW";
  }
  /**
   * Add preflight checks for index creation
   */
  addPreflightChecks(config, indexName, checks) {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Check if index '${indexName}' already exists`,
      `Verify all columns exist: ${config.columnNames.join(", ")}`,
      `Check available disk space for index creation`,
      `Verify database has sufficient memory for operation`,
      `Estimate index size and creation time`
    );
    if (config.includeColumns && config.includeColumns.length > 0) {
      checks.push(
        `Verify include columns exist: ${config.includeColumns.join(", ")}`,
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
  generateIndexCreationSteps(config, indexName, steps, rollbackSteps, warnings) {
    steps.push({
      id: "estimate-index-impact",
      description: `Estimate size and performance impact of index ${indexName}`,
      sql: this.generateIndexEstimationQuery(config),
      estimatedDurationMs: 5e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW"
    });
    steps.push({
      id: "analyze-existing-indexes",
      description: `Analyze existing indexes on table ${config.tableName}`,
      sql: this.generateExistingIndexAnalysisQuery(config),
      estimatedDurationMs: 3e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW"
    });
    const createSQL = this.generateCreateIndexSQL(config, indexName);
    const estimatedDuration = this.estimateIndexCreationDuration(config);
    steps.push({
      id: "create-index",
      description: `Create index ${indexName} on table ${config.tableName}`,
      sql: createSQL,
      estimatedDurationMs: estimatedDuration,
      canRollback: true,
      requiresMaintenanceWindow: this.requiresMaintenanceWindow(config),
      riskLevel: config.unique ? "MEDIUM" : "LOW",
      validationQuery: this.generateIndexValidationQuery(config.tableName, indexName),
      expectedResult: indexName
    });
    if (config.databaseType === "postgresql") {
      steps.push({
        id: "update-statistics",
        description: `Update table statistics for ${config.tableName}`,
        sql: `ANALYZE ${config.tableName};`,
        estimatedDurationMs: 3e3,
        canRollback: true,
        requiresMaintenanceWindow: false,
        riskLevel: "LOW"
      });
    }
    rollbackSteps.push({
      id: "rollback-index-creation",
      description: `Drop index ${indexName} if creation failed`,
      sql: this.generateDropIndexSQL(config, indexName),
      estimatedDurationMs: 5e3,
      canRollback: false,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW"
    });
    this.addIndexSpecificWarnings(config, warnings);
  }
  /**
   * Generate redundancy analysis steps
   */
  generateRedundancyAnalysisSteps(config, steps, redundantIndexes, optimizationSuggestions) {
    steps.push({
      id: "redundancy-analysis",
      description: `Analyze index redundancy for table ${config.tableName}`,
      sql: this.generateRedundancyAnalysisQuery(config),
      estimatedDurationMs: 8e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW"
    });
    optimizationSuggestions.push(
      "Consider combining similar indexes for better performance",
      "Remove unused indexes to improve write performance",
      "Use partial indexes for frequently queried subsets",
      "Consider covering indexes for query optimization"
    );
  }
  /**
   * Generate CREATE INDEX SQL
   */
  generateCreateIndexSQL(config, indexName) {
    const columnList = config.columnNames.join(", ");
    const uniqueClause = config.unique ? "UNIQUE " : "";
    const indexTypeClause = this.getIndexTypeClause(config);
    const includeClause = this.getIncludeClause(config);
    const partialClause = config.partial && config.partialCondition ? ` WHERE ${config.partialCondition}` : "";
    const storageClause = this.getStorageClause(config);
    return `CREATE ${uniqueClause}INDEX ${indexName} ON ${config.tableName}${indexTypeClause} (${columnList})${includeClause}${partialClause}${storageClause};`;
  }
  /**
   * Get index type clause based on database
   */
  getIndexTypeClause(config) {
    if (!config.indexType || config.indexType === "BTREE") {
      return "";
    }
    switch (config.databaseType) {
      case "postgresql":
        return ` USING ${config.indexType}`;
      case "mysql":
        return config.indexType === "HASH" ? " USING HASH" : "";
      case "sqlite":
        return "";
      // SQLite only supports BTREE-style indexes
      default:
        return "";
    }
  }
  /**
   * Get include clause for covering indexes
   */
  getIncludeClause(config) {
    if (!config.includeColumns || config.includeColumns.length === 0) {
      return "";
    }
    if (config.databaseType === "postgresql") {
      return ` INCLUDE (${config.includeColumns.join(", ")})`;
    }
    return "";
  }
  /**
   * Get storage parameters clause
   */
  getStorageClause(config) {
    if (!config.storageParameters || Object.keys(config.storageParameters).length === 0) {
      return "";
    }
    if (config.databaseType === "postgresql") {
      const params = Object.entries(config.storageParameters).map(([key, value]) => `${key} = ${value}`).join(", ");
      return ` WITH (${params})`;
    }
    return "";
  }
  /**
   * Generate index estimation query
   */
  generateIndexEstimationQuery(config) {
    switch (config.databaseType) {
      case "postgresql":
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
      case "mysql":
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
      case "sqlite":
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
  generateExistingIndexAnalysisQuery(config) {
    switch (config.databaseType) {
      case "postgresql":
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
      case "mysql":
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
      case "sqlite":
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
  generateRedundancyAnalysisQuery(config) {
    switch (config.databaseType) {
      case "postgresql":
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
      case "mysql":
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
      case "sqlite":
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
  generateIndexValidationQuery(tableName, indexName) {
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
  generateDropIndexSQL(config, indexName) {
    switch (config.databaseType) {
      case "postgresql":
        return `DROP INDEX IF EXISTS ${indexName};`;
      case "mysql":
        return `ALTER TABLE ${config.tableName} DROP INDEX IF EXISTS ${indexName};`;
      case "sqlite":
        return `DROP INDEX IF EXISTS ${indexName};`;
      default:
        return `DROP INDEX IF EXISTS ${indexName};`;
    }
  }
  /**
   * Estimate index creation duration
   */
  estimateIndexCreationDuration(config) {
    const baseDuration = 1e4;
    const columnFactor = config.columnNames.length * 2e3;
    const uniqueFactor = config.unique ? 5e3 : 0;
    const typeFactor = this.getIndexTypeFactor(config.indexType) * 1e3;
    return baseDuration + columnFactor + uniqueFactor + typeFactor;
  }
  /**
   * Get index type duration factor
   */
  getIndexTypeFactor(indexType) {
    switch (indexType) {
      case "GIN":
        return 15;
      // GIN indexes take longer
      case "GIST":
        return 12;
      // GIST indexes are complex
      case "HASH":
        return 3;
      // Hash indexes are faster
      case "BRIN":
        return 5;
      // BRIN indexes are moderately fast
      default:
        return 8;
    }
  }
  /**
   * Check if maintenance window is required
   */
  requiresMaintenanceWindow(config) {
    return config.unique || // Unique indexes may lock for duplicate checks
    config.indexType === "GIN" || config.indexType === "GIST" || // Complex index types
    config.databaseType === "sqlite";
  }
  /**
   * Add index-specific warnings
   */
  addIndexSpecificWarnings(config, warnings) {
    if (config.columnNames.length > 4) {
      warnings.push("Composite index with many columns may impact write performance");
    }
    if (config.unique) {
      warnings.push("Unique index creation will fail if duplicate values exist");
    }
    if (config.indexType === "GIN" || config.indexType === "GIST") {
      warnings.push("Specialized index types require more maintenance overhead");
    }
    if (config.partial && !config.partialCondition) {
      warnings.push("Partial index specified but no condition provided");
    }
    warnings.push(
      "Index creation will impact write performance until completion",
      "Monitor disk space usage during index creation",
      "Consider creating index during low-traffic periods"
    );
  }
  /**
   * Generate validation queries for the index
   */
  generateValidationQueries(config) {
    const indexName = config.indexName || this.generateIndexName(config);
    return [
      this.generateIndexValidationQuery(config.tableName, indexName),
      `SELECT COUNT(*) FROM ${config.tableName};`,
      // Verify table accessibility
      this.generateExistingIndexAnalysisQuery(config)
    ];
  }
  /**
   * Estimate performance impact of index creation
   */
  estimatePerformanceImpact(config, tableRowCount) {
    const rowsPerSecond = 1e4;
    const memoryPerRow = 3e-3;
    const complexityFactor = config.columnNames.length * 1.5;
    const typeFactor = this.getIndexTypeFactor(config.indexType);
    const uniqueFactor = config.unique ? 1.4 : 1;
    const baseDuration = tableRowCount / rowsPerSecond * 1e3;
    const adjustedDuration = baseDuration * complexityFactor * typeFactor * uniqueFactor;
    const memoryUsageMB = Math.max(50, tableRowCount * memoryPerRow);
    const avgIndexEntrySize = 60;
    const indexSizeEstimateMB = Math.max(
      5,
      tableRowCount * avgIndexEntrySize * config.columnNames.length / (1024 * 1024)
    );
    if (config.includeColumns && config.includeColumns.length > 0) {
      const includeSize = indexSizeEstimateMB * (config.includeColumns.length * 0.3);
      return {
        ...this.estimatePerformanceImpact(config, tableRowCount),
        indexSizeEstimateMB: indexSizeEstimateMB + includeSize
      };
    }
    const diskSpaceRequiredMB = indexSizeEstimateMB * 1.5;
    const recommendedMaintenanceWindow = this.requiresMaintenanceWindow(config) || tableRowCount > 5e5;
    return {
      estimatedDurationMs: Math.round(adjustedDuration),
      memoryUsageMB: Math.round(memoryUsageMB),
      diskSpaceRequiredMB: Math.round(diskSpaceRequiredMB),
      recommendedMaintenanceWindow,
      indexSizeEstimateMB: Math.round(indexSizeEstimateMB)
    };
  }
};

// src/index-ops/drop-index.ts
var DropIndexPattern = class {
  /**
   * Generate safe index drop steps
   */
  generateSafeSteps(config) {
    const steps = [];
    const rollbackSteps = [];
    const preflightChecks = [];
    const warnings = [];
    const backupStatements = [];
    const performanceImpactQueries = [];
    const riskLevel = this.assessRiskLevel(config);
    this.addPreflightChecks(config, preflightChecks);
    if (config.checkQueryPerformance) {
      this.generatePerformanceImpactQueries(config, performanceImpactQueries);
    }
    if (config.createBackup) {
      this.generateBackupStatements(config, backupStatements);
    }
    this.generateDatabaseSpecificSteps(config, steps, rollbackSteps, warnings);
    const estimatedDurationMs = steps.reduce((total, step) => total + step.estimatedDurationMs, 0);
    return {
      steps,
      estimatedDurationMs,
      riskLevel,
      rollbackSteps: rollbackSteps.reverse(),
      preflightChecks,
      warnings,
      backupStatements: backupStatements.length > 0 ? backupStatements : void 0,
      performanceImpactQueries: performanceImpactQueries.length > 0 ? performanceImpactQueries : void 0
    };
  }
  /**
   * Assess risk level for index drop
   */
  assessRiskLevel(config) {
    if (config.indexName.toLowerCase().includes("primary") || config.indexName.toLowerCase().includes("pk_")) {
      return "CRITICAL";
    }
    if (config.indexName.toLowerCase().includes("unique") || config.indexName.toLowerCase().includes("uq_")) {
      return "HIGH";
    }
    if (config.indexName.toLowerCase().includes("foreign") || config.indexName.toLowerCase().includes("fk_")) {
      return "MEDIUM";
    }
    return "LOW";
  }
  /**
   * Add preflight checks for index drop
   */
  addPreflightChecks(config, checks) {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Verify index '${config.indexName}' exists on table`,
      `Check if index is referenced by constraints`,
      `Identify queries that currently use this index`,
      `Check for foreign key dependencies on this index`,
      `Verify no long-running transactions are using the index`
    );
    if (config.databaseType === "postgresql") {
      checks.push(
        `Check if index is used for constraint enforcement`,
        `Verify no concurrent index operations are running`,
        `Check index usage statistics from pg_stat_user_indexes`
      );
    }
    if (config.databaseType === "mysql") {
      checks.push(
        `Check if index is part of a composite foreign key`,
        `Verify storage engine supports index dropping: ${config.cascadeOptions ? "with cascade" : "without cascade"}`,
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
  generatePerformanceImpactQueries(config, queries) {
    switch (config.databaseType) {
      case "postgresql":
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
      case "mysql":
        queries.push(
          `SELECT INDEX_NAME, CARDINALITY, SUB_PART, PACKED, NULLABLE, INDEX_TYPE, COMMENT, INDEX_COMMENT 
           FROM information_schema.STATISTICS 
           WHERE TABLE_NAME = '${config.tableName}' AND INDEX_NAME = '${config.indexName}'`,
          `SHOW INDEX FROM ${config.tableName} WHERE Key_name = '${config.indexName}'`
        );
        break;
      case "sqlite":
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
  generateBackupStatements(config, statements) {
    switch (config.databaseType) {
      case "postgresql":
        statements.push(
          `-- Backup command to recreate index '${config.indexName}'`,
          `SELECT indexdef FROM pg_indexes WHERE indexname = '${config.indexName}' AND tablename = '${config.tableName}';`,
          `-- Note: Save the returned CREATE INDEX statement for rollback`
        );
        break;
      case "mysql":
        statements.push(
          `-- Backup command to recreate index '${config.indexName}'`,
          `SHOW CREATE TABLE ${config.tableName};`,
          `-- Note: Extract the index definition from the CREATE TABLE statement for rollback`
        );
        break;
      case "sqlite":
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
  generateDatabaseSpecificSteps(config, steps, rollbackSteps, warnings) {
    switch (config.databaseType) {
      case "postgresql":
        this.generatePostgreSQLSteps(config, steps, rollbackSteps, warnings);
        break;
      case "mysql":
        this.generateMySQLSteps(config, steps, rollbackSteps, warnings);
        break;
      case "sqlite":
        this.generateSQLiteSteps(config, steps, rollbackSteps, warnings);
        break;
    }
  }
  /**
   * Generate PostgreSQL index drop steps
   */
  generatePostgreSQLSteps(config, steps, rollbackSteps, warnings) {
    warnings.push(
      "PostgreSQL index drops are generally safe but immediate",
      "Consider using DROP INDEX CONCURRENTLY for large indexes",
      "Index drop will briefly lock the table",
      "Verify no critical queries depend on this index"
    );
    if (config.createBackup) {
      steps.push({
        id: "backup_index_definition",
        description: `Backup index definition for '${config.indexName}'`,
        sql: `SELECT indexdef FROM pg_indexes WHERE indexname = '${config.indexName}' AND tablename = '${config.tableName}';`,
        estimatedDurationMs: 100,
        canRollback: false,
        requiresMaintenanceWindow: false,
        riskLevel: "LOW",
        databaseSpecific: ["postgresql"]
      });
    }
    steps.push({
      id: "check_constraint_dependencies",
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
      riskLevel: "LOW",
      databaseSpecific: ["postgresql"]
    });
    const dropSql = `DROP INDEX${config.cascadeOptions ? " CASCADE" : ""} IF EXISTS ${config.indexName};`;
    steps.push({
      id: "drop_index",
      description: `Drop index '${config.indexName}' from table '${config.tableName}'`,
      sql: dropSql,
      estimatedDurationMs: 500,
      canRollback: config.createBackup,
      requiresMaintenanceWindow: false,
      validationQuery: `SELECT COUNT(*) FROM pg_indexes WHERE indexname = '${config.indexName}' AND tablename = '${config.tableName}';`,
      expectedResult: 0,
      riskLevel: config.cascadeOptions ? "HIGH" : "MEDIUM",
      databaseSpecific: ["postgresql"]
    });
    if (config.createBackup) {
      rollbackSteps.push({
        id: "recreate_index",
        description: `Recreate index '${config.indexName}' using backed up definition`,
        sql: `-- Execute the CREATE INDEX statement from backup`,
        estimatedDurationMs: 2e3,
        canRollback: false,
        requiresMaintenanceWindow: true,
        riskLevel: "MEDIUM",
        databaseSpecific: ["postgresql"]
      });
    }
  }
  /**
   * Generate MySQL index drop steps
   */
  generateMySQLSteps(config, steps, rollbackSteps, warnings) {
    warnings.push(
      "MySQL index drops may briefly lock the table",
      "Consider maintenance window for large tables",
      "Verify index is not part of foreign key constraint"
    );
    if (config.createBackup) {
      steps.push({
        id: "backup_index_definition",
        description: `Backup index definition for '${config.indexName}'`,
        sql: `SHOW CREATE TABLE ${config.tableName};`,
        estimatedDurationMs: 100,
        canRollback: false,
        requiresMaintenanceWindow: false,
        riskLevel: "LOW",
        databaseSpecific: ["mysql"]
      });
    }
    steps.push({
      id: "check_foreign_key_dependencies",
      description: `Check if index '${config.indexName}' is used by foreign keys`,
      sql: `SELECT CONSTRAINT_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME 
            FROM information_schema.KEY_COLUMN_USAGE 
            WHERE TABLE_NAME = '${config.tableName}' 
            AND REFERENCED_TABLE_NAME IS NOT NULL;`,
      estimatedDurationMs: 200,
      canRollback: false,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW",
      databaseSpecific: ["mysql"]
    });
    const dropSql = `ALTER TABLE ${config.tableName} DROP INDEX ${config.indexName};`;
    steps.push({
      id: "drop_index",
      description: `Drop index '${config.indexName}' from table '${config.tableName}'`,
      sql: dropSql,
      estimatedDurationMs: 1e3,
      canRollback: config.createBackup,
      requiresMaintenanceWindow: true,
      validationQuery: `SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_NAME = '${config.tableName}' AND INDEX_NAME = '${config.indexName}';`,
      expectedResult: 0,
      riskLevel: "MEDIUM",
      databaseSpecific: ["mysql"]
    });
    if (config.createBackup) {
      rollbackSteps.push({
        id: "recreate_index",
        description: `Recreate index '${config.indexName}' using backed up definition`,
        sql: `-- Extract and execute the index definition from SHOW CREATE TABLE backup`,
        estimatedDurationMs: 3e3,
        canRollback: false,
        requiresMaintenanceWindow: true,
        riskLevel: "HIGH",
        databaseSpecific: ["mysql"]
      });
    }
  }
  /**
   * Generate SQLite index drop steps
   */
  generateSQLiteSteps(config, steps, rollbackSteps, warnings) {
    warnings.push(
      "SQLite index drops are immediate but safe",
      "No table locking occurs during index drop",
      "Consider impact on query performance"
    );
    if (config.createBackup) {
      steps.push({
        id: "backup_index_definition",
        description: `Backup index definition for '${config.indexName}'`,
        sql: `SELECT sql FROM sqlite_master WHERE type = 'index' AND name = '${config.indexName}';`,
        estimatedDurationMs: 50,
        canRollback: false,
        requiresMaintenanceWindow: false,
        riskLevel: "LOW",
        databaseSpecific: ["sqlite"]
      });
    }
    const dropSql = `DROP INDEX IF EXISTS ${config.indexName};`;
    steps.push({
      id: "drop_index",
      description: `Drop index '${config.indexName}'`,
      sql: dropSql,
      estimatedDurationMs: 100,
      canRollback: config.createBackup,
      requiresMaintenanceWindow: false,
      validationQuery: `SELECT COUNT(*) FROM sqlite_master WHERE type = 'index' AND name = '${config.indexName}';`,
      expectedResult: 0,
      riskLevel: "LOW",
      databaseSpecific: ["sqlite"]
    });
    if (config.createBackup) {
      rollbackSteps.push({
        id: "recreate_index",
        description: `Recreate index '${config.indexName}' using backed up definition`,
        sql: `-- Execute the CREATE INDEX statement from backup`,
        estimatedDurationMs: 500,
        canRollback: false,
        requiresMaintenanceWindow: false,
        riskLevel: "LOW",
        databaseSpecific: ["sqlite"]
      });
    }
  }
  /**
   * Generate validation queries for index drop operation
   */
  generateValidationQueries(config) {
    const queries = [];
    switch (config.databaseType) {
      case "postgresql":
        queries.push(
          `SELECT COUNT(*) FROM pg_indexes WHERE indexname = '${config.indexName}' AND tablename = '${config.tableName}';`,
          `SELECT schemaname, tablename, indexname, indexdef FROM pg_indexes WHERE tablename = '${config.tableName}';`
        );
        break;
      case "mysql":
        queries.push(
          `SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_NAME = '${config.tableName}' AND INDEX_NAME = '${config.indexName}';`,
          `SHOW INDEX FROM ${config.tableName};`
        );
        break;
      case "sqlite":
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
  estimatePerformanceImpact(config, tableRowCount) {
    let estimatedDurationMs = 100;
    let potentialQuerySlowdown = "MINOR";
    const affectedQueryTypes = [];
    const recommendedActions = [];
    switch (config.databaseType) {
      case "postgresql":
        estimatedDurationMs = Math.min(500, tableRowCount / 1e4 * 100);
        break;
      case "mysql":
        estimatedDurationMs = Math.min(2e3, tableRowCount / 5e3 * 100);
        break;
      case "sqlite":
        estimatedDurationMs = 50;
        break;
    }
    if (config.indexName.toLowerCase().includes("primary") || config.indexName.toLowerCase().includes("pk_")) {
      potentialQuerySlowdown = "SEVERE";
      affectedQueryTypes.push("Primary key lookups", "Join operations", "All queries");
      recommendedActions.push("DO NOT DROP - Primary key indexes are essential");
    } else if (config.indexName.toLowerCase().includes("unique") || config.indexName.toLowerCase().includes("uq_")) {
      potentialQuerySlowdown = "MODERATE";
      affectedQueryTypes.push("Unique constraint checks", "Equality searches");
      recommendedActions.push("Verify no unique constraints depend on this index");
    } else if (config.indexName.toLowerCase().includes("foreign") || config.indexName.toLowerCase().includes("fk_")) {
      potentialQuerySlowdown = "MODERATE";
      affectedQueryTypes.push("Foreign key constraint checks", "Join operations");
      recommendedActions.push("Check foreign key constraint dependencies");
    } else {
      potentialQuerySlowdown = "MINOR";
      affectedQueryTypes.push("Range queries", "Sorting operations", "Filtered searches");
      recommendedActions.push("Monitor query performance after index drop");
    }
    if (tableRowCount > 1e6) {
      recommendedActions.push("Consider maintenance window for large table");
      if (config.databaseType === "mysql") {
        estimatedDurationMs *= 2;
      }
    }
    const riskAssessment = `Risk Level: ${this.assessRiskLevel(config)} - Dropping this index may impact query performance. ${potentialQuerySlowdown === "SEVERE" ? "CRITICAL: This appears to be a system-critical index." : potentialQuerySlowdown === "MODERATE" ? "CAUTION: This index may be important for performance." : "Generally safe to drop with minimal performance impact."}`;
    return {
      estimatedDurationMs,
      potentialQuerySlowdown,
      affectedQueryTypes,
      recommendedActions,
      riskAssessment
    };
  }
};

// src/index-ops/concurrent-index.ts
var ConcurrentIndexPattern = class {
  /**
   * Generate safe concurrent index creation steps
   */
  generateSafeSteps(config) {
    const steps = [];
    const rollbackSteps = [];
    const preflightChecks = [];
    const warnings = [];
    const indexName = config.indexName || this.generateIndexName(config);
    const riskLevel = this.assessRiskLevel(config);
    this.addPreflightChecks(config, indexName, preflightChecks);
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
  generateIndexName(config) {
    const columnPart = config.columnNames.join("_");
    const uniquePart = config.unique ? "unique_" : "";
    return `idx_${uniquePart}${config.tableName}_${columnPart}`;
  }
  /**
   * Assess risk level for concurrent index creation
   */
  assessRiskLevel(config) {
    if (config.databaseType === "sqlite") {
      return "MEDIUM";
    }
    if (config.columnNames.length > 5) {
      return "MEDIUM";
    }
    if (config.indexType === "GIN" || config.indexType === "GIST") {
      return "MEDIUM";
    }
    return "LOW";
  }
  /**
   * Add preflight checks for concurrent index creation
   */
  addPreflightChecks(config, indexName, checks) {
    checks.push(
      `Verify table '${config.tableName}' exists`,
      `Check if index '${indexName}' already exists`,
      `Verify all columns exist: ${config.columnNames.join(", ")}`,
      `Check available disk space for index creation`,
      `Verify database has sufficient memory for operation`,
      `Check for long-running transactions that might block index creation`
    );
    if (config.databaseType === "postgresql") {
      checks.push(
        `Verify PostgreSQL version supports CONCURRENTLY (9.2+)`,
        `Check for conflicting index creation operations`,
        `Verify connection will not timeout during long operation`
      );
    }
    if (config.databaseType === "mysql") {
      checks.push(
        `Verify MySQL version supports online index creation (5.6+)`,
        `Check storage engine supports online operations: ${config.storageEngine || "InnoDB"}`,
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
  generateDatabaseSpecificSteps(config, indexName, steps, rollbackSteps, warnings) {
    switch (config.databaseType) {
      case "postgresql":
        this.generatePostgreSQLSteps(config, indexName, steps, rollbackSteps, warnings);
        break;
      case "mysql":
        this.generateMySQLSteps(config, indexName, steps, rollbackSteps, warnings);
        break;
      case "sqlite":
        this.generateSQLiteSteps(config, indexName, steps, rollbackSteps, warnings);
        break;
    }
  }
  /**
   * Generate PostgreSQL concurrent index creation steps
   */
  generatePostgreSQLSteps(config, indexName, steps, rollbackSteps, warnings) {
    warnings.push(
      "PostgreSQL CONCURRENTLY index creation is safe for production",
      "Operation may take significant time on large tables",
      "Index creation will not block reads or writes",
      "Connection must remain stable throughout the operation"
    );
    steps.push({
      id: "check-existing-indexes",
      description: `Check for existing or conflicting indexes on ${config.tableName}`,
      sql: this.generateExistingIndexCheckQuery(config),
      estimatedDurationMs: 3e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW",
      databaseSpecific: ["postgresql"]
    });
    steps.push({
      id: "estimate-index-metrics",
      description: "Estimate index size and creation duration",
      sql: this.generateIndexEstimationQuery(config),
      estimatedDurationMs: 2e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW",
      databaseSpecific: ["postgresql"]
    });
    const createSQL = this.generatePostgreSQLCreateIndexSQL(config, indexName);
    steps.push({
      id: "create-concurrent-index",
      description: `Create index ${indexName} concurrently`,
      sql: createSQL,
      estimatedDurationMs: 6e4,
      // Conservative estimate for large tables
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW",
      validationQuery: this.generateIndexValidationQuery(config.tableName, indexName),
      expectedResult: indexName,
      databaseSpecific: ["postgresql"]
    });
    steps.push({
      id: "analyze-new-index",
      description: `Analyze newly created index ${indexName}`,
      sql: `ANALYZE ${config.tableName};`,
      estimatedDurationMs: 5e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW",
      databaseSpecific: ["postgresql"]
    });
    rollbackSteps.push({
      id: "rollback-concurrent-index",
      description: `Drop index ${indexName} if creation failed`,
      sql: `DROP INDEX CONCURRENTLY IF EXISTS ${indexName};`,
      estimatedDurationMs: 1e4,
      canRollback: false,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW",
      databaseSpecific: ["postgresql"]
    });
  }
  /**
   * Generate MySQL online index creation steps
   */
  generateMySQLSteps(config, indexName, steps, rollbackSteps, warnings) {
    warnings.push(
      "MySQL online index creation requires InnoDB storage engine",
      "ALGORITHM=INPLACE and LOCK=NONE for concurrent operation",
      "Operation may require significant temporary disk space",
      "Monitor innodb_online_alter_log_max_size during operation"
    );
    steps.push({
      id: "verify-storage-engine",
      description: `Verify ${config.tableName} uses InnoDB storage engine`,
      sql: this.generateStorageEngineCheckQuery(config),
      estimatedDurationMs: 1e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW",
      databaseSpecific: ["mysql"]
    });
    steps.push({
      id: "check-disk-space",
      description: "Check available disk space for online index creation",
      sql: this.generateDiskSpaceCheckQuery(),
      estimatedDurationMs: 2e3,
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW",
      databaseSpecific: ["mysql"]
    });
    const createSQL = this.generateMySQLCreateIndexSQL(config, indexName);
    steps.push({
      id: "create-online-index",
      description: `Create index ${indexName} online`,
      sql: createSQL,
      estimatedDurationMs: 45e3,
      // MySQL is generally faster than PostgreSQL
      canRollback: true,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW",
      validationQuery: this.generateIndexValidationQuery(config.tableName, indexName),
      expectedResult: indexName,
      databaseSpecific: ["mysql"]
    });
    rollbackSteps.push({
      id: "rollback-online-index",
      description: `Drop index ${indexName} if creation failed`,
      sql: `ALTER TABLE ${config.tableName} DROP INDEX IF EXISTS ${indexName};`,
      estimatedDurationMs: 8e3,
      canRollback: false,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW",
      databaseSpecific: ["mysql"]
    });
  }
  /**
   * Generate SQLite index creation steps (no true concurrency)
   */
  generateSQLiteSteps(config, indexName, steps, rollbackSteps, warnings) {
    warnings.push(
      "SQLite does not support true concurrent index creation",
      "Index creation will briefly lock the table",
      "Operation is generally fast on SQLite",
      "Consider creating index during low-traffic periods"
    );
    const createSQL = this.generateSQLiteCreateIndexSQL(config, indexName);
    steps.push({
      id: "create-index-sqlite",
      description: `Create index ${indexName} on SQLite`,
      sql: createSQL,
      estimatedDurationMs: 15e3,
      // SQLite is generally fast
      canRollback: true,
      requiresMaintenanceWindow: true,
      // SQLite locks the table
      riskLevel: "MEDIUM",
      validationQuery: this.generateIndexValidationQuery(config.tableName, indexName),
      expectedResult: indexName,
      databaseSpecific: ["sqlite"]
    });
    rollbackSteps.push({
      id: "rollback-sqlite-index",
      description: `Drop index ${indexName} if creation failed`,
      sql: `DROP INDEX IF EXISTS ${indexName};`,
      estimatedDurationMs: 2e3,
      canRollback: false,
      requiresMaintenanceWindow: false,
      riskLevel: "LOW",
      databaseSpecific: ["sqlite"]
    });
  }
  /**
   * Generate PostgreSQL CREATE INDEX SQL
   */
  generatePostgreSQLCreateIndexSQL(config, indexName) {
    const columnList = config.columnNames.join(", ");
    const uniqueClause = config.unique ? "UNIQUE " : "";
    const indexTypeClause = config.indexType ? ` USING ${config.indexType}` : "";
    const partialClause = config.partial && config.partialCondition ? ` WHERE ${config.partialCondition}` : "";
    return `CREATE ${uniqueClause}INDEX CONCURRENTLY ${indexName} ON ${config.tableName}${indexTypeClause} (${columnList})${partialClause};`;
  }
  /**
   * Generate MySQL CREATE INDEX SQL
   */
  generateMySQLCreateIndexSQL(config, indexName) {
    const columnList = config.columnNames.join(", ");
    const uniqueClause = config.unique ? "UNIQUE " : "";
    const indexTypeClause = config.indexType && config.indexType !== "BTREE" ? ` USING ${config.indexType}` : "";
    const algorithm = config.online !== false ? "ALGORITHM=INPLACE" : "ALGORITHM=COPY";
    const lock = config.online !== false ? "LOCK=NONE" : "LOCK=SHARED";
    return `ALTER TABLE ${config.tableName} ADD ${uniqueClause}INDEX ${indexName}${indexTypeClause} (${columnList}), ${algorithm}, ${lock};`;
  }
  /**
   * Generate SQLite CREATE INDEX SQL
   */
  generateSQLiteCreateIndexSQL(config, indexName) {
    const columnList = config.columnNames.join(", ");
    const uniqueClause = config.unique ? "UNIQUE " : "";
    const partialClause = config.partial && config.partialCondition ? ` WHERE ${config.partialCondition}` : "";
    return `CREATE ${uniqueClause}INDEX ${indexName} ON ${config.tableName} (${columnList})${partialClause};`;
  }
  /**
   * Generate existing index check query
   */
  generateExistingIndexCheckQuery(config) {
    return `
      SELECT 
        indexname,
        indexdef
      FROM pg_indexes
      WHERE tablename = '${config.tableName}'
        AND indexdef LIKE '%${config.columnNames.join("%")}%';
    `.trim();
  }
  /**
   * Generate index estimation query
   */
  generateIndexEstimationQuery(config) {
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
  generateStorageEngineCheckQuery(config) {
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
  generateDiskSpaceCheckQuery() {
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
  generateIndexValidationQuery(tableName, indexName) {
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
  generateValidationQueries(config) {
    const indexName = config.indexName || this.generateIndexName(config);
    const queries = [
      this.generateIndexValidationQuery(config.tableName, indexName),
      `SELECT COUNT(*) FROM ${config.tableName};`
      // Verify table accessibility
    ];
    if (config.databaseType === "postgresql") {
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
  estimatePerformanceImpact(config, tableRowCount) {
    const rowsPerSecond = config.databaseType === "postgresql" ? 5e3 : config.databaseType === "mysql" ? 8e3 : 15e3;
    const complexityFactor = config.columnNames.length * 1.2;
    const uniqueFactor = config.unique ? 1.3 : 1;
    const partialFactor = config.partial ? 0.7 : 1;
    const baseDuration = tableRowCount / rowsPerSecond * 1e3;
    const adjustedDuration = baseDuration * complexityFactor * uniqueFactor * partialFactor;
    const memoryPerRow = 2e-3;
    const memoryUsageMB = Math.max(100, tableRowCount * memoryPerRow);
    const avgRowSize = 50;
    const indexSizeEstimateMB = Math.max(5, tableRowCount * avgRowSize * config.columnNames.length / (1024 * 1024));
    const diskSpaceRequiredMB = indexSizeEstimateMB * (config.databaseType === "mysql" ? 2.5 : 1.5);
    const recommendedMaintenanceWindow = config.databaseType === "sqlite" || // SQLite always locks
    tableRowCount > 1e6 || // Very large tables
    config.indexType === "GIN" || config.indexType === "GIST";
    return {
      estimatedDurationMs: Math.round(adjustedDuration),
      memoryUsageMB: Math.round(memoryUsageMB),
      diskSpaceRequiredMB: Math.round(diskSpaceRequiredMB),
      recommendedMaintenanceWindow,
      indexSizeEstimateMB: Math.round(indexSizeEstimateMB)
    };
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AddColumnPattern,
  AddConstraintPattern,
  ConcurrentIndexPattern,
  CreateIndexPattern,
  DropColumnPattern,
  DropConstraintPattern,
  DropIndexPattern,
  ForeignKeyPattern,
  ModifyColumnPattern,
  RenameColumnPattern,
  UniqueConstraintPattern
});
//# sourceMappingURL=index.cjs.map