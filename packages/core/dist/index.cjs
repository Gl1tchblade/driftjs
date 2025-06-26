"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  createFilePath: () => createFilePath,
  exists: () => exists,
  findFiles: () => findFiles,
  getFileStats: () => getFileStats,
  hasFilesMatching: () => hasFilesMatching,
  isValidConnectionString: () => isValidConnectionString,
  isValidDatabaseType: () => isValidDatabaseType,
  isValidFilePath: () => isValidFilePath,
  isValidSQLIdentifier: () => isValidSQLIdentifier,
  isValidVersion: () => isValidVersion,
  loadFlowConfig: () => loadFlowConfig,
  parallelLimit: () => parallelLimit,
  promisify: () => promisify,
  readFileContent: () => readFileContent,
  readJsonFile: () => readJsonFile,
  retry: () => retry,
  safeAsync: () => safeAsync,
  sanitizeInput: () => sanitizeInput,
  sleep: () => sleep,
  validateDatabaseConfig: () => validateDatabaseConfig,
  validateFlowConfig: () => validateFlowConfig,
  withTimeout: () => withTimeout,
  writeFileContent: () => writeFileContent
});
module.exports = __toCommonJS(index_exports);

// src/utils/file-utils.ts
var import_fs_extra = __toESM(require("fs-extra"), 1);
var import_path = require("path");
var { readFile, writeFile, access, stat, readdir } = import_fs_extra.default;
async function exists(path2) {
  try {
    await access(path2);
    return true;
  } catch {
    return false;
  }
}
async function createFilePath(path2, basePath = process.cwd()) {
  const absolutePath = (0, import_path.resolve)(basePath, path2);
  const relativePath = (0, import_path.relative)(basePath, absolutePath);
  const fileExists = await exists(absolutePath);
  return {
    absolute: absolutePath,
    relative: relativePath,
    exists: fileExists
  };
}
async function readFileContent(path2) {
  try {
    const content = await readFile(path2, "utf-8");
    return { success: true, data: content };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error("Unknown error reading file")
    };
  }
}
async function writeFileContent(path2, content) {
  try {
    await writeFile(path2, content, "utf-8");
    return { success: true, data: void 0 };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error("Unknown error writing file")
    };
  }
}
async function getFileStats(path2) {
  try {
    const stats = await stat(path2);
    return {
      success: true,
      data: {
        size: stats.size,
        modified: stats.mtime,
        isDirectory: stats.isDirectory()
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error("Unknown error getting file stats")
    };
  }
}
async function findFiles(directory, pattern, recursive = true) {
  const files = [];
  try {
    const items = await readdir(directory, { withFileTypes: true });
    for (const item of items) {
      const fullPath = (0, import_path.join)(directory, item.name);
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
async function hasFilesMatching(directory, pattern) {
  const files = await findFiles(directory, pattern, false);
  return files.length > 0;
}
async function readJsonFile(path2) {
  const fileResult = await readFileContent(path2);
  if (!fileResult.success) {
    return fileResult;
  }
  try {
    const data = JSON.parse(fileResult.data);
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: new Error(`Invalid JSON in file ${path2}: ${error instanceof Error ? error.message : "Unknown error"}`)
    };
  }
}

// src/utils/async-utils.ts
async function retry(fn, options = { maxAttempts: 3, delay: 1e3, backoff: 2 }) {
  let lastError;
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Unknown error");
      if (attempt === options.maxAttempts) {
        throw lastError;
      }
      const delay = options.delay * Math.pow(options.backoff, attempt - 1);
      await sleep(delay);
    }
  }
  throw lastError;
}
function sleep(ms) {
  return new Promise((resolve2) => setTimeout(resolve2, ms));
}
async function withTimeout(promise, timeoutMs, timeoutMessage = "Operation timed out") {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}
async function parallelLimit(items, fn, limit = 10) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const promise = fn(item).then((result) => {
      results.push(result);
    });
    executing.push(promise);
    if (executing.length >= limit) {
      await Promise.race(executing);
      executing.splice(executing.findIndex((p) => p === promise), 1);
    }
  }
  await Promise.all(executing);
  return results;
}
function promisify(fn) {
  return new Promise((resolve2, reject) => {
    fn((error, result) => {
      if (error) {
        reject(error);
      } else {
        resolve2(result);
      }
    });
  });
}
async function safeAsync(fn) {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error("Unknown error")
    };
  }
}

