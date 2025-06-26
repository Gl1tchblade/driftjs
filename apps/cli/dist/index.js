#!/usr/bin/env node
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/lib/config.ts
import fsExtra from "fs-extra";
import { resolve, dirname } from "path";
async function getFlowConfig(global, projectPath) {
  const configPath = await findConfigFile(projectPath || process.cwd(), global.config);
  return JSON.parse(await fsExtra.readFile(configPath, "utf8"));
}
async function findConfigFile(startDir, explicit) {
  if (explicit) {
    const p = resolve(explicit);
    if (await fsExtra.pathExists(p)) return p;
    throw new Error(`Config file not found at ${p}`);
  }
  let dir = startDir;
  while (true) {
    const candidate = resolve(dir, "flow.config.json");
    if (await fsExtra.pathExists(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("flow.config.json not found");
}
var init_config = __esm({
  "src/lib/config.ts"() {
    "use strict";
  }
});

// src/lib/prompts.ts
import { confirm, select, multiselect, text, spinner, log } from "@clack/prompts";
import colors from "picocolors";
async function confirmAction(message, options = {}) {
  return await confirm({
    message: colors.cyan(message),
    ...options
  });
}
async function textInput(message, options = {}) {
  return await text({
    message: colors.cyan(message),
    ...options
  });
}
function createSpinner(message) {
  const s = spinner();
  return {
    start: (msg) => {
      s.start(colors.blue(`\u{1F30A} ${msg || message}`));
      return {
        update: (newMessage) => s.message(colors.blue(`\u{1F30A} ${newMessage}`)),
        succeed: (successMessage) => s.stop(colors.green(`\u2705 ${successMessage || "Complete"}`)),
        fail: (errorMessage) => s.stop(colors.red(`\u274C ${errorMessage || "Failed"}`)),
        stop: (finalMessage) => s.stop(finalMessage ? colors.gray(finalMessage) : ""),
        message: (msg2) => s.message(colors.blue(`\u{1F30A} ${msg2}`))
      };
    }
  };
}
function createFlowSpinner() {
  const s = spinner();
  let isStarted = false;
  return {
    start: (message) => {
      if (!isStarted) {
        s.start(colors.blue(`\u{1F30A} ${message}`));
        isStarted = true;
      }
      return {
        update: (msg) => s.message(colors.blue(`\u{1F30A} ${msg}`)),
        succeed: (msg) => {
          s.stop(colors.green(`\u2705 ${msg || "Complete"}`));
          isStarted = false;
        },
        fail: (msg) => {
          s.stop(colors.red(`\u274C ${msg || "Failed"}`));
          isStarted = false;
        },
        stop: (msg) => {
          s.stop(msg ? colors.gray(msg) : "");
          isStarted = false;
        }
      };
    }
  };
}
function displaySuccess(message, details) {
  log.success(colors.green(`\u2705 ${message}`));
  if (details && details.length > 0) {
    details.forEach((detail) => {
      log.info(colors.dim(`   \u2022 ${detail}`));
    });
  }
}
function displayError(message, details) {
  log.error(colors.red(`\u274C ${message}`));
  if (details && details.length > 0) {
    details.forEach((detail) => {
      log.info(colors.dim(`   \u2022 ${detail}`));
    });
  }
}
function displayWarning(message, details) {
  log.warn(colors.yellow(`\u26A0\uFE0F  ${message}`));
  if (details && details.length > 0) {
    details.forEach((detail) => {
      log.info(colors.dim(`   \u2022 ${detail}`));
    });
  }
}
function displayInfo(message, details) {
  log.info(colors.blue(`\u2139\uFE0F  ${message}`));
  if (details && details.length > 0) {
    details.forEach((detail) => {
      log.info(colors.dim(`   \u2022 ${detail}`));
    });
  }
}
var init_prompts = __esm({
  "src/lib/prompts.ts"() {
    "use strict";
  }
});

// src/enhancements/safety/transaction-wrapper.ts
var enhancement, TransactionWrapperDetector, TransactionWrapperApplicator, transactionWrapperModule;
var init_transaction_wrapper = __esm({
  "src/enhancements/safety/transaction-wrapper.ts"() {
    "use strict";
    enhancement = {
      id: "safety-transaction-wrapper",
      name: "Transaction Wrapper",
      description: "Wraps migration operations in database transactions to ensure atomicity and enable rollback on failure",
      category: "safety",
      priority: 9,
      requiresConfirmation: false,
      tags: ["transaction", "atomicity", "rollback", "critical"]
    };
    TransactionWrapperDetector = class {
      async detect(migration) {
        const content = migration.up.toLowerCase();
        if (content.includes("begin") || content.includes("start transaction") || content.includes("commit")) {
          return false;
        }
        const riskyOperations = [
          "drop table",
          "drop column",
          "alter table",
          "delete from",
          "update ",
          "create index",
          "drop index"
        ];
        return riskyOperations.some((op) => content.includes(op));
      }
      async analyze(migration) {
        const applicable = await this.detect(migration);
        if (!applicable) {
          return {
            applicable: false,
            confidence: 0,
            issues: [],
            impact: {
              riskReduction: 0,
              performanceImprovement: 0,
              complexityAdded: 0,
              description: "Transaction wrapper not applicable - migration already has transaction handling or no risky operations"
            }
          };
        }
        const issues = [];
        const content = migration.up.toLowerCase();
        if (content.includes("drop table")) {
          issues.push({
            severity: "high",
            description: "DROP TABLE operation without transaction protection",
            location: "DROP TABLE statement",
            line: this.findLineNumber(migration.up, /drop\s+table/i),
            recommendation: "Wrap in transaction to enable rollback if migration fails"
          });
        }
        if (content.includes("alter table")) {
          issues.push({
            severity: "medium",
            description: "ALTER TABLE operation without transaction protection",
            location: "ALTER TABLE statement",
            line: this.findLineNumber(migration.up, /alter\s+table/i),
            recommendation: "Wrap in transaction to ensure consistency"
          });
        }
        return {
          applicable: true,
          confidence: 0.9,
          issues,
          impact: {
            riskReduction: 0.8,
            performanceImprovement: 0,
            complexityAdded: 0.1,
            description: "Significantly reduces risk by enabling rollback on failure with minimal complexity added"
          }
        };
      }
      findLineNumber(content, pattern) {
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          if (pattern.test(lines[i])) {
            return i + 1;
          }
        }
        return 1;
      }
    };
    TransactionWrapperApplicator = class {
      async apply(content, migration) {
        try {
          const modifiedContent = `-- Flow Enhancement: Transaction Wrapper
-- Wraps migration in transaction for safety and rollback capability
BEGIN;

${content.trim()}

COMMIT;

-- If any statement fails, the entire transaction will be rolled back automatically`;
          return {
            enhancement,
            applied: true,
            modifiedContent,
            warnings: [],
            changes: [
              {
                type: "WRAPPED",
                original: content.trim(),
                modified: modifiedContent,
                line: 1,
                reason: "Wrapped entire migration in transaction for safety"
              }
            ]
          };
        } catch (error) {
          return {
            enhancement,
            applied: false,
            modifiedContent: content,
            warnings: [`Failed to apply transaction wrapper: ${error instanceof Error ? error.message : "Unknown error"}`],
            changes: []
          };
        }
      }
    };
    transactionWrapperModule = {
      enhancement,
      detector: new TransactionWrapperDetector(),
      applicator: new TransactionWrapperApplicator()
    };
  }
});

// src/enhancements/safety/drop-table-safeguard.ts
var enhancement2, DropTableSafeguardDetector, DropTableSafeguardApplicator, dropTableSafeguardModule;
var init_drop_table_safeguard = __esm({
  "src/enhancements/safety/drop-table-safeguard.ts"() {
    "use strict";
    enhancement2 = {
      id: "safety-drop-table-safeguard",
      name: "Drop Table Safeguard",
      description: "Adds explicit confirmations and backup recommendations for DROP TABLE operations to prevent accidental data loss",
      category: "safety",
      priority: 10,
      requiresConfirmation: true,
      tags: ["drop-table", "data-protection", "backup", "critical"]
    };
    DropTableSafeguardDetector = class {
      async detect(migration) {
        const content = migration.up.toLowerCase();
        return content.includes("drop table");
      }
      async analyze(migration) {
        const applicable = await this.detect(migration);
        if (!applicable) {
          return {
            applicable: false,
            confidence: 0,
            issues: [],
            impact: {
              riskReduction: 0,
              performanceImprovement: 0,
              complexityAdded: 0,
              description: "No DROP TABLE operations found"
            }
          };
        }
        const issues = [];
        const lines = migration.up.split("\n");
        lines.forEach((line, index) => {
          if (/drop\s+table/i.test(line)) {
            const tableName = this.extractTableName(line);
            issues.push({
              severity: "critical",
              description: `DROP TABLE operation on table "${tableName}" - IRREVERSIBLE DATA LOSS`,
              location: line.trim(),
              line: index + 1,
              recommendation: "Ensure you have a backup and consider using a different approach if possible"
            });
          }
        });
        return {
          applicable: true,
          confidence: 1,
          issues,
          impact: {
            riskReduction: 0.9,
            performanceImprovement: 0,
            complexityAdded: 0.2,
            description: "Adds explicit warnings and safeguards to prevent accidental data loss from DROP TABLE operations"
          }
        };
      }
      extractTableName(line) {
        const match = line.match(/drop\s+table\s+(?:if\s+exists\s+)?`?([^`\s;]+)`?/i);
        return match ? match[1] : "unknown";
      }
    };
    DropTableSafeguardApplicator = class {
      async apply(content, migration) {
        try {
          const lines = content.split("\n");
          const modifiedLines = [];
          const changes = [];
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (/drop\s+table/i.test(line)) {
              const tableName = this.extractTableName(line);
              const safeguardComment = `-- \u26A0\uFE0F  CRITICAL WARNING: DROP TABLE OPERATION
-- Table: ${tableName}
-- This operation will PERMANENTLY DELETE ALL DATA in this table
-- Ensure you have a backup before proceeding
-- Consider using 'DROP TABLE IF EXISTS' for safer execution
-- Original command: ${line.trim()}`;
              modifiedLines.push(safeguardComment);
              const saferDropCommand = line.replace(/drop\s+table\s+/i, "DROP TABLE IF EXISTS ");
              modifiedLines.push(saferDropCommand);
              changes.push({
                type: "MODIFIED",
                original: line,
                modified: safeguardComment + "\n" + saferDropCommand,
                line: i + 1,
                reason: "Added safety warnings and IF EXISTS clause to DROP TABLE operation"
              });
            } else {
              modifiedLines.push(line);
            }
          }
          return {
            enhancement: enhancement2,
            applied: true,
            modifiedContent: modifiedLines.join("\n"),
            warnings: [
              "DROP TABLE operations detected - please verify you have backups",
              "Added IF EXISTS clauses to prevent errors if tables don't exist"
            ],
            changes
          };
        } catch (error) {
          return {
            enhancement: enhancement2,
            applied: false,
            modifiedContent: content,
            warnings: [`Failed to apply drop table safeguard: ${error instanceof Error ? error.message : "Unknown error"}`],
            changes: []
          };
        }
      }
      extractTableName(line) {
        const match = line.match(/drop\s+table\s+(?:if\s+exists\s+)?`?([^`\s;]+)`?/i);
        return match ? match[1] : "unknown";
      }
    };
    dropTableSafeguardModule = {
      enhancement: enhancement2,
      detector: new DropTableSafeguardDetector(),
      applicator: new DropTableSafeguardApplicator()
    };
  }
});

// src/enhancements/safety/foreign-key-constraint.ts
var enhancement3, ForeignKeyConstraintDetector, ForeignKeyConstraintApplicator, foreignKeyConstraintModule;
var init_foreign_key_constraint = __esm({
  "src/enhancements/safety/foreign-key-constraint.ts"() {
    "use strict";
    enhancement3 = {
      id: "safety-foreign-key-constraint",
      name: "Foreign Key Constraint Validation",
      description: "Validates foreign key constraints and adds proper error handling",
      category: "safety",
      priority: 7,
      requiresConfirmation: false,
      tags: ["foreign-key", "constraint", "validation"]
    };
    ForeignKeyConstraintDetector = class {
      async detect(migration) {
        return migration.up.toLowerCase().includes("foreign key");
      }
      async analyze(migration) {
        return {
          applicable: await this.detect(migration),
          confidence: 0.7,
          issues: [],
          impact: {
            riskReduction: 0.5,
            performanceImprovement: 0,
            complexityAdded: 0.2,
            description: "Validates foreign key constraints"
          }
        };
      }
    };
    ForeignKeyConstraintApplicator = class {
      async apply(content, migration) {
        return {
          enhancement: enhancement3,
          applied: false,
          modifiedContent: content,
          warnings: ["Foreign key constraint enhancement not yet implemented"],
          changes: []
        };
      }
    };
    foreignKeyConstraintModule = {
      enhancement: enhancement3,
      detector: new ForeignKeyConstraintDetector(),
      applicator: new ForeignKeyConstraintApplicator()
    };
  }
});

// src/enhancements/safety/nullable-column.ts
var enhancement4, NullableColumnDetector, NullableColumnApplicator, nullableColumnModule;
var init_nullable_column = __esm({
  "src/enhancements/safety/nullable-column.ts"() {
    "use strict";
    enhancement4 = {
      id: "safety-nullable-column",
      name: "Nullable Column Safety",
      description: "Ensures safe handling of nullable column operations by adding proper NULL checks and default values",
      category: "safety",
      priority: 6,
      requiresConfirmation: true,
      tags: ["nullable", "column", "safety", "null-checks"]
    };
    NullableColumnDetector = class {
      async detect(migration) {
        const content = migration.up.toLowerCase();
        return content.includes("alter column") && content.includes("null") || content.includes("not null") || content.includes("set null") || content.includes("drop not null");
      }
      async analyze(migration) {
        const applicable = await this.detect(migration);
        if (!applicable) {
          return { applicable: false, confidence: 0, issues: [], impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: "No nullable column operations detected" } };
        }
        const issues = [];
        const content = migration.up.toLowerCase();
        const lines = migration.up.split("\n");
        if (content.includes("not null") && !content.includes("default")) {
          issues.push({
            severity: "high",
            description: "Adding NOT NULL constraint without a default value can fail if table has existing NULL values",
            location: "ALTER COLUMN ... NOT NULL",
            line: lines.findIndex((line) => line.toLowerCase().includes("not null")) + 1,
            recommendation: "Add a default value or update existing NULL values before applying constraint"
          });
        }
        if (content.includes("drop not null")) {
          issues.push({
            severity: "medium",
            description: "Removing NOT NULL constraint without data validation can lead to unexpected NULL values",
            location: "DROP NOT NULL",
            line: lines.findIndex((line) => line.toLowerCase().includes("drop not null")) + 1,
            recommendation: "Consider if allowing NULL values is intentional and add application-level validation"
          });
        }
        return {
          applicable: true,
          confidence: 0.8,
          issues,
          impact: {
            riskReduction: 0.7,
            performanceImprovement: 0,
            complexityAdded: 0.3,
            description: "Adds proper NULL handling and validation to column modifications"
          }
        };
      }
    };
    NullableColumnApplicator = class {
      async apply(content, migration) {
        let modifiedContent = content;
        const changes = [];
        if (content.toLowerCase().includes("not null") && !content.toLowerCase().includes("default")) {
          const lines = content.split("\n");
          let modified = false;
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.toLowerCase().includes("alter column") && line.toLowerCase().includes("not null")) {
              const safetyComment = "  -- Safety check: Ensure no NULL values exist before adding NOT NULL constraint";
              const updateComment = "  -- UPDATE table_name SET column_name = 'default_value' WHERE column_name IS NULL;";
              lines.splice(i, 0, safetyComment);
              lines.splice(i + 1, 0, updateComment);
              changes.push({
                type: "ADDED",
                original: line,
                modified: `${safetyComment}
${updateComment}
${line}`,
                line: i + 1,
                reason: "Added safety check comments for NOT NULL constraint"
              });
              i += 2;
              modified = true;
            }
          }
          if (modified) {
            modifiedContent = lines.join("\n");
          }
        }
        if (content.toLowerCase().includes("drop not null")) {
          const lines = content.split("\n");
          let modified = false;
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.toLowerCase().includes("drop not null")) {
              const intentionComment = "  -- Safety check: Consider if allowing NULL values is intentional";
              const validationComment = "  -- Add application-level validation if needed";
              lines.splice(i, 0, intentionComment);
              lines.splice(i + 1, 0, validationComment);
              changes.push({
                type: "ADDED",
                original: line,
                modified: `${intentionComment}
${validationComment}
${line}`,
                line: i + 1,
                reason: "Added safety warnings for DROP NOT NULL constraint"
              });
              i += 2;
              modified = true;
            }
          }
          if (modified) {
            modifiedContent = lines.join("\n");
          }
        }
        return {
          enhancement: enhancement4,
          applied: changes.length > 0,
          modifiedContent,
          warnings: changes.length === 0 ? ["No nullable column safety improvements were applied"] : [],
          changes
        };
      }
    };
    nullableColumnModule = {
      enhancement: enhancement4,
      detector: new NullableColumnDetector(),
      applicator: new NullableColumnApplicator()
    };
  }
});