// src/utils/validation.ts
function validateDatabaseConfig(config) {
  const errors = [];
  if (!config.type) {
    errors.push("Database type is required");
  } else if (!isValidDatabaseType(config.type)) {
    errors.push(`Invalid database type: ${config.type}`);
  }
  if (!config.database) {
    errors.push("Database name is required");
  }
  if (config.url) {
    if (!isValidConnectionString(config.url)) {
      errors.push("Invalid database connection string");
    }
  } else {
    if (!config.host) {
      errors.push("Database host is required when not using connection string");
    }
    if (config.port && (config.port < 1 || config.port > 65535)) {
      errors.push("Invalid port number");
    }
  }
  return { valid: errors.length === 0, errors };
}
function isValidDatabaseType(type) {
  return ["postgresql", "mysql", "sqlite", "mariadb"].includes(type);
}
function isValidConnectionString(url) {
  try {
    const parsed = new URL(url);
    return ["postgresql:", "postgres:", "mysql:", "sqlite:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}
function isValidFilePath(path2) {
  if (!path2 || typeof path2 !== "string") {
    return false;
  }
  const invalidChars = /[<>:"|?*]/;
  if (invalidChars.test(path2)) {
    return false;
  }
  return true;
}
function isValidVersion(version) {
  const semverRegex = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*)?(?:\+[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*)?$/;
  return semverRegex.test(version);
}
function sanitizeInput(input) {
  return input.replace(/[<>]/g, "").replace(/[\x00-\x1f\x7f]/g, "").trim();
}
function isValidSQLIdentifier(identifier) {
  if (!identifier || typeof identifier !== "string") {
    return false;
  }
  const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
  return identifierRegex.test(identifier) && identifier.length <= 63;
}

// src/utils/config.ts
var import_fs_extra2 = __toESM(require("fs-extra"), 1);
var import_node_path = __toESM(require("path"), 1);
var DEFAULT_CONFIG_FILES = [
  "flow.config.json",
  "flow.config.js",
  "flow.config.cjs",
  "flow.config.mjs",
  "flow.config.ts"
];
async function loadFlowConfig(cwd = process.cwd(), explicitPath) {
  let configPath = explicitPath;
  if (!configPath) {
    configPath = await findConfigFile(cwd);
    if (!configPath) {
      throw new Error("Unable to locate flow.config file in current directory tree.");
    }
  }
  const ext = import_node_path.default.extname(configPath);
  let raw;
  if (ext === ".json") {
    raw = await import_fs_extra2.default.readJSON(configPath);
  } else if (ext === ".js" || ext === ".cjs" || ext === ".mjs") {
    raw = await import(configPath);
    raw = raw.default ?? raw;
  } else if (ext === ".ts") {
    throw new Error("Loading TypeScript config files is not yet supported. Please use JSON or JavaScript.");
  } else {
    throw new Error(`Unsupported config file extension: ${ext}`);
  }
  const validated = validateFlowConfig(raw);
  if (!validated.valid) {
    throw new Error(`Invalid flow.config: 
${validated.errors.join("\n")}`);
  }
  return validated.config;
}
async function findConfigFile(startDir) {
  let dir = startDir;
  while (import_node_path.default.dirname(dir) !== dir) {
    for (const file of DEFAULT_CONFIG_FILES) {
      const candidate = import_node_path.default.join(dir, file);
      if (await import_fs_extra2.default.pathExists(candidate)) {
        return candidate;
      }
    }
    dir = import_node_path.default.dirname(dir);
  }
  return void 0;
}
function validateFlowConfig(input) {
  if (typeof input !== "object" || input === null) {
    return { valid: false, errors: ["Configuration must be an object"] };
  }
  const cfg = input;
  const errors = [];
  if (!cfg.environments || Object.keys(cfg.environments).length === 0) {
    errors.push("`environments` section is required and cannot be empty");
  }
  if (!cfg.defaultEnvironment) {
    errors.push("`defaultEnvironment` is required");
  } else if (cfg.environments && !(cfg.defaultEnvironment in cfg.environments)) {
    errors.push(`defaultEnvironment \`${cfg.defaultEnvironment}\` not found in environments section`);
  }
  if (cfg.environments) {
    for (const [envName, envCfg] of Object.entries(cfg.environments)) {
      if (!envCfg.databaseUrl) {
        errors.push(`environment[${envName}].databaseUrl is required`);
      }
      if (envCfg.migrationsPath && typeof envCfg.migrationsPath !== "string") {
        errors.push(`environment[${envName}].migrationsPath must be a string`);
      }
      if (envCfg.migrationsPath) {
        const absPath = import_node_path.default.isAbsolute(envCfg.migrationsPath) ? envCfg.migrationsPath : import_node_path.default.join(process.cwd(), envCfg.migrationsPath);
        if (!import_fs_extra2.default.existsSync(absPath)) {
          errors.push(`environment[${envName}].migrationsPath '${envCfg.migrationsPath}' does not exist`);
        }
      }
      if (envCfg.patterns) {
        if (typeof envCfg.patterns !== "object") {
          errors.push(`environment[${envName}].patterns must be an object`);
        }
      }
    }
  }
  if (cfg.safety) {
    if (cfg.safety.maxLockTimeMs && cfg.safety.maxLockTimeMs < 0) {
      errors.push("safety.maxLockTimeMs must be positive");
    }
    if (cfg.safety.maxTableSizeMB && cfg.safety.maxTableSizeMB < 0) {
      errors.push("safety.maxTableSizeMB must be positive");
    }
  }
  if (cfg.database) {
    for (const [name, dbCfg] of Object.entries(cfg.database)) {
      const { valid, errors: dbErrors } = validateDatabaseConfig(dbCfg);
      if (!valid) {
        errors.push(...dbErrors.map((e) => `database[${name}]: ${e}`));
      }
    }
  }
  return { valid: errors.length === 0, errors, config: cfg };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createFilePath,
  exists,
  findFiles,
  getFileStats,
  hasFilesMatching,
  isValidConnectionString,
  isValidDatabaseType,
  isValidFilePath,
  isValidSQLIdentifier,
  isValidVersion,
  loadFlowConfig,
  parallelLimit,
  promisify,
  readFileContent,
  readJsonFile,
  retry,
  safeAsync,
  sanitizeInput,
  sleep,
  validateDatabaseConfig,
  validateFlowConfig,
  withTimeout,
  writeFileContent
});
//# sourceMappingURL=index.cjs.map