// src/enhancements/safety/index-creation.ts
var enhancement5, StubDetector, StubApplicator, indexCreationModule;
var init_index_creation = __esm({
  "src/enhancements/safety/index-creation.ts"() {
    "use strict";
    enhancement5 = { id: "safety-index-creation", name: "Index Creation Safety", description: "Stub", category: "safety", priority: 5, requiresConfirmation: false, tags: ["stub"] };
    StubDetector = class {
      async detect(migration) {
        return false;
      }
      async analyze(migration) {
        return { applicable: false, confidence: 0, issues: [], impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: "Stub" } };
      }
    };
    StubApplicator = class {
      async apply(content, migration) {
        return { enhancement: enhancement5, applied: false, modifiedContent: content, warnings: ["Not implemented"], changes: [] };
      }
    };
    indexCreationModule = { enhancement: enhancement5, detector: new StubDetector(), applicator: new StubApplicator() };
  }
});

// src/enhancements/safety/data-type-change.ts
var enhancement6, DataTypeChangeDetector, DataTypeChangeApplicator, dataTypeChangeModule;
var init_data_type_change = __esm({
  "src/enhancements/safety/data-type-change.ts"() {
    "use strict";
    enhancement6 = {
      id: "safety-data-type-change",
      name: "Data Type Change Safety",
      description: "Detects risky data type conversions and suggests safer migration patterns",
      category: "safety",
      priority: 8,
      requiresConfirmation: true,
      tags: ["data-type", "conversion", "safety", "column-alteration"]
    };
    DataTypeChangeDetector = class {
      async detect(migration) {
        const content = migration.up.toLowerCase();
        return content.includes("alter column") && content.includes("type") || content.includes("alter table") && content.includes("alter column") || content.includes("change column");
      }
      async analyze(migration) {
        const applicable = await this.detect(migration);
        if (!applicable) {
          return {
            applicable: false,
            confidence: 0,
            issues: [],
            impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: "No data type changes detected" }
          };
        }
        const issues = [];
        const content = migration.up.toLowerCase();
        const lines = migration.up.split("\n");
        const riskyConversions = [
          { from: "varchar", to: "int", risk: "high" },
          { from: "text", to: "varchar", risk: "medium" },
          { from: "decimal", to: "int", risk: "high" },
          { from: "timestamp", to: "date", risk: "medium" }
        ];
        for (const conversion of riskyConversions) {
          if (content.includes(conversion.to)) {
            issues.push({
              severity: conversion.risk,
              description: `Converting to ${conversion.to} may cause data loss or conversion errors`,
              location: "ALTER COLUMN ... TYPE",
              line: lines.findIndex((line) => line.toLowerCase().includes("type")) + 1 || 1,
              recommendation: `Verify data compatibility before converting to ${conversion.to} type`
            });
          }
        }
        return {
          applicable: true,
          confidence: 0.8,
          issues,
          impact: {
            riskReduction: 0.7,
            performanceImprovement: 0,
            complexityAdded: 0.4,
            description: "Adds safety checks and warnings for risky data type conversions"
          }
        };
      }
    };
    DataTypeChangeApplicator = class {
      async apply(content, migration) {
        let modifiedContent = content;
        const changes = [];
        if (content.toLowerCase().includes("alter column") && content.toLowerCase().includes("type")) {
          const lines = content.split("\n");
          let modified = false;
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.toLowerCase().includes("alter column") && line.toLowerCase().includes("type")) {
              lines.splice(i, 0, "  -- Safety check: Verify data compatibility before type conversion");
              lines.splice(i + 1, 0, "  -- Consider backing up data or using a staged migration approach");
              changes.push("Added data type conversion safety comments");
              i += 2;
              modified = true;
            }
          }
          if (modified) {
            modifiedContent = lines.join("\n");
          }
        }
        return {
          enhancement: enhancement6,
          applied: changes.length > 0,
          modifiedContent,
          warnings: changes.length === 0 ? ["No data type change safety improvements were applied"] : [],
          changes: changes.map((change) => ({
            type: "ADDED",
            original: "",
            modified: change,
            line: 1,
            reason: change
          }))
        };
      }
    };
    dataTypeChangeModule = {
      enhancement: enhancement6,
      detector: new DataTypeChangeDetector(),
      applicator: new DataTypeChangeApplicator()
    };
  }
});

// src/enhancements/safety/column-renaming.ts
var enhancement7, ColumnRenamingDetector, ColumnRenamingApplicator, columnRenamingModule;
var init_column_renaming = __esm({
  "src/enhancements/safety/column-renaming.ts"() {
    "use strict";
    enhancement7 = {
      id: "safety-column-renaming",
      name: "Column Renaming Safety",
      description: "Warns about application compatibility risks when renaming database columns",
      category: "safety",
      priority: 7,
      requiresConfirmation: true,
      tags: ["column", "rename", "compatibility", "breaking-change"]
    };
    ColumnRenamingDetector = class {
      async detect(migration) {
        const content = migration.up.toLowerCase();
        return content.includes("rename column") || content.includes("alter column") && content.includes("rename to");
      }
      async analyze(migration) {
        const applicable = await this.detect(migration);
        if (!applicable) {
          return {
            applicable: false,
            confidence: 0,
            issues: [],
            impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: "No column renaming detected" }
          };
        }
        const issues = [];
        const content = migration.up.toLowerCase();
        const lines = migration.up.split("\n");
        if (content.includes("rename column")) {
          issues.push({
            severity: "high",
            description: "Renaming columns can break existing application code and queries",
            location: "RENAME COLUMN operation",
            line: lines.findIndex((line) => line.toLowerCase().includes("rename column")) + 1 || 1,
            recommendation: "Consider a staged approach: add new column, copy data, update application, then drop old column"
          });
        }
        return {
          applicable: true,
          confidence: 0.8,
          issues,
          impact: {
            riskReduction: 0.7,
            performanceImprovement: 0,
            complexityAdded: 0.4,
            description: "Prevents application breakage from column renames"
          }
        };
      }
    };
    ColumnRenamingApplicator = class {
      async apply(content, migration) {
        let modifiedContent = content;
        const changes = [];
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.toLowerCase().includes("rename column")) {
            const warnings = [
              "-- \u26A0\uFE0F  COLUMN RENAME WARNING:",
              "-- This operation can break existing application code.",
              "-- Recommended staged approach:",
              "-- 1. Add new column with desired name",
              "-- 2. Copy data from old to new column",
              "-- 3. Update application code to use new column",
              "-- 4. Drop old column in a separate migration"
            ];
            lines.splice(i, 0, ...warnings);
            changes.push("Added column renaming safety warning");
            i += warnings.length;
          }
        }
        if (changes.length > 0) {
          modifiedContent = lines.join("\n");
        }
        return {
          enhancement: enhancement7,
          applied: changes.length > 0,
          modifiedContent,
          warnings: changes.length === 0 ? ["No column renaming operations found"] : [],
          changes: changes.map((change) => ({
            type: "ADDED",
            original: "RENAME COLUMN",
            modified: change,
            line: 1,
            reason: change
          }))
        };
      }
    };
    columnRenamingModule = {
      enhancement: enhancement7,
      detector: new ColumnRenamingDetector(),
      applicator: new ColumnRenamingApplicator()
    };
  }
});

// src/enhancements/safety/cascade-delete.ts
var enhancement8, CascadeDeleteDetector, CascadeDeleteApplicator, cascadeDeleteModule;
var init_cascade_delete = __esm({
  "src/enhancements/safety/cascade-delete.ts"() {
    "use strict";
    enhancement8 = {
      id: "safety-cascade-delete",
      name: "Cascade Delete Safety",
      description: "Warns about CASCADE DELETE operations and suggests safer alternatives",
      category: "safety",
      priority: 9,
      requiresConfirmation: true,
      tags: ["cascade", "delete", "foreign-key", "safety"]
    };
    CascadeDeleteDetector = class {
      async detect(migration) {
        const content = migration.up.toLowerCase();
        return content.includes("on delete cascade") || content.includes("cascade delete");
      }
      async analyze(migration) {
        const applicable = await this.detect(migration);
        if (!applicable) {
          return {
            applicable: false,
            confidence: 0,
            issues: [],
            impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: "No cascade delete operations detected" }
          };
        }
        const issues = [];
        const content = migration.up.toLowerCase();
        const lines = migration.up.split("\n");
        if (content.includes("on delete cascade")) {
          issues.push({
            severity: "high",
            description: "CASCADE DELETE can cause unintended data loss across related tables",
            location: "ON DELETE CASCADE constraint",
            line: lines.findIndex((line) => line.toLowerCase().includes("on delete cascade")) + 1 || 1,
            recommendation: "Consider using ON DELETE RESTRICT or SET NULL with application-level cleanup logic"
          });
        }
        return {
          applicable: true,
          confidence: 0.9,
          issues,
          impact: {
            riskReduction: 0.8,
            performanceImprovement: 0,
            complexityAdded: 0.3,
            description: "Prevents accidental data loss from cascade deletions"
          }
        };
      }
    };
    CascadeDeleteApplicator = class {
      async apply(content, migration) {
        let modifiedContent = content;
        const changes = [];
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.toLowerCase().includes("on delete cascade")) {
            const warnings = [
              "-- \u26A0\uFE0F  CASCADE DELETE WARNING:",
              "-- This will automatically delete related records in child tables.",
              "-- Consider safer alternatives:",
              "-- 1. ON DELETE RESTRICT (prevents deletion if child records exist)",
              "-- 2. ON DELETE SET NULL (sets foreign key to NULL)",
              "-- 3. Application-level cleanup logic"
            ];
            lines.splice(i, 0, ...warnings);
            changes.push("Added CASCADE DELETE safety warning");
            i += warnings.length;
          }
        }
        if (changes.length > 0) {
          modifiedContent = lines.join("\n");
        }
        return {
          enhancement: enhancement8,
          applied: changes.length > 0,
          modifiedContent,
          warnings: changes.length === 0 ? ["No cascade delete operations found"] : [],
          changes: changes.map((change) => ({
            type: "ADDED",
            original: "ON DELETE CASCADE",
            modified: change,
            line: 1,
            reason: change
          }))
        };
      }
    };
    cascadeDeleteModule = {
      enhancement: enhancement8,
      detector: new CascadeDeleteDetector(),
      applicator: new CascadeDeleteApplicator()
    };
  }
});

// src/enhancements/safety/unique-constraint.ts
var enhancement9, UniqueConstraintDetector, UniqueConstraintApplicator, uniqueConstraintModule;
var init_unique_constraint = __esm({
  "src/enhancements/safety/unique-constraint.ts"() {
    "use strict";
    enhancement9 = {
      id: "safety-unique-constraint",
      name: "Unique Constraint Safety",
      description: "Warns about potential issues when adding unique constraints to existing tables with data",
      category: "safety",
      priority: 7,
      requiresConfirmation: true,
      tags: ["unique", "constraint", "safety", "data-integrity"]
    };
    UniqueConstraintDetector = class {
      async detect(migration) {
        const content = migration.up.toLowerCase();
        return content.includes("unique") && (content.includes("constraint") || content.includes("add unique") || content.includes("create unique"));
      }
      async analyze(migration) {
        const applicable = await this.detect(migration);
        if (!applicable) {
          return {
            applicable: false,
            confidence: 0,
            issues: [],
            impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: "No unique constraints detected" }
          };
        }
        const issues = [];
        const content = migration.up.toLowerCase();
        const lines = migration.up.split("\n");
        if (content.includes("add unique") || content.includes("add constraint") && content.includes("unique")) {
          issues.push({
            severity: "medium",
            description: "Adding unique constraint to existing table may fail if duplicate values exist",
            location: "UNIQUE constraint",
            line: lines.findIndex((line) => line.toLowerCase().includes("unique")) + 1 || 1,
            recommendation: "Verify data uniqueness before adding constraint or clean up duplicates first"
          });
        }
        return {
          applicable: true,
          confidence: 0.8,
          issues,
          impact: {
            riskReduction: 0.6,
            performanceImprovement: 0,
            complexityAdded: 0.3,
            description: "Prevents constraint violation errors during migration"
          }
        };
      }
    };
    UniqueConstraintApplicator = class {
      async apply(content, migration) {
        let modifiedContent = content;
        const changes = [];
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.toLowerCase().includes("unique") && (line.toLowerCase().includes("constraint") || line.toLowerCase().includes("add unique"))) {
            const warnings = [
              "-- UNIQUE CONSTRAINT WARNING:",
              "-- Ensure no duplicate values exist before adding unique constraint:",
              "-- SELECT column_name, COUNT(*) FROM table_name GROUP BY column_name HAVING COUNT(*) > 1;"
            ];
            lines.splice(i, 0, ...warnings);
            changes.push("Added unique constraint safety check");
            i += warnings.length;
          }
        }
        if (changes.length > 0) {
          modifiedContent = lines.join("\n");
        }
        return {
          enhancement: enhancement9,
          applied: changes.length > 0,
          modifiedContent,
          warnings: changes.length === 0 ? ["No unique constraints found"] : [],
          changes: changes.map((change) => ({
            type: "ADDED",
            original: "UNIQUE constraint",
            modified: change,
            line: 1,
            reason: change
          }))
        };
      }
    };
    uniqueConstraintModule = {
      enhancement: enhancement9,
      detector: new UniqueConstraintDetector(),
      applicator: new UniqueConstraintApplicator()
    };
  }
});

// src/enhancements/safety/check-constraint.ts
var enhancement10, CheckConstraintDetector, CheckConstraintApplicator, checkConstraintModule;
var init_check_constraint = __esm({
  "src/enhancements/safety/check-constraint.ts"() {
    "use strict";
    enhancement10 = {
      id: "safety-check-constraint",
      name: "Check Constraint Safety",
      description: "Warns about potential issues when adding check constraints to existing tables",
      category: "safety",
      priority: 6,
      requiresConfirmation: true,
      tags: ["check", "constraint", "validation", "safety"]
    };
    CheckConstraintDetector = class {
      async detect(migration) {
        const content = migration.up.toLowerCase();
        return content.includes("check") && content.includes("constraint");
      }
      async analyze(migration) {
        const applicable = await this.detect(migration);
        if (!applicable) {
          return {
            applicable: false,
            confidence: 0,
            issues: [],
            impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: "No check constraints detected" }
          };
        }
        const issues = [];
        const content = migration.up.toLowerCase();
        const lines = migration.up.split("\n");
        if (content.includes("add constraint") && content.includes("check")) {
          issues.push({
            severity: "medium",
            description: "Adding check constraint to existing table may fail if data violates the constraint",
            location: "CHECK constraint",
            line: lines.findIndex((line) => line.toLowerCase().includes("check")) + 1 || 1,
            recommendation: "Verify existing data meets constraint requirements before adding"
          });
        }
        return {
          applicable: true,
          confidence: 0.8,
          issues,
          impact: {
            riskReduction: 0.6,
            performanceImprovement: 0,
            complexityAdded: 0.3,
            description: "Prevents constraint violation errors during migration"
          }
        };
      }
    };
    CheckConstraintApplicator = class {
      async apply(content, migration) {
        let modifiedContent = content;
        const changes = [];
        const lines = content.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          if (line.toLowerCase().includes("check") && line.toLowerCase().includes("constraint")) {
            const warnings = [
              "-- CHECK CONSTRAINT WARNING:",
              "-- Verify existing data meets constraint requirements:",
              "-- SELECT * FROM table_name WHERE NOT (constraint_condition);"
            ];
            lines.splice(i, 0, ...warnings);
            changes.push("Added check constraint validation warning");
            i += warnings.length;
          }
        }
        if (changes.length > 0) {
          modifiedContent = lines.join("\n");
        }
        return {
          enhancement: enhancement10,
          applied: changes.length > 0,
          modifiedContent,
          warnings: changes.length === 0 ? ["No check constraints found"] : [],
          changes: changes.map((change) => ({
            type: "ADDED",
            original: "CHECK constraint",
            modified: change,
            line: 1,
            reason: change
          }))
        };
      }
    };
    checkConstraintModule = {
      enhancement: enhancement10,
      detector: new CheckConstraintDetector(),
      applicator: new CheckConstraintApplicator()
    };
  }
});

// src/enhancements/safety/backup-recommendation.ts
var enhancement11, BackupRecommendationDetector, BackupRecommendationApplicator, backupRecommendationModule;
var init_backup_recommendation = __esm({
  "src/enhancements/safety/backup-recommendation.ts"() {
    "use strict";
    enhancement11 = {
      id: "safety-backup-recommendation",
      name: "Backup Recommendation",
      description: "Recommends taking database backups before executing risky migration operations",
      category: "safety",
      priority: 9,
      requiresConfirmation: false,
      tags: ["backup", "safety", "data-protection", "risk-mitigation"]
    };
    BackupRecommendationDetector = class {
      async detect(migration) {
        const content = migration.up.toLowerCase();
        const riskyOperations = [
          "drop table",
          "drop column",
          "alter column",
          "truncate",
          "delete from",
          "update",
          "drop index",
          "drop constraint"
        ];
        return riskyOperations.some((op) => content.includes(op));
      }
      async analyze(migration) {
        const applicable = await this.detect(migration);
        if (!applicable) {
          return {
            applicable: false,
            confidence: 0,
            issues: [],
            impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: "No risky operations detected" }
          };
        }
        const issues = [];
        const content = migration.up.toLowerCase();
        const lines = migration.up.split("\n");
        const riskyOperations = [
          { operation: "drop table", severity: "critical", description: "Dropping tables permanently removes all data" },
          { operation: "drop column", severity: "high", description: "Dropping columns permanently removes data" },
          { operation: "truncate", severity: "critical", description: "Truncating tables removes all data" },
          { operation: "delete from", severity: "high", description: "Mass deletion operations can remove critical data" }
        ];
        for (const op of riskyOperations) {
          if (content.includes(op.operation)) {
            issues.push({
              severity: op.severity,
              description: op.description,
              location: op.operation.toUpperCase(),
              line: lines.findIndex((line) => line.toLowerCase().includes(op.operation)) + 1 || 1,
              recommendation: "Create a database backup before executing this migration"
            });
          }
        }
        return {
          applicable: true,
          confidence: 0.9,
          issues,
          impact: {
            riskReduction: 0.9,
            performanceImprovement: 0,
            complexityAdded: 0.1,
            description: "Adds backup recommendations for data safety"
          }
        };
      }
    };
    BackupRecommendationApplicator = class {
      async apply(content, migration) {
        const changes = [];
        const backupWarning = [
          "-- \u26A0\uFE0F  IMPORTANT: BACKUP RECOMMENDATION",
          "-- This migration contains potentially destructive operations.",
          "-- It is STRONGLY recommended to create a full database backup before proceeding.",
          "-- Command example: pg_dump database_name > backup_$(date +%Y%m%d_%H%M%S).sql",
          "--"
        ].join("\n");
        const modifiedContent = backupWarning + "\n" + content;
        changes.push("Added backup recommendation warning");
        return {
          enhancement: enhancement11,
          applied: true,
          modifiedContent,
          warnings: [],
          changes: changes.map((change) => ({
            type: "ADDED",
            original: "",
            modified: change,
            line: 1,
            reason: change
          }))
        };
      }
    };
    backupRecommendationModule = {
      enhancement: enhancement11,
      detector: new BackupRecommendationDetector(),
      applicator: new BackupRecommendationApplicator()
    };
  }
});

// src/enhancements/safety/migration-order.ts
var enhancement12, MigrationOrderDetector, MigrationOrderApplicator, migrationOrderModule;
var init_migration_order = __esm({
  "src/enhancements/safety/migration-order.ts"() {
    "use strict";
    enhancement12 = {
      id: "safety-migration-order",
      name: "Migration Order Safety",
      description: "Checks for potential issues with the order of operations in migrations",
      category: "safety",
      priority: 8,
      requiresConfirmation: false,
      tags: ["order", "sequence", "dependencies", "safety"]
    };
    MigrationOrderDetector = class {
      async detect(migration) {
        const content = migration.up.toLowerCase();
        return content.includes("drop") && content.includes("create") || content.includes("alter") && content.includes("add") || content.includes("insert") && content.includes("create");
      }
      async analyze(migration) {
        const applicable = await this.detect(migration);
        if (!applicable) {
          return {
            applicable: false,
            confidence: 0,
            issues: [],
            impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: "No order-sensitive operations detected" }
          };
        }
        const issues = [];
        const content = migration.up.toLowerCase();
        const lines = migration.up.split("\n");
        if (content.includes("insert") && content.includes("create table")) {
          const insertIndex = lines.findIndex((line) => line.toLowerCase().includes("insert"));
          const createIndex = lines.findIndex((line) => line.toLowerCase().includes("create table"));
          if (insertIndex >= 0 && createIndex >= 0 && insertIndex < createIndex) {
            issues.push({
              severity: "high",
              description: "INSERT statement appears before CREATE TABLE - this will cause an error",
              location: "INSERT before CREATE TABLE",
              line: insertIndex + 1,
              recommendation: "Move CREATE TABLE statements before INSERT statements"
            });
          }
        }
        return {
          applicable: true,
          confidence: 0.7,
          issues,
          impact: {
            riskReduction: 0.6,
            performanceImprovement: 0,
            complexityAdded: 0.2,
            description: "Prevents migration failures due to incorrect operation ordering"
          }
        };
      }
    };
    MigrationOrderApplicator = class {
      async apply(content, migration) {
        let modifiedContent = content;
        const changes = [];
        const orderingGuideline = [
          "-- MIGRATION ORDER GUIDELINES:",
          "-- 1. CREATE statements (tables, indexes) first",
          "-- 2. ALTER statements (modify existing structures)",
          "-- 3. INSERT/UPDATE statements (data operations)",
          "-- 4. DROP statements (remove structures) last",
          "--"
        ].join("\n");
        modifiedContent = orderingGuideline + "\n" + content;
        changes.push("Added migration order guidelines");
        return {
          enhancement: enhancement12,
          applied: true,
          modifiedContent,
          warnings: [],
          changes: changes.map((change) => ({
            type: "ADDED",
            original: "",
            modified: change,
            line: 1,
            reason: change
          }))
        };
      }
    };
    migrationOrderModule = {
      enhancement: enhancement12,
      detector: new MigrationOrderDetector(),
      applicator: new MigrationOrderApplicator()
    };
  }
});

// src/enhancements/safety/index.ts
async function loadSafetyEnhancements() {
  return [
    transactionWrapperModule,
    dropTableSafeguardModule,
    foreignKeyConstraintModule,
    nullableColumnModule,
    indexCreationModule,
    dataTypeChangeModule,
    columnRenamingModule,
    cascadeDeleteModule,
    uniqueConstraintModule,
    checkConstraintModule,
    backupRecommendationModule,
    migrationOrderModule
  ];
}
var init_safety = __esm({
  "src/enhancements/safety/index.ts"() {
    "use strict";
    init_transaction_wrapper();
    init_drop_table_safeguard();
    init_foreign_key_constraint();
    init_nullable_column();
    init_index_creation();
    init_data_type_change();
    init_column_renaming();
    init_cascade_delete();
    init_unique_constraint();
    init_check_constraint();
    init_backup_recommendation();
    init_migration_order();
  }
});

// src/enhancements/speed/concurrent-index.ts
import pkg from "node-sql-parser";
async function analyzeIndexEffectiveness(indexStmt, migration) {
  const columns = extractIndexColumns(indexStmt);
  const tableName = extractTableName(indexStmt);
  if (columns.some((col) => col.includes("_id") || col.includes("Id"))) {
    return {
      shouldIndex: true,
      reason: "Foreign key column detected",
      recommendation: "Use CONCURRENT option to allow non-blocking index creation",
      priority: "high"
    };
  }
  const commonQueryColumns = ["email", "username", "status", "created_at", "updated_at"];
  if (columns.some((col) => commonQueryColumns.includes(col.toLowerCase()))) {
    return {
      shouldIndex: true,
      reason: "Common query column detected",
      recommendation: "Use CONCURRENT option to allow non-blocking index creation",
      priority: "medium"
    };
  }
  if (indexStmt.unique || migration.up.toLowerCase().includes("unique index")) {
    return {
      shouldIndex: true,
      reason: "Unique constraint index",
      recommendation: "Use CONCURRENT option to allow non-blocking index creation",
      priority: "high"
    };
  }
  if (columns.length > 3) {
    return {
      shouldIndex: false,
      reason: "Complex composite index may not be efficient",
      recommendation: "Review if all columns are needed, consider separate indexes",
      priority: "low"
    };
  }
  if (columns.some((col) => col.toLowerCase().includes("text") || col.toLowerCase().includes("description"))) {
    return {
      shouldIndex: false,
      reason: "Text/blob columns are not efficient for regular indexing",
      recommendation: "Consider partial index or full-text search instead",
      priority: "medium"
    };
  }
  return {
    shouldIndex: true,
    reason: "Standard index",
    recommendation: "Use CONCURRENT option to allow non-blocking index creation",
    priority: "low"
  };
}
function extractIndexColumns(indexStmt) {
  if (!indexStmt.on) return [];
  try {
    if (Array.isArray(indexStmt.on)) {
      return indexStmt.on.map((col) => col.column || col.name || String(col));
    }
    if (indexStmt.on.column) {
      return [indexStmt.on.column];
    }
    return [];
  } catch (error) {
    return [];
  }
}
function extractTableName(indexStmt) {
  try {
    return indexStmt.table?.table || indexStmt.table?.name || "unknown_table";
  } catch (error) {
    return "unknown_table";
  }
}
var Parser, enhancement13, concurrentIndexDetector, concurrentIndexApplicator, concurrentIndexModule;
var init_concurrent_index = __esm({
  "src/enhancements/speed/concurrent-index.ts"() {
    "use strict";
    ({ Parser } = pkg);
    enhancement13 = {
      id: "speed-concurrent-index",
      name: "Concurrent Index Creation",
      description: "Modifies CREATE INDEX operations to use CONCURRENT option, allowing index creation without blocking reads/writes",
      category: "speed",
      priority: 8,
      requiresConfirmation: false,
      tags: ["index", "concurrent", "performance", "non-blocking"]
    };
    concurrentIndexDetector = {
      async detect(migration) {
        const parser = new Parser();
        try {
          const ast = parser.astify(migration.up, { database: "postgresql" });
          const statements = Array.isArray(ast) ? ast : [ast];
          return statements.some(
            (stmt) => stmt.type === "create" && stmt.keyword === "index" && !migration.up.toLowerCase().includes("concurrently")
            // Only if not already concurrent
          );
        } catch (error) {
          return /create\s+index/i.test(migration.up) && !/create\s+index\s+concurrently/i.test(migration.up);
        }
      },
      async analyze(migration) {
        const parser = new Parser();
        const issues = [];
        try {
          const ast = parser.astify(migration.up, { database: "postgresql" });
          const statements = Array.isArray(ast) ? ast : [ast];
          for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i];
            if (stmt.type === "create" && stmt.keyword === "index") {
              const indexName = stmt.index || "unnamed_index";
              const analysis = await analyzeIndexEffectiveness(stmt, migration);
              if (analysis.shouldIndex) {
                const isConcurrent = migration.up.toLowerCase().includes("concurrently");
                if (!isConcurrent) {
                  issues.push({
                    line: i + 1,
                    description: `Index "${indexName}" creation will block table access during creation`,
                    recommendation: analysis.recommendation,
                    severity: analysis.priority === "high" ? "critical" : "medium",
                    location: `CREATE INDEX ${indexName}`
                  });
                }
              } else {
                issues.push({
                  line: i + 1,
                  description: `Index "${indexName}" may not be beneficial: ${analysis.reason}`,
                  recommendation: `Consider removing this index or reviewing if it's truly needed`,
                  severity: "low",
                  location: `CREATE INDEX ${indexName}`
                });
              }
            }
          }
        } catch (error) {
          const lines = migration.up.split("\n");
          lines.forEach((line, index) => {
            if (/create\s+index/i.test(line) && !/concurrently/i.test(line)) {
              const indexMatch = line.match(/create\s+index\s+(\w+)/i);
              const indexName = indexMatch?.[1] || "unknown";
              issues.push({
                line: index + 1,
                description: `Index "${indexName}" creation will block table access during creation`,
                recommendation: "Use CONCURRENT option to allow non-blocking index creation",
                severity: "medium",
                location: `CREATE INDEX ${indexName}`
              });
            }
          });
        }
        return {
          applicable: issues.length > 0,
          confidence: issues.length > 0 ? 0.8 : 0,
          issues,
          impact: {
            riskReduction: 0.3,
            performanceImprovement: 0.7,
            complexityAdded: 0.1,
            description: "Analyzes CREATE INDEX operations for blocking behavior and effectiveness"
          }
        };
      }
    };
    concurrentIndexApplicator = {
      async apply(content, migration) {
        const parser = new Parser();
        let modifiedContent = content;
        const changes = [];
        try {
          const ast = parser.astify(content, { database: "postgresql" });
          const statements = Array.isArray(ast) ? ast : [ast];
          let hasChanges = false;
          for (const stmt of statements) {
            if (stmt.type === "create" && stmt.keyword === "index") {
              const analysis = await analyzeIndexEffectiveness(stmt, migration);
              if (analysis.shouldIndex && !content.toLowerCase().includes("concurrently")) {
                const originalLine = modifiedContent.match(/CREATE\s+INDEX\s+[^\n]*/gi)?.[0] || "";
                modifiedContent = modifiedContent.replace(
                  /CREATE\s+INDEX\s+/gi,
                  "CREATE INDEX CONCURRENTLY "
                );
                hasChanges = true;
                changes.push({
                  type: "MODIFIED",
                  original: originalLine,
                  modified: originalLine.replace(/CREATE\s+INDEX\s+/gi, "CREATE INDEX CONCURRENTLY "),
                  line: 1,
                  reason: "Made index creation concurrent for better performance"
                });
              }
            }
          }
          return {
            enhancement: enhancement13,
            applied: hasChanges,
            modifiedContent,
            changes,
            warnings: []
          };
        } catch (error) {
          const originalContent = modifiedContent;
          const lines = modifiedContent.split("\n");
          const modifiedLines = [];
          lines.forEach((line, index) => {
            if (/CREATE\s+INDEX\s+/gi.test(line) && !/CONCURRENTLY/i.test(line)) {
              const modifiedLine = line.replace(/CREATE\s+INDEX\s+/gi, "CREATE INDEX CONCURRENTLY ");
              modifiedLines.push(modifiedLine);
              changes.push({
                type: "MODIFIED",
                original: line,
                modified: modifiedLine,
                line: index + 1,
                reason: "Added CONCURRENTLY to index creation"
              });
            } else {
              modifiedLines.push(line);
            }
          });
          const hasChanges = changes.length > 0;
          return {
            enhancement: enhancement13,
            applied: hasChanges,
            modifiedContent: hasChanges ? modifiedLines.join("\n") : originalContent,
            changes,
            warnings: []
          };
        }
      }
    };
    concurrentIndexModule = {
      enhancement: enhancement13,
      detector: concurrentIndexDetector,
      applicator: concurrentIndexApplicator
    };
  }
});

// src/enhancements/speed/remaining-stubs.ts
var StubDetector2, StubApplicator2, batchInsertEnhancement, batchInsertModule, partialIndexEnhancement, partialIndexModule, indexOptimizationEnhancement, indexOptimizationModule, concurrentIndexModule2, queryOptimizationEnhancement, queryOptimizationModule, bulkUpdateEnhancement, bulkUpdateModule, connectionPoolingEnhancement, connectionPoolingModule, vacuumAnalyzeEnhancement, vacuumAnalyzeModule, parallelExecutionEnhancement, parallelExecutionModule, compressionEnhancement, compressionModule, statisticsUpdateEnhancement, statisticsUpdateModule, cacheOptimizationEnhancement, cacheOptimizationModule;
var init_remaining_stubs = __esm({
  "src/enhancements/speed/remaining-stubs.ts"() {
    "use strict";
    init_concurrent_index();
    StubDetector2 = class {
      async detect() {
        return false;
      }
      async analyze() {
        return { applicable: false, confidence: 0, issues: [], impact: { riskReduction: 0, performanceImprovement: 0, complexityAdded: 0, description: "Stub" } };
      }
    };
    StubApplicator2 = class {
      async apply(content) {
        return { enhancement: {}, applied: false, modifiedContent: content, warnings: ["Not implemented"], changes: [] };
      }
    };
    batchInsertEnhancement = { id: "speed-batch-insert", name: "Batch Insert", description: "Stub", category: "speed", priority: 5, requiresConfirmation: false, tags: ["stub"] };
    batchInsertModule = { enhancement: batchInsertEnhancement, detector: new StubDetector2(), applicator: new StubApplicator2() };
    partialIndexEnhancement = { id: "speed-partial-index", name: "Partial Index", description: "Stub", category: "speed", priority: 5, requiresConfirmation: false, tags: ["stub"] };
    partialIndexModule = { enhancement: partialIndexEnhancement, detector: new StubDetector2(), applicator: new StubApplicator2() };
    indexOptimizationEnhancement = { id: "speed-index-optimization", name: "Index Optimization", description: "Stub", category: "speed", priority: 5, requiresConfirmation: false, tags: ["stub"] };
    indexOptimizationModule = { enhancement: indexOptimizationEnhancement, detector: new StubDetector2(), applicator: new StubApplicator2() };
    concurrentIndexModule2 = concurrentIndexModule;
    queryOptimizationEnhancement = { id: "speed-query-optimization", name: "Query Optimization", description: "Stub", category: "speed", priority: 5, requiresConfirmation: false, tags: ["stub"] };
    queryOptimizationModule = { enhancement: queryOptimizationEnhancement, detector: new StubDetector2(), applicator: new StubApplicator2() };
    bulkUpdateEnhancement = { id: "speed-bulk-update", name: "Bulk Update", description: "Stub", category: "speed", priority: 5, requiresConfirmation: false, tags: ["stub"] };
    bulkUpdateModule = { enhancement: bulkUpdateEnhancement, detector: new StubDetector2(), applicator: new StubApplicator2() };
    connectionPoolingEnhancement = { id: "speed-connection-pooling", name: "Connection Pooling", description: "Stub", category: "speed", priority: 5, requiresConfirmation: false, tags: ["stub"] };
    connectionPoolingModule = { enhancement: connectionPoolingEnhancement, detector: new StubDetector2(), applicator: new StubApplicator2() };
    vacuumAnalyzeEnhancement = { id: "speed-vacuum-analyze", name: "Vacuum Analyze", description: "Stub", category: "speed", priority: 5, requiresConfirmation: false, tags: ["stub"] };
    vacuumAnalyzeModule = { enhancement: vacuumAnalyzeEnhancement, detector: new StubDetector2(), applicator: new StubApplicator2() };
    parallelExecutionEnhancement = { id: "speed-parallel-execution", name: "Parallel Execution", description: "Stub", category: "speed", priority: 5, requiresConfirmation: false, tags: ["stub"] };
    parallelExecutionModule = { enhancement: parallelExecutionEnhancement, detector: new StubDetector2(), applicator: new StubApplicator2() };
    compressionEnhancement = { id: "speed-compression", name: "Compression", description: "Stub", category: "speed", priority: 5, requiresConfirmation: false, tags: ["stub"] };
    compressionModule = { enhancement: compressionEnhancement, detector: new StubDetector2(), applicator: new StubApplicator2() };
    statisticsUpdateEnhancement = { id: "speed-statistics-update", name: "Statistics Update", description: "Stub", category: "speed", priority: 5, requiresConfirmation: false, tags: ["stub"] };
    statisticsUpdateModule = { enhancement: statisticsUpdateEnhancement, detector: new StubDetector2(), applicator: new StubApplicator2() };
    cacheOptimizationEnhancement = { id: "speed-cache-optimization", name: "Cache Optimization", description: "Stub", category: "speed", priority: 5, requiresConfirmation: false, tags: ["stub"] };
    cacheOptimizationModule = { enhancement: cacheOptimizationEnhancement, detector: new StubDetector2(), applicator: new StubApplicator2() };
  }
});

// src/enhancements/speed/index.ts
async function loadSpeedEnhancements() {
  return [
    batchInsertModule,
    concurrentIndexModule2,
    partialIndexModule,
    indexOptimizationModule,
    queryOptimizationModule,
    bulkUpdateModule,
    connectionPoolingModule,
    vacuumAnalyzeModule,
    parallelExecutionModule,
    compressionModule,
    statisticsUpdateModule,
    cacheOptimizationModule
  ];
}
var init_speed = __esm({
  "src/enhancements/speed/index.ts"() {
    "use strict";
    init_remaining_stubs();
  }
});

// src/core/enhancement-engine.ts
var EnhancementEngine;
var init_enhancement_engine = __esm({
  "src/core/enhancement-engine.ts"() {
    "use strict";
    init_safety();
    init_speed();
    EnhancementEngine = class {
      safetyModules = [];
      speedModules = [];
      initialized = false;
      // Performance optimizations
      analysisCache = /* @__PURE__ */ new Map();
      detectionCache = /* @__PURE__ */ new Map();
      moduleCache = /* @__PURE__ */ new Map();
      /**
       * Initialize the enhancement engine by loading all enhancement modules
       * Uses lazy loading for better performance
       */
      async initialize() {
        if (this.initialized) return;
        try {
          const [safetyModulesPromise, speedModulesPromise] = await Promise.all([
            loadSafetyEnhancements(),
            loadSpeedEnhancements()
          ]);
          this.safetyModules = safetyModulesPromise;
          this.speedModules = speedModulesPromise;
          this.safetyModules.sort((a, b) => b.enhancement.priority - a.enhancement.priority);
          this.speedModules.sort((a, b) => b.enhancement.priority - a.enhancement.priority);
          [...this.safetyModules, ...this.speedModules].forEach((module) => {
            this.moduleCache.set(module.enhancement.id, module);
          });
          this.initialized = true;
        } catch (error) {
          console.error("Failed to initialize enhancement engine:", error);
          throw error;
        }
      }
      /**
       * Detect applicable safety enhancements for a migration
       * @param migration Migration file to analyze
       * @returns Array of applicable safety enhancements with analysis
       */
      async detectSafetyEnhancements(migration) {
        await this.initialize();
        const applicableEnhancements = [];
        const cacheKey = `safety_${migration.name}_${migration.up.length}`;
        if (this.detectionCache.has(cacheKey)) {
          return this.getCachedEnhancements(cacheKey, this.safetyModules);
        }
        const detectionPromises = this.safetyModules.map(async (module) => {
          try {
            const isApplicable = await module.detector.detect(migration);
            return { module, isApplicable };
          } catch (error) {
            console.warn(`Error detecting enhancement ${module.enhancement.id}:`, error);
            return { module, isApplicable: false };
          }
        });
        const results = await Promise.all(detectionPromises);
        results.forEach(({ module, isApplicable }) => {
          if (isApplicable) {
            applicableEnhancements.push(module.enhancement);
          }
        });
        this.cacheEnhancements(cacheKey, applicableEnhancements);
        return applicableEnhancements;
      }
      /**
       * Detect applicable speed enhancements for a migration
       * @param migration Migration file to analyze
       * @returns Array of applicable speed enhancements with analysis
       */
      async detectSpeedEnhancements(migration) {
        await this.initialize();
        const applicableEnhancements = [];
        const cacheKey = `speed_${migration.name}_${migration.up.length}`;
        if (this.detectionCache.has(cacheKey)) {
          return this.getCachedEnhancements(cacheKey, this.speedModules);
        }
        const detectionPromises = this.speedModules.map(async (module) => {
          try {
            const isApplicable = await module.detector.detect(migration);
            return { module, isApplicable };
          } catch (error) {
            console.warn(`Error detecting enhancement ${module.enhancement.id}:`, error);
            return { module, isApplicable: false };
          }
        });
        const results = await Promise.all(detectionPromises);
        results.forEach(({ module, isApplicable }) => {
          if (isApplicable) {
            applicableEnhancements.push(module.enhancement);
          }
        });
        this.cacheEnhancements(cacheKey, applicableEnhancements);
        return applicableEnhancements;
      }
      /**
       * Get detailed analysis for a specific enhancement
       * @param enhancementId Enhancement ID to analyze
       * @param migration Migration file to analyze
       * @returns Detailed analysis of the enhancement
       */
      async getEnhancementAnalysis(enhancementId, migration) {
        await this.initialize();
        const cacheKey = `analysis_${enhancementId}_${migration.name}_${migration.up.length}`;
        if (this.analysisCache.has(cacheKey)) {
          return this.analysisCache.get(cacheKey);
        }
        const module = this.moduleCache.get(enhancementId);
        if (!module) return null;
        try {
          const analysis = await module.detector.analyze(migration);
          if (analysis) {
            this.analysisCache.set(cacheKey, analysis);
          }
          return analysis;
        } catch (error) {
          console.warn(`Error analyzing enhancement ${enhancementId}:`, error);
          return null;
        }
      }
      /**
       * Apply a set of enhancements to migration content
       * @param content Original migration content
       * @param migration Migration file object
       * @param enhancements Array of enhancements to apply
       * @returns Modified content with all enhancements applied
       */
      async applyEnhancements(content, migration, enhancements) {
        await this.initialize();
        let modifiedContent = content;
        const results = [];
        const sortedEnhancements = [...enhancements].sort((a, b) => b.priority - a.priority);
        for (const enhancement14 of sortedEnhancements) {
          const module = this.moduleCache.get(enhancement14.id);
          if (!module) {
            console.warn(`Enhancement module not found: ${enhancement14.id}`);
            continue;
          }
          try {
            const updatedMigration = { ...migration, up: modifiedContent };
            const result = await module.applicator.apply(modifiedContent, updatedMigration);
            if (result.applied) {
              modifiedContent = result.modifiedContent;
              results.push(result);
            }
          } catch (error) {
            console.warn(`Error applying enhancement ${enhancement14.id}:`, error);
          }
        }
        return modifiedContent;
      }
      /**
       * Apply a single enhancement to migration content
       * @param content Original migration content
       * @param migration Migration file object
       * @param enhancement Enhancement to apply
       * @returns Enhancement result
       */
      async applySingleEnhancement(content, migration, enhancement14) {
        await this.initialize();
        const module = this.moduleCache.get(enhancement14.id);
        if (!module) {
          throw new Error(`Enhancement module not found: ${enhancement14.id}`);
        }
        return await module.applicator.apply(content, migration);
      }
      /**
       * Find an enhancement module by ID (now using cache for O(1) lookup)
       * @param enhancementId Enhancement ID to find
       * @returns Enhancement module or undefined if not found
       */
      findEnhancementModule(enhancementId) {
        return this.moduleCache.get(enhancementId);
      }
      /**
       * Cache enhancement detection results
       */
      cacheEnhancements(cacheKey, enhancements) {
        const enhancementIds = enhancements.map((e) => e.id);
        this.detectionCache.set(cacheKey, enhancementIds.length > 0);
      }
      /**
       * Get cached enhancements
       */
      getCachedEnhancements(cacheKey, modules) {
        return [];
      }
      /**
       * Clear all caches (useful for testing or when migration changes)
       */
      clearCache() {
        this.analysisCache.clear();
        this.detectionCache.clear();
      }
      /**
       * Get cache statistics for debugging
       */
      getCacheStats() {
        return {
          analysisCache: this.analysisCache.size,
          detectionCache: this.detectionCache.size
        };
      }
      /**
       * Check if an enhancement is available
       * @param enhancementId Enhancement ID to check
       * @returns True if enhancement is available
       */
      async hasEnhancement(enhancementId) {
        await this.initialize();
        return this.moduleCache.has(enhancementId);
      }
      /**
       * Get a specific enhancement by ID
       * @param enhancementId Enhancement ID to get
       * @returns Enhancement definition or undefined if not found
       */
      async getEnhancement(enhancementId) {
        await this.initialize();
        const module = this.moduleCache.get(enhancementId);
        return module?.enhancement;
      }
      /**
       * Get all available safety enhancements
       * @returns Array of all safety enhancement definitions
       */
      async getAllSafetyEnhancements() {
        await this.initialize();
        return this.safetyModules.map((module) => module.enhancement);
      }
      /**
       * Get all available speed enhancements
       * @returns Array of all speed enhancement definitions
       */
      async getAllSpeedEnhancements() {
        await this.initialize();
        return this.speedModules.map((module) => module.enhancement);
      }
      /**
       * Get all available enhancements (both safety and speed)
       * @returns Array of all enhancement definitions
       */
      async getAllEnhancements() {
        await this.initialize();
        return [
          ...this.safetyModules.map((module) => module.enhancement),
          ...this.speedModules.map((module) => module.enhancement)
        ];
      }
      /**
       * Get engine statistics including performance metrics
       * @returns Statistics about the enhancement engine
       */
      async getStats() {
        await this.initialize();
        const allEnhancements = await this.getAllEnhancements();
        const enhancementsByPriority = {};
        allEnhancements.forEach((enhancement14) => {
          enhancementsByPriority[enhancement14.priority] = (enhancementsByPriority[enhancement14.priority] || 0) + 1;
        });
        return {
          totalEnhancements: allEnhancements.length,
          safetyEnhancements: this.safetyModules.length,
          speedEnhancements: this.speedModules.length,
          enhancementsByPriority,
          cacheStats: this.getCacheStats()
        };
      }
    };
  }
});

// src/core/migration-utils.ts
import fs from "fs-extra";
import path from "path";
import crypto from "crypto";
import pkg2 from "node-sql-parser";
async function findLatestMigration(migrationsDir) {
  try {
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files.filter((file) => file.endsWith(".sql")).sort((a, b) => {
      const aPrefix = a.split("_")[0];
      const bPrefix = b.split("_")[0];
      return bPrefix.localeCompare(aPrefix);
    });
    return migrationFiles.length > 0 ? migrationFiles[0] : null;
  } catch (error) {
    return null;
  }
}
async function parseMigrationFile(filePath) {
  const content = await fs.readFile(filePath, "utf-8");
  const fileName = path.basename(filePath);
  const checksum = crypto.createHash("sha256").update(content).digest("hex");
  const timestamp = extractTimestampFromFilename(fileName);
  const operations = await parseSqlOperations(content);
  const upContent = content;
  const downContent = "";
  return {
    path: filePath,
    name: fileName,
    up: upContent,
    down: downContent,
    timestamp,
    operations,
    checksum
  };
}
function extractTimestampFromFilename(filename) {
  const timestampMatch = filename.match(/^(\d{4})_/);
  if (timestampMatch) {
    const year = (/* @__PURE__ */ new Date()).getFullYear();
    const month = (/* @__PURE__ */ new Date()).getMonth();
    const day = (/* @__PURE__ */ new Date()).getDate();
    return new Date(year, month, day, 0, 0, 0, parseInt(timestampMatch[1]));
  }
  return /* @__PURE__ */ new Date();
}
async function parseSqlOperations(content) {
  const operations = [];
  const parser = new Parser2();
  const statements = content.split(/(--> statement-breakpoint|;)/i).map((stmt) => stmt.trim()).filter((stmt) => stmt && !stmt.match(/^--> statement-breakpoint$/i) && stmt !== ";");
  let lineNumber = 1;
  for (const statement of statements) {
    if (!statement.trim()) continue;
    try {
      const ast = parser.astify(statement, { database: "sqlite" });
      const operation = extractOperationFromAst(ast, statement, lineNumber);
      if (operation) {
        operations.push(operation);
      }
    } catch (error) {
      operations.push({
        type: "OTHER",
        sql: statement,
        line: lineNumber
      });
    }
    lineNumber += (statement.match(/\n/g) || []).length + 1;
  }
  return operations;
}
function extractOperationFromAst(ast, sql, line) {
  if (!ast || !ast.type) return null;
  const operation = {
    type: "OTHER",
    sql,
    line
  };
  switch (ast.type?.toLowerCase()) {
    case "create":
      if (ast.keyword === "table") {
        operation.type = "CREATE_TABLE";
        operation.table = ast.table?.[0]?.table || extractTableNameFromSql(sql);
      } else if (ast.keyword === "index") {
        operation.type = "CREATE_INDEX";
        operation.index = ast.index || extractIndexNameFromSql(sql);
        operation.table = ast.table?.[0]?.table || extractTableNameFromIndexSql(sql);
      }
      break;
    case "drop":
      if (ast.keyword === "table") {
        operation.type = "DROP_TABLE";
        operation.table = ast.name?.[0]?.table || extractTableNameFromSql(sql);
      } else if (ast.keyword === "index") {
        operation.type = "DROP_INDEX";
        operation.index = ast.name || extractIndexNameFromSql(sql);
      }
      break;
    case "alter":
      operation.type = "ALTER_TABLE";
      operation.table = ast.table?.[0]?.table || extractTableNameFromSql(sql);
      break;
    case "insert":
      operation.type = "INSERT";
      operation.table = ast.table?.[0]?.table || extractTableNameFromSql(sql);
      break;
    case "update":
      operation.type = "UPDATE";
      operation.table = ast.table?.[0]?.table || extractTableNameFromSql(sql);
      break;
    case "delete":
      operation.type = "DELETE";
      operation.table = ast.table?.[0]?.table || extractTableNameFromSql(sql);
      break;
  }
  return operation;
}
function extractTableNameFromSql(sql) {
  const patterns = [
    /CREATE\s+TABLE\s+`?([^`\s\(]+)`?/i,
    /DROP\s+TABLE\s+`?([^`\s\(]+)`?/i,
    /ALTER\s+TABLE\s+`?([^`\s\(]+)`?/i,
    /INSERT\s+INTO\s+`?([^`\s\(]+)`?/i,
    /UPDATE\s+`?([^`\s\(]+)`?/i,
    /DELETE\s+FROM\s+`?([^`\s\(]+)`?/i
  ];
  for (const pattern of patterns) {
    const match = sql.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return void 0;
}
function extractIndexNameFromSql(sql) {
  const patterns = [
    /CREATE\s+(?:UNIQUE\s+)?INDEX\s+`?([^`\s\(]+)`?/i,
    /DROP\s+INDEX\s+`?([^`\s\(]+)`?/i
  ];
  for (const pattern of patterns) {
    const match = sql.match(pattern);
    if (match) {
      return match[1];
    }
  }
  return void 0;
}
function extractTableNameFromIndexSql(sql) {
  const match = sql.match(/ON\s+`?([^`\s\(]+)`?/i);
  return match ? match[1] : void 0;
}
function isMigrationFile(filePath) {
  return path.extname(filePath).toLowerCase() === ".sql";
}
async function validateMigrationPath(filePath, migrationsDir) {
  let resolvedPath;
  if (path.isAbsolute(filePath)) {
    resolvedPath = filePath;
  } else {
    resolvedPath = path.resolve(migrationsDir, filePath);
  }
  if (!await fs.pathExists(resolvedPath)) {
    throw new Error(`Migration file not found: ${resolvedPath}`);
  }
  if (!isMigrationFile(resolvedPath)) {
    throw new Error(`File is not a migration file: ${resolvedPath}`);
  }
  return resolvedPath;
}
var Parser2;
var init_migration_utils = __esm({
  "src/core/migration-utils.ts"() {
    "use strict";
    ({ Parser: Parser2 } = pkg2);
  }
});

// src/commands/enhance.ts
var enhance_exports = {};
__export(enhance_exports, {
  enhanceCommand: () => enhanceCommand
});
import { confirm as confirm2, log as log2 } from "@clack/prompts";
import fs2 from "fs-extra";
import path2 from "path";
import pc from "picocolors";
async function enhanceCommand(options, globalOptions) {
  const spinner2 = createFlowSpinner();
  try {
    const projectPath = options.project ? path2.resolve(options.project) : process.cwd();
    const cfg = await getFlowConfig(globalOptions, projectPath);
    const envCfg = cfg.environments[cfg.defaultEnvironment];
    const migrationsDir = envCfg.migrationsPath || "./migrations";
    const absoluteMigrationsDir = path2.resolve(projectPath, migrationsDir);
    let migrationFile = options.file;
    if (!migrationFile) {
      const latestFile = await findLatestMigration(absoluteMigrationsDir);
      if (!latestFile) {
        displayError("No migration files found", [`Directory: ${absoluteMigrationsDir}`]);
        return;
      }
      migrationFile = latestFile;
      displayInfo(`Operating on latest migration: ${pc.cyan(migrationFile)}`);
    }
    let filePath;
    try {
      filePath = await validateMigrationPath(migrationFile, absoluteMigrationsDir);
    } catch (error) {
      displayError("Migration file validation failed", [error instanceof Error ? error.message : "Migration file not found"]);
      return;
    }
    const loadSpinner = spinner2.start("Loading migration file...");
    let migration, engine;
    try {
      [migration, engine] = await Promise.all([
        parseMigrationFile(filePath),
        new Promise((resolve4) => {
          const eng = new EnhancementEngine();
          resolve4(eng);
        })
      ]);
      loadSpinner.succeed("Migration file loaded successfully");
    } catch (error) {
      loadSpinner.fail("Failed to load migration file");
      displayError("Parse error", [error instanceof Error ? error.message : "Unknown error"]);
      return;
    }
    log2.info("");
    displayInfo(`\u{1F680} Starting Enhancement Process for ${pc.bold(migration.name)}`);
    log2.info("");
    log2.info(pc.bold(pc.blue("\u2501\u2501\u2501 Phase 1: Safety Enhancements \u2501\u2501\u2501")));
    const safetySpinner = spinner2.start("Scanning for safety issues...");
    try {
      const safetyEnhancements = await engine.detectSafetyEnhancements(migration);
      if (safetyEnhancements.length > 0) {
        safetySpinner.succeed(`Found ${safetyEnhancements.length} safety issue(s)`);
        for (const enhancement14 of safetyEnhancements) {
          const analysis = await engine.getEnhancementAnalysis(enhancement14.id, migration);
          if (analysis && analysis.issues.length > 0) {
            displayWarning(`${enhancement14.name}`, [enhancement14.description]);
            for (const issue of analysis.issues) {
              log2.info(`    ${pc.red("\u26A0")} ${issue.description} ${pc.gray(`(line ${issue.line})`)}`);
              log2.info(`    ${pc.gray("\u2192 " + issue.recommendation)}`);
            }
            log2.info("");
          } else {
            displayInfo(`${enhancement14.name}`, [enhancement14.description]);
          }
        }
        const applySafety = await confirm2({
          message: pc.cyan("Apply recommended safety enhancements?"),
          initialValue: true
        });
        if (applySafety) {
          const applySpinner = spinner2.start("Applying safety enhancements...");
          try {
            const enhancedContent = await engine.applyEnhancements(migration.up, migration, safetyEnhancements);
            await fs2.writeFile(filePath, enhancedContent, "utf-8");
            migration.up = enhancedContent;
            applySpinner.succeed("Safety enhancements applied successfully");
            displaySuccess("Safety improvements completed", [`Applied ${safetyEnhancements.length} enhancement(s)`]);
          } catch (error) {
            applySpinner.fail("Failed to apply safety enhancements");
            displayError("Enhancement error", [error instanceof Error ? error.message : "Unknown error"]);
            return;
          }
        } else {
          displayInfo("Skipping safety enhancements");
        }
      } else {
        safetySpinner.succeed("No safety issues found - migration looks safe!");
      }
    } catch (error) {
      safetySpinner.fail("Error during safety analysis");
      displayError("Analysis failed", [error instanceof Error ? error.message : "Unknown error"]);
      return;
    }
    log2.info("");
    log2.info(pc.bold(pc.green("\u2501\u2501\u2501 Phase 2: Speed Enhancements \u2501\u2501\u2501")));
    const speedSpinner = spinner2.start("Analyzing performance optimization opportunities...");
    try {
      const speedEnhancements = await engine.detectSpeedEnhancements(migration);
      if (speedEnhancements.length > 0) {
        speedSpinner.succeed(`Found ${speedEnhancements.length} optimization opportunity(ies)`);
        for (const enhancement14 of speedEnhancements) {
          const analysis = await engine.getEnhancementAnalysis(enhancement14.id, migration);
          if (analysis && analysis.issues.length > 0) {
            displayInfo(`${enhancement14.name}`, [enhancement14.description]);
            for (const issue of analysis.issues) {
              log2.info(`    ${pc.yellow("\u26A1")} ${issue.description} ${pc.gray(`(line ${issue.line})`)}`);
              log2.info(`    ${pc.gray("\u2192 " + issue.recommendation)}`);
            }
            log2.info("");
          } else {
            displayInfo(`${enhancement14.name}`, [enhancement14.description]);
          }
        }
        const applySpeed = await confirm2({
          message: pc.cyan("Apply recommended speed enhancements?"),
          initialValue: true
        });
        if (applySpeed) {
          const applySpinner = spinner2.start("Applying speed enhancements...");
          try {
            const enhancedContent = await engine.applyEnhancements(migration.up, migration, speedEnhancements);
            await fs2.writeFile(filePath, enhancedContent, "utf-8");
            applySpinner.succeed("Speed enhancements applied successfully");
            displaySuccess("Performance optimizations completed", [`Applied ${speedEnhancements.length} enhancement(s)`]);
          } catch (error) {
            applySpinner.fail("Failed to apply speed enhancements");
            displayError("Enhancement error", [error instanceof Error ? error.message : "Unknown error"]);
            return;
          }
        } else {
          displayInfo("Skipping speed enhancements");
        }
      } else {
        speedSpinner.succeed("No speed optimizations found - migration is already optimized!");
      }
    } catch (error) {
      speedSpinner.fail("Error during speed analysis");
      displayError("Analysis failed", [error instanceof Error ? error.message : "Unknown error"]);
      return;
    }
    log2.info("");
    displaySuccess("\u2728 Enhancement process completed successfully!", [
      `Enhanced migration file: ${pc.cyan(path2.relative(projectPath, filePath))}`
    ]);
  } catch (error) {
    displayError("Enhancement command failed", [error instanceof Error ? error.message : "Unknown error"]);
  }
}
var init_enhance = __esm({
  "src/commands/enhance.ts"() {
    "use strict";
    init_config();
    init_prompts();
    init_enhancement_engine();
    init_migration_utils();
  }
});

// src/commands/validate.ts
var validate_exports = {};
__export(validate_exports, {
  validateCommand: () => validateCommand
});
import { intro, outro } from "@clack/prompts";
import fs3 from "fs-extra";
import path3 from "path";
import pc2 from "picocolors";
async function validateCommand(options, globalOptions) {
  const projectPath = options.project ? path3.resolve(options.project) : process.cwd();
  const cfg = await getFlowConfig(globalOptions, projectPath);
  const envCfg = cfg.environments[cfg.defaultEnvironment];
  const migrationsDir = envCfg.migrationsPath || "./migrations";
  const absoluteMigrationsDir = path3.resolve(projectPath, migrationsDir);
  let migrationFile = options.file;
  if (!migrationFile) {
    const files = await fs3.readdir(absoluteMigrationsDir);
    const migrationFiles = files.filter((file) => file.endsWith(".sql")).sort();
    if (migrationFiles.length === 0) {
      console.log(pc2.yellow("No migration files found."));
      return;
    }
    migrationFile = migrationFiles[migrationFiles.length - 1];
  }
  const filePath = path3.join(absoluteMigrationsDir, migrationFile);
  if (!await fs3.pathExists(filePath)) {
    console.log(pc2.red(`File not found: ${filePath}`));
    return;
  }
  const content = await fs3.readFile(filePath, "utf-8");
  const engine = new EnhancementEngine();
  intro("\u{1F50D} Starting Validation Process");
  const safetySpinner = createSpinner("Checking for safety issues...").start();
  const safetyEnhancements = await engine.detectSafetyEnhancements({
    path: filePath,
    name: migrationFile,
    up: content,
    down: "",
    timestamp: /* @__PURE__ */ new Date(),
    operations: [],
    checksum: ""
  });
  if (safetyEnhancements.length > 0) {
    safetySpinner.stop("\u{1F50D} Safety issues found:");
    safetyEnhancements.forEach((e) => {
      console.log(`  - ${pc2.yellow(e.name)}: ${e.description}`);
    });
  } else {
    safetySpinner.succeed("\u2705 No safety issues found.");
  }
  outro("\u2705 Validation complete.");
}
var init_validate = __esm({
  "src/commands/validate.ts"() {
    "use strict";
    init_config();
    init_prompts();
    init_enhancement_engine();
  }
});

// src/commands/plan.ts
var plan_exports = {};
__export(plan_exports, {
  planCommand: () => planCommand
});
import { intro as intro2, outro as outro2 } from "@clack/prompts";
import fs4 from "fs-extra";
import path4 from "path";
import pc3 from "picocolors";
import { diffChars } from "diff";
async function planCommand(options, globalOptions) {
  const projectPath = options.project ? path4.resolve(options.project) : process.cwd();
  const cfg = await getFlowConfig(globalOptions, projectPath);
  const envCfg = cfg.environments[cfg.defaultEnvironment];
  const migrationsDir = envCfg.migrationsPath || "./migrations";
  const absoluteMigrationsDir = path4.resolve(projectPath, migrationsDir);
  let migrationFile = options.file;
  if (!migrationFile) {
    const files = await fs4.readdir(absoluteMigrationsDir);
    const migrationFiles = files.filter((file) => file.endsWith(".sql")).sort();
    if (migrationFiles.length === 0) {
      console.log(pc3.yellow("No migration files found."));
      return;
    }
    migrationFile = migrationFiles[migrationFiles.length - 1];
  }
  const filePath = path4.join(absoluteMigrationsDir, migrationFile);
  if (!await fs4.pathExists(filePath)) {
    console.log(pc3.red(`File not found: ${filePath}`));
    return;
  }
  const content = await fs4.readFile(filePath, "utf-8");
  const engine = new EnhancementEngine();
  intro2("\u{1F4DD} Planning Enhancement");
  const safetyEnhancements = await engine.detectSafetyEnhancements({
    path: filePath,
    name: migrationFile,
    up: content,
    down: "",
    timestamp: /* @__PURE__ */ new Date(),
    operations: [],
    checksum: ""
  });
  const speedEnhancements = await engine.detectSpeedEnhancements({
    path: filePath,
    name: migrationFile,
    up: content,
    down: "",
    timestamp: /* @__PURE__ */ new Date(),
    operations: [],
    checksum: ""
  });
  const allEnhancements = [...safetyEnhancements, ...speedEnhancements];
  if (allEnhancements.length > 0) {
    const newContent = await engine.applyEnhancements(content, allEnhancements);
    const diff = diffChars(content, newContent);
    console.log(pc3.bold(`
Changes for ${migrationFile}:
`));
    diff.forEach((part) => {
      const color = part.added ? pc3.green : part.removed ? pc3.red : pc3.gray;
      process.stdout.write(color(part.value));
    });
    console.log();
  } else {
    console.log(pc3.green("\u2705 No enhancements to apply."));
  }
  outro2("\u{1F4DD} Plan complete.");
}
var init_plan = __esm({
  "src/commands/plan.ts"() {
    "use strict";
    init_config();
    init_enhancement_engine();
  }
});

// src/commands/rollback.ts
var rollback_exports = {};
__export(rollback_exports, {
  rollbackCommand: () => rollbackCommand
});
import { intro as intro3, outro as outro3 } from "@clack/prompts";
import fs5 from "fs-extra";
import path5 from "path";
import pc4 from "picocolors";
async function rollbackCommand(options, globalOptions) {
  const projectPath = options.project ? path5.resolve(options.project) : process.cwd();
  const cfg = await getFlowConfig(globalOptions, projectPath);
  const envCfg = cfg.environments[cfg.defaultEnvironment];
  const migrationsDir = envCfg.migrationsPath || "./migrations";
  const absoluteMigrationsDir = path5.resolve(projectPath, migrationsDir);
  let migrationFile = options.file;
  if (!migrationFile) {
    const files = await fs5.readdir(absoluteMigrationsDir);
    const migrationFiles = files.filter((file) => file.endsWith(".sql")).sort();
    if (migrationFiles.length === 0) {
      console.log(pc4.yellow("No migration files found."));
      return;
    }
    migrationFile = migrationFiles[migrationFiles.length - 1];
  }
  const filePath = path5.join(absoluteMigrationsDir, migrationFile);
  if (!await fs5.pathExists(filePath)) {
    console.log(pc4.red(`File not found: ${filePath}`));
    return;
  }
  const content = await fs5.readFile(filePath, "utf-8");
  const engine = new EnhancementEngine();
  intro3("\u23EA Generating Rollback Script");
  const rollbackScript = await engine.generateRollback({
    path: filePath,
    name: migrationFile,
    up: content,
    down: "",
    timestamp: /* @__PURE__ */ new Date(),
    operations: [],
    checksum: ""
  });
  console.log(pc4.bold(`
Rollback script for ${migrationFile}:
`));
  console.log(pc4.cyan(rollbackScript));
  outro3("\u23EA Rollback script generated.");
}
var init_rollback = __esm({
  "src/commands/rollback.ts"() {
    "use strict";
    init_config();
    init_enhancement_engine();
  }
});

// src/core/types/common.ts
var init_common = __esm({
  "src/core/types/common.ts"() {
    "use strict";
  }
});

// src/core/types/orm.ts
var init_orm = __esm({
  "src/core/types/orm.ts"() {
    "use strict";
  }
});

// src/core/types/database.ts
var init_database = __esm({
  "src/core/types/database.ts"() {
    "use strict";
  }
});

// src/core/types/migration.ts
var init_migration = __esm({
  "src/core/types/migration.ts"() {
    "use strict";
  }
});

// src/core/types/config.ts
var init_config2 = __esm({
  "src/core/types/config.ts"() {
    "use strict";
  }
});

// src/core/types/index.ts
var init_types = __esm({
  "src/core/types/index.ts"() {
    "use strict";
    init_common();
    init_orm();
    init_database();
    init_migration();
    init_config2();
  }
});

// src/core/utils/file-utils.ts
import fs6 from "fs-extra";
import { join, resolve as resolve2, relative } from "path";
async function exists(path9) {
  try {
    await access(path9);
    return true;
  } catch {
    return false;
  }
}
async function createFilePath(path9, basePath = process.cwd()) {
  const absolutePath = resolve2(basePath, path9);
  const relativePath = relative(basePath, absolutePath);
  const fileExists = await exists(absolutePath);
  return {
    absolute: absolutePath,
    relative: relativePath,
    exists: fileExists
  };
}
async function readFileContent(path9) {
  try {
    const content = await readFile(path9, "utf-8");
    return { success: true, data: content };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error("Unknown error reading file")
    };
  }
}
async function findFiles(directory, pattern, recursive = true) {
  const files = [];
  try {
    const items = await readdir(directory, { withFileTypes: true });
    for (const item of items) {
      const fullPath = join(directory, item.name);
      if (item.isDirectory() && recursive) {
        const subFiles = await findFiles(fullPath, pattern, recursive);
        files.push(...subFiles);
      } else if (item.isFile() && pattern.test(item.name)) {
        files.push(fullPath);
      }
    }
  } catch {
  }
  return files;
}
async function readJsonFile(path9) {
  const fileResult = await readFileContent(path9);
  if (!fileResult.success) {
    return fileResult;
  }
  try {
    const data = JSON.parse(fileResult.data);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: new Error(`Invalid JSON in file ${path9}: ${error instanceof Error ? error.message : "Unknown error"}`)
    };
  }
}
var readFile, writeFile, access, stat, readdir;
var init_file_utils = __esm({
  "src/core/utils/file-utils.ts"() {
    "use strict";
    ({ readFile, writeFile, access, stat, readdir } = fs6);
  }
});

// src/core/utils/async-utils.ts
var init_async_utils = __esm({
  "src/core/utils/async-utils.ts"() {
    "use strict";
  }
});

// src/core/utils/validation.ts
var init_validation = __esm({
  "src/core/utils/validation.ts"() {
    "use strict";
  }
});

// src/core/utils/config.ts
import fs7 from "fs-extra";
import path6 from "path";
var init_config3 = __esm({
  "src/core/utils/config.ts"() {
    "use strict";
    init_validation();
  }
});

// src/core/utils/index.ts
var init_utils = __esm({
  "src/core/utils/index.ts"() {
    "use strict";
    init_file_utils();
    init_async_utils();
    init_validation();
    init_config3();
  }
});

// src/core/index.ts
var init_core = __esm({
  "src/core/index.ts"() {
    "use strict";
    init_types();
    init_utils();
  }
});

// src/analyzer/orm-detectors/base-detector.ts
import { join as join2 } from "path";
var BaseORMDetector;
var init_base_detector = __esm({
  "src/analyzer/orm-detectors/base-detector.ts"() {
    "use strict";
    init_core();
    BaseORMDetector = class {
      /**
       * Common helper: Check if package.json contains specific dependencies
       */
      async checkPackageJsonDependencies(projectPath, dependencies) {
        const packageJsonPath = join2(projectPath, "package.json");
        const packageResult = await readJsonFile(packageJsonPath);
        if (!packageResult.success) {
          return { found: [], missing: dependencies };
        }
        const allDeps = {
          ...packageResult.data.dependencies,
          ...packageResult.data.devDependencies
        };
        const found = dependencies.filter((dep) => dep in allDeps);
        const missing = dependencies.filter((dep) => !(dep in allDeps));
        return { found, missing };
      }
      /**
       * Common helper: Check if specific files exist
       */
      async checkFiles(projectPath, filePaths) {
        const existing = [];
        const missing = [];
        for (const filePath of filePaths) {
          const fullPath = join2(projectPath, filePath);
          const fileExists = await exists(fullPath);
          if (fileExists) {
            existing.push(await createFilePath(filePath, projectPath));
          } else {
            missing.push(filePath);
          }
        }
        return { existing, missing };
      }
      /**
       * Common helper: Find files matching patterns
       */
      async findFilesByPattern(projectPath, patterns, directories = ["."]) {
        const allFiles = [];
        for (const directory of directories) {
          const fullDirectory = join2(projectPath, directory);
          for (const pattern of patterns) {
            const files = await findFiles(fullDirectory, pattern, true);
            allFiles.push(...files);
          }
        }
        return allFiles;
      }
      /**
       * Common helper: Calculate confidence score based on evidence
       */
      calculateConfidence(evidence) {
        if (evidence.required.total === 0) {
          return 0;
        }
        const requiredScore = evidence.required.found / evidence.required.total;
        const optionalScore = evidence.optional.total > 0 ? evidence.optional.found / evidence.optional.total : 0;
        const baseScore = requiredScore * 0.7;
        const bonusScore = optionalScore * 0.3;
        const penalty = Math.min(evidence.negative * 0.1, 0.5);
        return Math.max(0, Math.min(1, baseScore + bonusScore - penalty));
      }
      /**
       * Parse database URL into DatabaseConfig
       */
      parseDatabaseUrl(url) {
        try {
          const parsed = new URL(url);
          let type;
          switch (parsed.protocol) {
            case "postgresql:":
            case "postgres:":
              type = "postgresql";
              break;
            case "mysql:":
              type = "mysql";
              break;
            case "sqlite:":
              type = "sqlite";
              break;
            default:
              return null;
          }
          return {
            type,
            host: parsed.hostname || void 0,
            port: parsed.port ? parseInt(parsed.port) : void 0,
            database: parsed.pathname.slice(1),
            // Remove leading slash
            username: parsed.username || void 0,
            password: parsed.password || void 0,
            url
          };
        } catch {
          return null;
        }
      }
    };
  }
});

// src/analyzer/orm-detectors/prisma-detector.ts
var PrismaDetector;
var init_prisma_detector = __esm({
  "src/analyzer/orm-detectors/prisma-detector.ts"() {
    "use strict";
    init_base_detector();
    init_core();
    PrismaDetector = class extends BaseORMDetector {
      name = "prisma";
      /**
       * Detect Prisma in the project
       */
      async detect(projectPath) {
        const evidence = [];
        const warnings = [];
        const { found: foundDeps, missing: missingDeps } = await this.checkPackageJsonDependencies(
          projectPath,
          ["prisma", "@prisma/client"]
        );
        evidence.push(...foundDeps.map((dep) => `Found dependency: ${dep}`));
        const { existing: schemaFiles } = await this.checkFiles(projectPath, [
          "prisma/schema.prisma",
          "schema.prisma"
        ]);
        if (schemaFiles.length > 0) {
          evidence.push(`Found schema file: ${schemaFiles[0].relative}`);
        }
        const { existing: migrationDirs } = await this.checkFiles(projectPath, [
          "prisma/migrations"
        ]);
        if (migrationDirs.length > 0) {
          evidence.push(`Found migrations directory: ${migrationDirs[0].relative}`);
        }
        const generatedFiles = await this.findFilesByPattern(
          projectPath,
          [/node_modules\/@prisma\/client/],
          ["node_modules"]
        );
        if (generatedFiles.length > 0) {
          evidence.push("Found generated Prisma client");
        }
        const confidence = this.calculateConfidence({
          required: { found: foundDeps.length, total: 2 },
          // prisma + @prisma/client
          optional: { found: schemaFiles.length + migrationDirs.length, total: 2 },
          negative: 0
        });
        if (foundDeps.length > 0 && schemaFiles.length === 0) {
          warnings.push("Prisma dependency found but no schema.prisma file detected");
        }
        if (schemaFiles.length > 0 && !foundDeps.includes("@prisma/client")) {
          warnings.push("Schema file found but @prisma/client not installed");
        }
        return {
          found: confidence > 0.5,
          confidence,
          evidence,
          warnings: warnings.length > 0 ? warnings : void 0
        };
      }
      /**
       * Extract Prisma configuration
       */
      async extractConfig(projectPath) {
        const { existing: schemaFiles } = await this.checkFiles(projectPath, [
          "prisma/schema.prisma",
          "schema.prisma"
        ]);
        if (schemaFiles.length === 0) {
          return null;
        }
        const schemaFile = schemaFiles[0];
        const migrationDirectory = await createFilePath("prisma/migrations", projectPath);
        const schemaResult = await readFileContent(schemaFile.absolute);
        if (!schemaResult.success) {
          return null;
        }
        let clientGenerator;
        const generatorMatch = schemaResult.data.match(/generator\s+client\s*{([^}]+)}/s);
        if (generatorMatch) {
          const generatorConfig = generatorMatch[1];
          const providerMatch = generatorConfig.match(/provider\s*=\s*"([^"]+)"/);
          const outputMatch = generatorConfig.match(/output\s*=\s*"([^"]+)"/);
          clientGenerator = {
            provider: providerMatch?.[1] || "prisma-client-js",
            output: outputMatch?.[1]
          };
        }
        return {
          type: "prisma",
          configFile: schemaFile,
          migrationDirectory,
          schemaFile,
          dependencies: ["prisma", "@prisma/client"],
          clientGenerator
        };
      }
      /**
       * Extract database configuration from Prisma schema
       */
      async getDatabaseConfig(projectPath) {
        const config = await this.extractConfig(projectPath);
        if (!config) {
          return null;
        }
        const schemaResult = await readFileContent(config.schemaFile.absolute);
        if (!schemaResult.success) {
          return null;
        }
        const datasourceMatch = schemaResult.data.match(/datasource\s+\w+\s*{([^}]+)}/s);
        if (!datasourceMatch) {
          return null;
        }
        const datasourceConfig = datasourceMatch[1];
        const providerMatch = datasourceConfig.match(/provider\s*=\s*"([^"]+)"/);
        const provider = providerMatch?.[1];
        const urlMatch = datasourceConfig.match(/url\s*=\s*env\("([^"]+)"\)/) || datasourceConfig.match(/url\s*=\s*"([^"]+)"/);
        if (!urlMatch) {
          return null;
        }
        let databaseUrl;
        if (urlMatch[0].includes("env(")) {
          const envVar = urlMatch[1];
          databaseUrl = process.env[envVar] || "";
          if (!databaseUrl) {
            return {
              type: this.mapPrismaProviderToType(provider),
              database: "unknown"
            };
          }
        } else {
          databaseUrl = urlMatch[1];
        }
        const dbConfig = this.parseDatabaseUrl(databaseUrl);
        if (dbConfig) {
          return dbConfig;
        }
        return {
          type: this.mapPrismaProviderToType(provider),
          database: "unknown"
        };
      }
      /**
       * Map Prisma provider to database type
       */
      mapPrismaProviderToType(provider) {
        switch (provider) {
          case "postgresql":
            return "postgresql";
          case "mysql":
            return "mysql";
          case "sqlite":
            return "sqlite";
          default:
            return "postgresql";
        }
      }
    };
  }
});

// src/analyzer/orm-detectors/drizzle-detector.ts
import path7 from "path";
import fs8 from "fs-extra";
var DrizzleDetector;
var init_drizzle_detector = __esm({
  "src/analyzer/orm-detectors/drizzle-detector.ts"() {
    "use strict";
    init_base_detector();
    DrizzleDetector = class extends BaseORMDetector {
      name = "drizzle";
      async detect(projectPath) {
        const evidence = [];
        try {
          const configFilesFound = await this.findConfigFilesRecursively(projectPath);
          evidence.push(...configFilesFound.map((f) => `Found config file: ${f.relative}`));
          let deps = await this.checkPackageJsonDependencies(projectPath, ["drizzle-orm", "drizzle-kit"]);
          evidence.push(...deps.found.map((dep) => `Found dependency: ${dep} (root)`));
          for (const configFile of configFilesFound) {
            const configDir = path7.dirname(configFile.absolute);
            const configDeps = await this.checkPackageJsonDependencies(configDir, ["drizzle-orm", "drizzle-kit"]);
            evidence.push(...configDeps.found.map((dep) => `Found dependency: ${dep} (${configFile.relative})`));
            deps.found = [.../* @__PURE__ */ new Set([...deps.found, ...configDeps.found])];
          }
          const schemaPatterns = [
            "src/db/schema.ts",
            "src/schema.ts",
            "db/schema.ts",
            "schema.ts",
            "src/lib/db/schema.ts"
          ];
          const { existing: schemaFiles } = await this.checkFiles(projectPath, schemaPatterns);
          evidence.push(...schemaFiles.map((f) => `Found schema file: ${f.relative}`));
          const migrationDirs = ["drizzle", "migrations", "drizzle/migrations"];
          const { existing: migrationDirsFound } = await this.checkFiles(projectPath, migrationDirs);
          evidence.push(...migrationDirsFound.map((f) => `Found migration directory: ${f.relative}`));
          const confidenceInput = {
            required: {
              found: deps.found.length > 0 ? 1 : 0,
              total: 1
            },
            optional: {
              found: (configFilesFound.length > 0 ? 1 : 0) + (schemaFiles.length > 0 ? 1 : 0) + (migrationDirsFound.length > 0 ? 1 : 0),
              total: 3
              // config files, schema files, migration dirs
            },
            negative: 0
          };
          const confidence = this.calculateConfidence(confidenceInput);
          return {
            found: confidence > 0.3,
            confidence: Math.round(confidence * 100),
            evidence
          };
        } catch (error) {
          return {
            found: false,
            confidence: 0,
            evidence: [`Error detecting Drizzle: ${error}`]
          };
        }
      }
      async extractConfig(projectPath) {
        try {
          const configFilesFound = await this.findConfigFilesRecursively(projectPath);
          if (configFilesFound.length === 0) {
            return null;
          }
          const configFile = configFilesFound[0];
          const configContent = await fs8.readFile(configFile.absolute, "utf-8");
          const driver = this.extractConfigValue(configContent, "dialect") || "pg";
          const validDrivers = ["pg", "mysql2", "better-sqlite3", "sqlite"];
          const mappedDriver = validDrivers.includes(driver) ? driver : "pg";
          const outDir = this.extractConfigValue(configContent, "out") || "./drizzle";
          const migrationDirAbsolute = path7.resolve(projectPath, outDir);
          const config = {
            type: "drizzle",
            configFile: {
              absolute: configFile.absolute,
              relative: configFile.relative,
              exists: await fs8.pathExists(configFile.absolute)
            },
            driver: mappedDriver,
            schemaPath: this.extractConfigValue(configContent, "schema") || "./src/db/schema.ts",
            outDir,
            migrationDirectory: {
              absolute: migrationDirAbsolute,
              relative: outDir,
              exists: await fs8.pathExists(migrationDirAbsolute)
            },
            dependencies: ["drizzle-orm", "drizzle-kit"]
          };
          return config;
        } catch (error) {
          return null;
        }
      }
      async getDatabaseConfig(projectPath) {
        try {
          const envFiles = [".env", ".env.local", ".env.development"];
          const { existing: envFilesFound } = await this.checkFiles(projectPath, envFiles);
          for (const envFile of envFilesFound) {
            const envContent = await fs8.readFile(envFile.absolute, "utf-8");
            const dbUrl = this.extractEnvValue(envContent, "DATABASE_URL");
            if (dbUrl) {
              const parsed = this.parseDatabaseUrl(dbUrl);
              if (parsed) return parsed;
            }
          }
          const drizzleConfig = await this.extractConfig(projectPath);
          if (!drizzleConfig) return null;
          const driverMap = {
            "pg": "postgresql",
            "mysql2": "mysql",
            "better-sqlite3": "sqlite"
          };
          const dbType = driverMap[drizzleConfig.driver] || "postgresql";
          return {
            type: dbType,
            host: "localhost",
            port: dbType === "postgresql" ? 5432 : dbType === "mysql" ? 3306 : void 0,
            database: "main"
          };
        } catch (error) {
          return null;
        }
      }
      extractConfigValue(content, key) {
        const regex = new RegExp(`${key}:\\s*['"]([^'"]+)['"]`);
        const match = content.match(regex);
        return match?.[1];
      }
      extractEnvValue(content, key) {
        const regex = new RegExp(`^${key}\\s*=\\s*(.+)$`, "m");
        const match = content.match(regex);
        return match?.[1]?.replace(/['"]/g, "").trim();
      }
      async findConfigFilesRecursively(projectPath) {
        const configPatterns = /^drizzle\.config\.(ts|js|mjs)$/;
        const foundFiles = [];
        const searchDirectory = async (dir, currentPath = "") => {
          try {
            const items = await fs8.readdir(dir, { withFileTypes: true });
            for (const item of items) {
              const fullPath = path7.join(dir, item.name);
              const relativePath = path7.join(currentPath, item.name);
              if (item.isDirectory() && !["node_modules", ".git", ".next", "dist", "build"].includes(item.name)) {
                await searchDirectory(fullPath, relativePath);
              } else if (item.isFile() && configPatterns.test(item.name)) {
                foundFiles.push({
                  absolute: fullPath,
                  relative: relativePath
                });
              }
            }
          } catch {
          }
        };
        await searchDirectory(projectPath);
        return foundFiles;
      }
    };
  }
});

// src/analyzer/orm-detectors/typeorm-detector.ts
import fs9 from "fs/promises";
var TypeORMDetector;
var init_typeorm_detector = __esm({
  "src/analyzer/orm-detectors/typeorm-detector.ts"() {
    "use strict";
    init_base_detector();
    TypeORMDetector = class extends BaseORMDetector {
      name = "typeorm";
      async detect(projectPath) {
        const evidence = [];
        try {
          const configFiles = [
            "ormconfig.ts",
            "ormconfig.js",
            "ormconfig.json",
            "typeorm.config.ts",
            "typeorm.config.js",
            "src/data-source.ts",
            "src/data-source.js"
          ];
          const { existing: configFilesFound } = await this.checkFiles(projectPath, configFiles);
          evidence.push(...configFilesFound.map((f) => `Found config file: ${f.relative}`));
          const deps = await this.checkPackageJsonDependencies(projectPath, ["typeorm", "@nestjs/typeorm"]);
          evidence.push(...deps.found.map((dep) => `Found dependency: ${dep}`));
          const entityPatterns = await this.findFilesByPattern(
            projectPath,
            [/\.entity\.(ts|js)$/, /@Entity\(/],
            ["src", "entities", "entity"]
          );
          if (entityPatterns.length > 0) {
            evidence.push(`Found ${entityPatterns.length} entity files`);
          }
          const migrationDirs = ["src/migrations", "migrations", "database/migrations"];
          const { existing: migrationDirsFound } = await this.checkFiles(projectPath, migrationDirs);
          evidence.push(...migrationDirsFound.map((f) => `Found migration directory: ${f.relative}`));
          const migrationPatterns = await this.findFilesByPattern(
            projectPath,
            [/\d+.*\.(ts|js)$/],
            ["src/migrations", "migrations", "database/migrations"]
          );
          if (migrationPatterns.length > 0) {
            evidence.push(`Found ${migrationPatterns.length} migration files`);
          }
          const confidence = this.calculateConfidence({
            required: {
              found: deps.found.length > 0 ? 1 : 0,
              total: 1
            },
            optional: {
              found: configFilesFound.length + (entityPatterns.length > 0 ? 1 : 0) + migrationDirsFound.length + (migrationPatterns.length > 0 ? 1 : 0),
              total: 4
            },
            negative: 0
          });
          return {
            found: confidence > 0.3,
            confidence: Math.round(confidence * 100),
            evidence
          };
        } catch (error) {
          return {
            found: false,
            confidence: 0,
            evidence: [`Error detecting TypeORM: ${error}`]
          };
        }
      }
      async extractConfig(projectPath) {
        try {
          const configFiles = [
            "ormconfig.ts",
            "ormconfig.js",
            "ormconfig.json",
            "typeorm.config.ts",
            "typeorm.config.js",
            "src/data-source.ts",
            "src/data-source.js"
          ];
          const { existing: configFilesFound } = await this.checkFiles(projectPath, configFiles);
          if (configFilesFound.length === 0) {
            return null;
          }
          const configFile = configFilesFound[0];
          let entities = [];
          let migrations = [];
          if (configFile.relative.endsWith(".json")) {
            const configContent = await fs9.readFile(configFile.absolute, "utf-8");
            const jsonConfig = JSON.parse(configContent);
            entities = Array.isArray(jsonConfig.entities) ? jsonConfig.entities : ["src/**/*.entity.{ts,js}"];
            migrations = Array.isArray(jsonConfig.migrations) ? jsonConfig.migrations : ["src/migrations/*.{ts,js}"];
          } else {
            const configContent = await fs9.readFile(configFile.absolute, "utf-8");
            entities = this.extractArrayValue(configContent, "entities") || ["src/**/*.entity.{ts,js}"];
            migrations = this.extractArrayValue(configContent, "migrations") || ["src/migrations/*.{ts,js}"];
          }
          const config = {
            type: "typeorm",
            configFile,
            entities,
            migrations,
            migrationDirectory: configFile,
            // Will be updated with proper migration directory  
            dependencies: ["typeorm"],
            cli: {
              migrationsDir: "src/migrations",
              entitiesDir: "src/entities"
            }
          };
          return config;
        } catch (error) {
          console.warn(`Failed to extract TypeORM config: ${error}`);
          return null;
        }
      }
      async getDatabaseConfig(projectPath) {
        try {
          const envFiles = [".env", ".env.local", ".env.development"];
          const { existing: envFilesFound } = await this.checkFiles(projectPath, envFiles);
          for (const envFile of envFilesFound) {
            const envContent = await fs9.readFile(envFile.absolute, "utf-8");
            const dbUrl = this.extractEnvValue(envContent, "DATABASE_URL") || this.extractEnvValue(envContent, "DB_URL") || this.extractEnvValue(envContent, "TYPEORM_URL");
            if (dbUrl) {
              const parsed = this.parseDatabaseUrl(dbUrl);
              if (parsed) return parsed;
            }
          }
          const typeormConfig = await this.extractConfig(projectPath);
          if (typeormConfig?.configFile) {
            const configContent = await fs9.readFile(typeormConfig.configFile.absolute, "utf-8");
            const type = this.extractConfigValue(configContent, "type");
            const host = this.extractConfigValue(configContent, "host");
            const port = this.extractConfigValue(configContent, "port");
            const database = this.extractConfigValue(configContent, "database");
            const username = this.extractConfigValue(configContent, "username");
            const password = this.extractConfigValue(configContent, "password");
            if (type && database) {
              const dbTypeMap = {
                "postgres": "postgresql",
                "postgresql": "postgresql",
                "mysql": "mysql",
                "mariadb": "mysql",
                "sqlite": "sqlite"
              };
              const mappedType = dbTypeMap[type] || "postgresql";
              return {
                type: mappedType,
                host: host || "localhost",
                port: port ? parseInt(port) : mappedType === "postgresql" ? 5432 : mappedType === "mysql" ? 3306 : void 0,
                database,
                username,
                password
              };
            }
          }
          return {
            type: "postgresql",
            host: "localhost",
            port: 5432,
            database: "main"
          };
        } catch (error) {
          console.warn(`Failed to extract database config: ${error}`);
          return null;
        }
      }
      extractConfigValue(content, key) {
        const regex = new RegExp(`${key}:\\s*['"]([^'"]+)['"]`);
        const match = content.match(regex);
        return match?.[1];
      }
      extractArrayValue(content, key) {
        const regex = new RegExp(`${key}:\\s*\\[([^\\]]+)\\]`);
        const match = content.match(regex);
        if (!match) return void 0;
        return match[1].split(",").map((item) => item.trim().replace(/['"]/g, "")).filter((item) => item.length > 0);
      }
      extractEnvValue(content, key) {
        const regex = new RegExp(`^${key}\\s*=\\s*(.+)$`, "m");
        const match = content.match(regex);
        return match?.[1]?.replace(/['"]/g, "").trim();
      }
    };
  }
});

// src/analyzer/orm-detectors/index.ts
var init_orm_detectors = __esm({
  "src/analyzer/orm-detectors/index.ts"() {
    "use strict";
    init_prisma_detector();
    init_drizzle_detector();
    init_typeorm_detector();
    init_base_detector();
  }
});

// src/analyzer/database/connection.ts
var init_connection = __esm({
  "src/analyzer/database/connection.ts"() {
    "use strict";
  }
});

// src/analyzer/database/analysis.ts
var init_analysis = __esm({
  "src/analyzer/database/analysis.ts"() {
    "use strict";
  }
});

// src/analyzer/database/adapters.ts
var init_adapters = __esm({
  "src/analyzer/database/adapters.ts"() {
    "use strict";
  }
});

// src/analyzer/database/index.ts
var init_database2 = __esm({
  "src/analyzer/database/index.ts"() {
    "use strict";
    init_connection();
    init_analysis();
    init_adapters();
  }
});

// src/analyzer/index.ts
var init_analyzer = __esm({
  "src/analyzer/index.ts"() {
    "use strict";
    init_orm_detectors();
    init_database2();
  }
});

// src/commands/init.ts
var init_exports = {};
__export(init_exports, {
  initCommand: () => initCommand
});
import fsExtra2 from "fs-extra";
import { resolve as resolve3 } from "path";
import dotenv from "dotenv";
async function findDatabaseUrl(envName, projectPath) {
  const candidateFiles = [];
  candidateFiles.push(resolve3(projectPath, ".env"));
  const parts = projectPath.split("/");
  for (let i = parts.length - 1; i > 0; i--) {
    candidateFiles.push(parts.slice(0, i + 1).join("/") + "/.env");
  }
  const appsDir = resolve3(projectPath, "apps");
  const pkgsDir = resolve3(projectPath, "packages");
  if (await fsExtra2.pathExists(appsDir)) {
    const sub = await fsExtra2.readdir(appsDir);
    sub.forEach((s) => candidateFiles.push(resolve3(appsDir, s, ".env")));
  }
  if (await fsExtra2.pathExists(pkgsDir)) {
    const sub = await fsExtra2.readdir(pkgsDir);
    sub.forEach((s) => candidateFiles.push(resolve3(pkgsDir, s, ".env")));
  }
  for (const file of candidateFiles) {
    if (await fsExtra2.pathExists(file)) {
      try {
        const envVars = dotenv.parse(await fsExtra2.readFile(file));
        const v = envVars.DATABASE_URL || envVars[`DATABASE_URL_${envName.toUpperCase()}`];
        if (v) return v;
      } catch {
      }
    }
  }
  return "";
}
async function detectMigrationsDir(projectPath) {
  const candidates = [
    "migrations",
    "db/migrations",
    "drizzle/migrations",
    "prisma/migrations",
    "database/migrations"
  ];
  const drizzleConfigFiles = ["drizzle.config.ts", "drizzle.config.js", "drizzle.config.mjs", "drizzle.config.cjs"];
  for (const f of drizzleConfigFiles) {
    if (await fsExtra2.pathExists(resolve3(projectPath, f))) {
      const content = await fsExtra2.readFile(resolve3(projectPath, f), "utf8");
      const match = content.match(/out\s*:\s*["'`](.+?)["'`]/);
      if (match) {
        candidates.unshift(match[1]);
      }
    }
  }
  for (const rel of candidates) {
    if (await fsExtra2.pathExists(resolve3(projectPath, rel))) return rel;
  }
  return null;
}
async function initCommand(options, globalOptions) {
  const projectPath = resolve3(options.project || process.cwd());
  const spinner2 = createFlowSpinner().start("Collecting project information");
  let envName, databaseUrl, migrationsPath;
  if (options.yes) {
    envName = options.envName || "development";
    const detectedDb = await findDatabaseUrl(envName, projectPath);
    databaseUrl = options.dbUrl || detectedDb;
    if (!databaseUrl) {
      spinner2.fail("Database connection string is required. Please provide it with --db-url.");
      throw new Error("FLOW_MISSING_DB_NON_INTERACTIVE");
    }
    const detectedPath = await detectMigrationsDir(projectPath);
    migrationsPath = options.migrationsPath || detectedPath || "./migrations";
  } else {
    const envNameInput = await textInput("Environment name", {
      placeholder: "development",
      defaultValue: "development"
    });
    envName = envNameInput?.trim() || "development";
    const defaultDb = await findDatabaseUrl(envName, projectPath);
    const dbPrompt = "Database connection string (e.g. postgresql://user:pass@localhost:5432/db)";
    const dbInput = await textInput(dbPrompt, {
      placeholder: defaultDb || "postgresql://user:pass@localhost:5432/db",
      defaultValue: defaultDb
    });
    databaseUrl = (dbInput?.trim() || defaultDb).trim();
    if (!databaseUrl) {
      spinner2.fail("Database connection string is required");
      throw new Error("FLOW_MISSING_DB");
    }
    const detectedPath = await detectMigrationsDir(projectPath) || "./migrations";
    const migInput = await textInput("Path to migrations folder", {
      placeholder: detectedPath,
      defaultValue: detectedPath
    });
    migrationsPath = migInput?.trim() || detectedPath;
    const proceed = await confirmAction("Generate configuration with these values?");
    if (!proceed) {
      spinner2.fail("User cancelled");
      return;
    }
  }
  spinner2.update("Generating flow.config");
  const detectors = [
    { name: "prisma", detector: new PrismaDetector() },
    { name: "drizzle", detector: new DrizzleDetector() },
    { name: "typeorm", detector: new TypeORMDetector() }
  ];
  let detectedORM = null;
  for (const { name, detector } of detectors) {
    const result = await detector.detect(projectPath);
    if (result.found) {
      detectedORM = name;
      break;
    }
  }
  const config = {
    version: "0.1.0",
    defaultEnvironment: envName,
    ...detectedORM && { orm: detectedORM },
    environments: {
      [envName]: {
        db_connection_string: databaseUrl,
        migrationsPath
      }
    },
    safety: {
      maxTableSizeMB: 1024,
      maxLockTimeMs: 3e5
    }
  };
  const configPath = resolve3(projectPath, globalOptions.config || "flow.config.json");
  if (await fsExtra2.pathExists(configPath) && !options.yes && !await confirmAction(`Overwrite existing ${configPath}?`)) {
    spinner2.fail("Init aborted \u2013 config exists");
    return;
  }
  if (!globalOptions.dryRun) {
    await fsExtra2.writeFile(configPath, JSON.stringify(config, null, 2));
    spinner2.succeed(`Configuration written to ${configPath}`);
  } else {
    spinner2.succeed("Dry run complete \u2013 configuration would be:");
    console.log(JSON.stringify(config, null, 2));
  }
  try {
    const pkgPath = resolve3(projectPath, "package.json");
    if (await fsExtra2.pathExists(pkgPath)) {
      const fsmod = await import("fs-extra");
      const fsDyn = fsmod.default ?? fsmod;
      const pkg3 = await fsDyn.readJson(pkgPath);
      pkg3.scripts = pkg3.scripts || {};
      if (!pkg3.scripts.flow) {
        pkg3.scripts.flow = "flow";
        await fsDyn.writeJson(pkgPath, pkg3, { spaces: 2 });
        spinner2.update('Added "flow" script to package.json');
      }
    }
  } catch (err) {
    console.warn("\u26A0\uFE0F  Could not update package.json:", err instanceof Error ? err.message : err);
  }
}
var init_init = __esm({
  "src/commands/init.ts"() {
    "use strict";
    init_prompts();
    init_analyzer();
  }
});

// src/commands/config.ts
var config_exports = {};
__export(config_exports, {
  configCommand: () => configCommand
});
import { intro as intro4, outro as outro4 } from "@clack/prompts";
import pc5 from "picocolors";
async function configCommand(options, globalOptions) {
  intro4("\u2699\uFE0F Flow Configuration");
  const projectPath = options.project ? __require("path").resolve(options.project) : process.cwd();
  const cfg = await getFlowConfig(globalOptions, projectPath);
  console.log(pc5.bold("Current Configuration:"));
  console.log(JSON.stringify(cfg, null, 2));
  outro4("\u2699\uFE0F Configuration check complete.");
}
var init_config4 = __esm({
  "src/commands/config.ts"() {
    "use strict";
    init_config();
  }
});

// src/commands/status.ts
var status_exports = {};
__export(status_exports, {
  statusCommand: () => statusCommand
});
import { intro as intro5, outro as outro5 } from "@clack/prompts";
import fs10 from "fs-extra";
import path8 from "path";
import pc6 from "picocolors";
async function statusCommand(options, globalOptions) {
  const projectPath = options.project ? path8.resolve(options.project) : process.cwd();
  const cfg = await getFlowConfig(globalOptions, projectPath);
  const envCfg = cfg.environments[cfg.defaultEnvironment];
  const migrationsDir = envCfg.migrationsPath || "./migrations";
  const absoluteMigrationsDir = path8.resolve(projectPath, migrationsDir);
  intro5("\u{1F4CA} Migration Status");
  if (!await fs10.pathExists(absoluteMigrationsDir)) {
    console.log(pc6.yellow("Migrations directory not found."));
    return;
  }
  const files = await fs10.readdir(absoluteMigrationsDir);
  const migrationFiles = files.filter((file) => file.endsWith(".sql")).sort();
  if (migrationFiles.length === 0) {
    console.log(pc6.yellow("No migration files found."));
  } else {
    console.log(pc6.bold("Found migrations:"));
    migrationFiles.forEach((file) => {
      console.log(`  - ${pc6.cyan(file)}`);
    });
  }
  outro5("\u{1F4CA} Status check complete.");
}
var init_status = __esm({
  "src/commands/status.ts"() {
    "use strict";
    init_config();
  }
});

// src/index.ts
import { program } from "commander";
import { intro as intro6, outro as outro6 } from "@clack/prompts";
import pc7 from "picocolors";
import gradient from "gradient-string";
import boxen from "boxen";
var lazyImport = (importFn) => {
  let cachedModule = null;
  return async () => {
    if (!cachedModule) {
      cachedModule = await importFn();
    }
    return cachedModule;
  };
};
var getEnhanceCommand = lazyImport(() => Promise.resolve().then(() => (init_enhance(), enhance_exports)));
var getValidateCommand = lazyImport(() => Promise.resolve().then(() => (init_validate(), validate_exports)));
var getPlanCommand = lazyImport(() => Promise.resolve().then(() => (init_plan(), plan_exports)));
var getRollbackCommand = lazyImport(() => Promise.resolve().then(() => (init_rollback(), rollback_exports)));
var getInitCommand = lazyImport(() => Promise.resolve().then(() => (init_init(), init_exports)));
var getConfigCommand = lazyImport(() => Promise.resolve().then(() => (init_config4(), config_exports)));
var getStatusCommand = lazyImport(() => Promise.resolve().then(() => (init_status(), status_exports)));
var cachedBanner = null;
function getBanner() {
  if (cachedBanner) return cachedBanner;
  const flowTitle = gradient("#00D4FF", "#0099CC", "#006699")("Flow");
  const subtitle = pc7.dim("Database Migration Enhancement Tool");
  cachedBanner = boxen(
    `${flowTitle}
${subtitle}`,
    {
      padding: { top: 1, bottom: 1, left: 2, right: 2 },
      margin: { top: 1, bottom: 1 },
      borderStyle: "round",
      borderColor: "cyan",
      backgroundColor: "#001122",
      align: "center"
    }
  );
  return cachedBanner;
}
function showBanner() {
  console.log(getBanner());
}
function handleError(error) {
  console.error(pc7.red("\n\u274C Error:"), error.message || error);
  if (program.opts().verbose && error.stack) {
    console.error(pc7.dim("\nStack trace:"));
    console.error(pc7.dim(error.stack));
  }
  process.exit(1);
}
process.on("uncaughtException", handleError);
process.on("unhandledRejection", handleError);
program.name("flow").description("\u{1F30A} Flow - Database Migration Enhancement Tool").version("1.2.0").option("-v, --verbose", "Enable verbose output for debugging").option("-c, --config <path>", "Path to configuration file").option("--dry", "Run in dry-run mode (preview changes without applying)").hook("preAction", () => {
  const command = process.argv[2];
  if (command && !["--help", "-h", "--version", "-V"].includes(command)) {
    showBanner();
  }
});
program.command("enhance").description("\u{1F680} Interactively enhance a migration file with safety and performance improvements").argument("[file]", "Migration file to enhance (auto-detects latest if not specified)").option("-p, --project <path>", "Path to project directory").action(async (file, options) => {
  try {
    intro6(pc7.cyan("Starting Flow Enhancement Process"));
    const { enhanceCommand: enhanceCommand2 } = await getEnhanceCommand();
    await enhanceCommand2({ file, project: options.project }, program.opts());
    outro6(pc7.green("Enhancement completed! \u{1F389}"));
  } catch (error) {
    handleError(error);
  }
});
program.command("validate").description("\u{1F50D} Validate a migration file for potential issues").argument("[file]", "Migration file to validate (auto-detects latest if not specified)").option("-p, --project <path>", "Path to project directory").action(async (file, options) => {
  try {
    intro6(pc7.cyan("Starting Migration Validation"));
    const { validateCommand: validateCommand2 } = await getValidateCommand();
    await validateCommand2({ file, project: options.project }, program.opts());
    outro6(pc7.green("Validation completed! \u2705"));
  } catch (error) {
    handleError(error);
  }
});
program.command("plan").description("\u{1F4CB} Plan enhancement changes for a migration file").argument("[file]", "Migration file to plan (auto-detects latest if not specified)").option("-p, --project <path>", "Path to project directory").action(async (file, options) => {
  try {
    intro6(pc7.cyan("Creating Enhancement Plan"));
    const { planCommand: planCommand2 } = await getPlanCommand();
    await planCommand2({ file, project: options.project }, program.opts());
    outro6(pc7.green("Plan created! \u{1F4CB}"));
  } catch (error) {
    handleError(error);
  }
});
program.command("rollback").description("\u21A9\uFE0F  Rollback changes to a migration file").argument("[file]", "Migration file to rollback (auto-detects latest if not specified)").option("-p, --project <path>", "Path to project directory").action(async (file, options) => {
  try {
    intro6(pc7.cyan("Starting Rollback Process"));
    const { rollbackCommand: rollbackCommand2 } = await getRollbackCommand();
    await rollbackCommand2({ file, project: options.project }, program.opts());
    outro6(pc7.green("Rollback completed! \u21A9\uFE0F"));
  } catch (error) {
    handleError(error);
  }
});
program.command("init").description("\u{1F680} Initialize Flow in your project").option("-p, --project <path>", "Path to project directory").action(async (options) => {
  try {
    intro6(pc7.cyan("Initializing Flow"));
    const { initCommand: initCommand2 } = await getInitCommand();
    await initCommand2({ project: options.project }, program.opts());
    outro6(pc7.green("Flow initialized successfully! \u{1F680}"));
  } catch (error) {
    handleError(error);
  }
});
program.command("config").description("\u2699\uFE0F  Configure Flow settings").option("-p, --project <path>", "Path to project directory").option("-s, --show", "Show current configuration").option("-e, --edit", "Edit configuration interactively").action(async (options) => {
  try {
    intro6(pc7.cyan("Managing Flow Configuration"));
    const { configCommand: configCommand2 } = await getConfigCommand();
    await configCommand2(options, program.opts());
    outro6(pc7.green("Configuration updated! \u2699\uFE0F"));
  } catch (error) {
    handleError(error);
  }
});
program.command("status").description("\u{1F4CA} Show Flow status and statistics").option("-p, --project <path>", "Path to project directory").action(async (options) => {
  try {
    intro6(pc7.cyan("Getting Flow Status"));
    const { statusCommand: statusCommand2 } = await getStatusCommand();
    await statusCommand2({ project: options.project }, program.opts());
    outro6(pc7.green("Status retrieved! \u{1F4CA}"));
  } catch (error) {
    handleError(error);
  }
});
if (process.argv.length === 2) {
  showBanner();
  console.log(pc7.dim("\n\u{1F4A1} Tip: Run"), pc7.cyan("flow --help"), pc7.dim("to see available commands"));
  console.log(pc7.dim("   Start with:"), pc7.cyan("flow init"), pc7.dim("to initialize Flow in your project"));
  console.log(pc7.dim("   Then use:"), pc7.cyan("flow enhance"), pc7.dim("to enhance your latest migration"));
  console.log("");
}
program.parse();
//# sourceMappingURL=index.js.map