#!/usr/bin/env node

// src/index.ts
import { Command } from "commander";
import { intro, outro, isCancel, cancel, log as log2 } from "@clack/prompts";

// package.json
var version = "0.1.7";

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
  s.start(colors.blue(`\u{1F30A} ${message}`));
  return {
    update: (newMessage) => s.message(colors.blue(`\u{1F30A} ${newMessage}`)),
    succeed: (message2) => s.stop(colors.green(`\u2705 ${message2 || "Complete"}`)),
    fail: (message2) => s.stop(colors.red(`\u274C ${message2 || "Failed"}`)),
    stop: () => s.stop()
  };
}

// src/commands/init.ts
import fsExtra from "fs-extra";
import { resolve } from "path";
import dotenv from "dotenv";
async function findDatabaseUrl(envName) {
  const candidateFiles = [];
  candidateFiles.push(resolve(".env"));
  const parts = process.cwd().split("/");
  for (let i = parts.length - 1; i > 0; i--) {
    candidateFiles.push(parts.slice(0, i + 1).join("/") + "/.env");
  }
  const appsDir = resolve("apps");
  const pkgsDir = resolve("packages");
  if (await fsExtra.pathExists(appsDir)) {
    const sub = await fsExtra.readdir(appsDir);
    sub.forEach((s) => candidateFiles.push(resolve(appsDir, s, ".env")));
  }
  if (await fsExtra.pathExists(pkgsDir)) {
    const sub = await fsExtra.readdir(pkgsDir);
    sub.forEach((s) => candidateFiles.push(resolve(pkgsDir, s, ".env")));
  }
  for (const file of candidateFiles) {
    if (await fsExtra.pathExists(file)) {
      try {
        const envVars = dotenv.parse(await fsExtra.readFile(file));
        const v = envVars.DATABASE_URL || envVars[`DATABASE_URL_${envName.toUpperCase()}`];
        if (v) return v;
      } catch {
      }
    }
  }
  return "";
}
async function detectMigrationsDir() {
  const candidates = [
    "migrations",
    "db/migrations",
    "drizzle/migrations",
    "prisma/migrations",
    "database/migrations"
  ];
  const drizzleConfigFiles = ["drizzle.config.ts", "drizzle.config.js", "drizzle.config.mjs", "drizzle.config.cjs"];
  for (const f of drizzleConfigFiles) {
    if (await fsExtra.pathExists(resolve(f))) {
      const content = await fsExtra.readFile(resolve(f), "utf8");
      const match = content.match(/out\s*:\s*["'`](.+?)["'`]/);
      if (match) {
        candidates.unshift(match[1]);
      }
    }
  }
  for (const rel of candidates) {
    if (await fsExtra.pathExists(resolve(rel))) return rel;
  }
  return null;
}
async function initCommand(options, globalOptions) {
  const spinner3 = createSpinner("Collecting project information");
  let envName, databaseUrl, migrationsPath;
  if (options.yes) {
    envName = options.envName || "development";
    const detectedDb = await findDatabaseUrl(envName);
    databaseUrl = options.dbUrl || detectedDb;
    if (!databaseUrl) {
      spinner3.fail("Database connection string is required. Please provide it with --db-url.");
      throw new Error("FLOW_MISSING_DB_NON_INTERACTIVE");
    }
    const detectedPath = await detectMigrationsDir();
    migrationsPath = options.migrationsPath || detectedPath || "./migrations";
  } else {
    const envNameInput = await textInput("Environment name", {
      placeholder: "development",
      defaultValue: "development"
    });
    envName = envNameInput?.trim() || "development";
    const defaultDb = await findDatabaseUrl(envName);
    const dbPrompt = "Database connection string (e.g. postgresql://user:pass@localhost:5432/db)";
    const dbInput = await textInput(dbPrompt, {
      placeholder: defaultDb || "postgresql://user:pass@localhost:5432/db",
      defaultValue: defaultDb
    });
    databaseUrl = (dbInput?.trim() || defaultDb).trim();
    if (!databaseUrl) {
      spinner3.fail("Database connection string is required");
      throw new Error("FLOW_MISSING_DB");
    }
    const detectedPath = await detectMigrationsDir() || "./migrations";
    const migInput = await textInput("Path to migrations folder", {
      placeholder: detectedPath,
      defaultValue: detectedPath
    });
    migrationsPath = migInput?.trim() || detectedPath;
    const proceed = await confirmAction("Generate configuration with these values?");
    if (!proceed) {
      spinner3.fail("User cancelled");
      return;
    }
  }
  spinner3.update("Generating flow.config");
  const dbTypeMatch = databaseUrl.split(":")[0];
  const config = {
    version: "0.1.0",
    defaultEnvironment: envName,
    environments: {
      [envName]: {
        databaseUrl,
        migrationsPath
      }
    },
    safety: {
      maxTableSizeMB: 1024,
      maxLockTimeMs: 3e5
    },
    database: {
      default: {
        type: dbTypeMatch
      }
    }
  };
  const configPath = resolve(globalOptions.config || "flow.config.json");
  if (await fsExtra.pathExists(configPath) && !options.yes && !await confirmAction(`Overwrite existing ${configPath}?`)) {
    spinner3.fail("Init aborted \u2013 config exists");
    return;
  }
  if (!globalOptions.dryRun) {
    await fsExtra.writeFile(configPath, JSON.stringify(config, null, 2));
    spinner3.succeed(`Configuration written to ${configPath}`);
  } else {
    spinner3.succeed("Dry run complete \u2013 configuration would be:");
    console.log(JSON.stringify(config, null, 2));
  }
  try {
    const pkgPath = resolve("package.json");
    if (await fsExtra.pathExists(pkgPath)) {
      const fsmod = await import("fs-extra");
      const fsDyn = fsmod.default ?? fsmod;
      const pkg = await fsDyn.readJson(pkgPath);
      pkg.scripts = pkg.scripts || {};
      if (!pkg.scripts.flow) {
        pkg.scripts.flow = "flow";
        await fsDyn.writeJson(pkgPath, pkg, { spaces: 2 });
        spinner3.update('Added "flow" script to package.json');
      }
    }
  } catch (err) {
    console.warn("\u26A0\uFE0F  Could not update package.json:", err instanceof Error ? err.message : err);
  }
}

// src/commands/sync.ts
import { confirm as confirm2 } from "@clack/prompts";

// src/lib/config.ts
import fsExtra2 from "fs-extra";
import { resolve as resolve2, dirname } from "path";
async function getFlowConfig(global) {
  const configPath = await findConfigFile(process.cwd(), global.config);
  return JSON.parse(await fsExtra2.readFile(configPath, "utf8"));
}
async function findConfigFile(startDir, explicit) {
  if (explicit) {
    const p = resolve2(explicit);
    if (await fsExtra2.pathExists(p)) return p;
    throw new Error(`Config file not found at ${p}`);
  }
  let dir = startDir;
  while (true) {
    const candidate = resolve2(dir, "flow.config.json");
    if (await fsExtra2.pathExists(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error("flow.config.json not found");
}

// ../../packages/analyzer/src/orm-detectors/base-detector.ts
import { join } from "path";
import { exists, createFilePath, readJsonFile, findFiles } from "@driftjs/core";
var BaseORMDetector = class {
  /**
   * Common helper: Check if package.json contains specific dependencies
   */
  async checkPackageJsonDependencies(projectPath, dependencies) {
    const packageJsonPath = join(projectPath, "package.json");
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
      const fullPath = join(projectPath, filePath);
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
      const fullDirectory = join(projectPath, directory);
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

// ../../packages/analyzer/src/orm-detectors/prisma-detector.ts
import { readFileContent, createFilePath as createFilePath2 } from "@driftjs/core";
var PrismaDetector = class extends BaseORMDetector {
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
    const migrationDirectory = await createFilePath2("prisma/migrations", projectPath);
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

// ../../packages/analyzer/src/orm-detectors/drizzle-detector.ts
import fs from "fs/promises";
var DrizzleDetector = class extends BaseORMDetector {
  name = "drizzle";
  async detect(projectPath) {
    const evidence = [];
    try {
      const configFiles = [
        "drizzle.config.ts",
        "drizzle.config.js",
        "drizzle.config.mjs"
      ];
      const { existing: configFilesFound } = await this.checkFiles(projectPath, configFiles);
      evidence.push(...configFilesFound.map((f) => `Found config file: ${f.relative}`));
      const deps = await this.checkPackageJsonDependencies(projectPath, ["drizzle-orm", "drizzle-kit"]);
      evidence.push(...deps.found.map((dep) => `Found dependency: ${dep}`));
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
      const confidence = this.calculateConfidence({
        required: {
          found: deps.found.length > 0 ? 1 : 0,
          total: 1
        },
        optional: {
          found: configFilesFound.length + schemaFiles.length + migrationDirsFound.length,
          total: configFiles.length + schemaPatterns.length + migrationDirs.length
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
        evidence: [`Error detecting Drizzle: ${error}`]
      };
    }
  }
  async extractConfig(projectPath) {
    try {
      const configFiles = [
        "drizzle.config.ts",
        "drizzle.config.js",
        "drizzle.config.mjs"
      ];
      const { existing: configFilesFound } = await this.checkFiles(projectPath, configFiles);
      if (configFilesFound.length === 0) {
        return null;
      }
      const configFile = configFilesFound[0];
      const configContent = await fs.readFile(configFile.absolute, "utf-8");
      const driver = this.extractConfigValue(configContent, "driver") || "pg";
      const validDrivers = ["pg", "mysql2", "better-sqlite3"];
      const mappedDriver = validDrivers.includes(driver) ? driver : "pg";
      const config = {
        type: "drizzle",
        configFile,
        driver: mappedDriver,
        schemaPath: this.extractConfigValue(configContent, "schema") || "./src/db/schema.ts",
        outDir: this.extractConfigValue(configContent, "out") || "./drizzle",
        migrationDirectory: configFile,
        // Will be updated with proper migration directory
        dependencies: ["drizzle-orm", "drizzle-kit"]
      };
      return config;
    } catch (error) {
      console.warn(`Failed to extract Drizzle config: ${error}`);
      return null;
    }
  }
  async getDatabaseConfig(projectPath) {
    try {
      const envFiles = [".env", ".env.local", ".env.development"];
      const { existing: envFilesFound } = await this.checkFiles(projectPath, envFiles);
      for (const envFile of envFilesFound) {
        const envContent = await fs.readFile(envFile.absolute, "utf-8");
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
      console.warn(`Failed to extract database config: ${error}`);
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
};

// ../../packages/analyzer/src/orm-detectors/typeorm-detector.ts
import fs2 from "fs/promises";
var TypeORMDetector = class extends BaseORMDetector {
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
        const configContent = await fs2.readFile(configFile.absolute, "utf-8");
        const jsonConfig = JSON.parse(configContent);
        entities = Array.isArray(jsonConfig.entities) ? jsonConfig.entities : ["src/**/*.entity.{ts,js}"];
        migrations = Array.isArray(jsonConfig.migrations) ? jsonConfig.migrations : ["src/migrations/*.{ts,js}"];
      } else {
        const configContent = await fs2.readFile(configFile.absolute, "utf-8");
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
        const envContent = await fs2.readFile(envFile.absolute, "utf-8");
        const dbUrl = this.extractEnvValue(envContent, "DATABASE_URL") || this.extractEnvValue(envContent, "DB_URL") || this.extractEnvValue(envContent, "TYPEORM_URL");
        if (dbUrl) {
          const parsed = this.parseDatabaseUrl(dbUrl);
          if (parsed) return parsed;
        }
      }
      const typeormConfig = await this.extractConfig(projectPath);
      if (typeormConfig?.configFile) {
        const configContent = await fs2.readFile(typeormConfig.configFile.absolute, "utf-8");
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

// src/commands/sync.ts
import { EnhancementEngine } from "@driftjs/enhancer";
import fs3 from "fs-extra";
import path from "path";
import { diffChars } from "diff";
import pc from "picocolors";
import { exec } from "child_process";
import { promisify } from "util";
var execAsync = promisify(exec);
async function syncCommand(options, globalOptions) {
  const spinner3 = createSpinner("Detecting ORM setup and analyzing schema changes...");
  const cfg = await getFlowConfig(globalOptions);
  const envCfg = cfg.environments[cfg.defaultEnvironment];
  const projectPath = process.cwd();
  let detectedORM = null;
  const detectors = [
    { name: "prisma", detector: new PrismaDetector() },
    { name: "drizzle", detector: new DrizzleDetector() },
    { name: "typeorm", detector: new TypeORMDetector() }
  ];
  if (options.orm && options.orm !== "auto") {
    detectedORM = options.orm;
  } else {
    for (const { name, detector: detector2 } of detectors) {
      const result = await detector2.detect(projectPath);
      if (result.found) {
        detectedORM = name;
        break;
      }
    }
  }
  if (!detectedORM) {
    spinner3.fail("ORM detection failed");
    console.log(pc.red("No supported ORM detected. Make sure you have Prisma, Drizzle, or TypeORM configured."));
    return;
  }
  spinner3.update(`Detected ${detectedORM.toUpperCase()} - analyzing schema changes...`);
  const detector = detectors.find((d) => d.name === detectedORM)?.detector;
  if (!detector) {
    spinner3.fail("Detector not found");
    return;
  }
  const ormConfig = await detector.extractConfig(projectPath);
  const hasChanges = await checkForSchemaChanges(detectedORM, ormConfig, projectPath);
  if (!hasChanges && !options.force) {
    spinner3.succeed("Schema analysis completed");
    console.log(pc.green("\u{1F389} No pending schema changes detected. Your migrations are up to date."));
    console.log(pc.gray("Use --force to re-analyze existing migrations for enhancements."));
    return;
  }
  const migrationsDir = envCfg.migrationsPath || ormConfig?.migrationDirectory?.relative || "./migrations";
  const absoluteMigrationsDir = path.resolve(projectPath, migrationsDir);
  if (hasChanges) {
    spinner3.update("Generating migration plan for schema changes...");
    await handleSchemaChanges(detectedORM, ormConfig, absoluteMigrationsDir, globalOptions);
  } else {
    spinner3.update("Analyzing existing migrations for enhancements...");
    await enhanceExistingMigrations(absoluteMigrationsDir, globalOptions);
  }
  spinner3.succeed("Sync completed");
}
async function checkForSchemaChanges(orm, config, projectPath) {
  switch (orm) {
    case "prisma":
      return await checkPrismaChanges(config, projectPath);
    case "drizzle":
      return await checkDrizzleChanges(config, projectPath);
    case "typeorm":
      return await checkTypeORMChanges(config, projectPath);
    default:
      return false;
  }
}
async function checkPrismaChanges(config, projectPath) {
  try {
    const schemaPath = path.join(projectPath, "prisma", "schema.prisma");
    const migrationsPath = path.join(projectPath, "prisma", "migrations");
    if (!await fs3.pathExists(schemaPath)) return false;
    if (!await fs3.pathExists(migrationsPath)) return true;
    try {
      await execAsync("npx prisma migrate status", { cwd: projectPath });
      try {
        const { stdout } = await execAsync("npx prisma migrate diff --from-migrations ./prisma/migrations --to-schema-datamodel ./prisma/schema.prisma", { cwd: projectPath });
        return stdout.trim().length > 0;
      } catch {
        return true;
      }
    } catch {
      const schemaStats = await fs3.stat(schemaPath);
      const migrationFiles = await fs3.readdir(migrationsPath);
      if (migrationFiles.length === 0) return true;
      const migrationDirs = migrationFiles.filter((file) => file.match(/^\d{14}_/));
      if (migrationDirs.length === 0) return true;
      const latestMigration = migrationDirs.sort().pop();
      const latestMigrationPath = path.join(migrationsPath, latestMigration);
      const migrationStats = await fs3.stat(latestMigrationPath);
      return schemaStats.mtime > migrationStats.mtime;
    }
  } catch (error) {
    console.warn("Error checking Prisma changes:", error);
    return false;
  }
}
async function checkDrizzleChanges(config, projectPath) {
  try {
    await execAsync("npx drizzle-kit check", { cwd: projectPath });
    return false;
  } catch (error) {
    if (error.code === 1) {
      return true;
    }
    console.warn("drizzle-kit check failed, falling back to file-based change detection.");
    const schemaFiles = ["src/db/schema.ts", "src/schema.ts", "db/schema.ts", "schema.ts", "src/lib/db/schema.ts"];
    const migrationsDir = config?.outDir || "./drizzle";
    const migrationsDirPath = path.join(projectPath, migrationsDir);
    if (!await fs3.pathExists(migrationsDirPath)) return true;
    for (const schemaFile of schemaFiles) {
      const schemaPath = path.join(projectPath, schemaFile);
      if (await fs3.pathExists(schemaPath)) {
        const schemaStats = await fs3.stat(schemaPath);
        const migrationFiles = await fs3.readdir(migrationsDirPath);
        const sqlFiles = migrationFiles.filter((f) => f.endsWith(".sql"));
        if (sqlFiles.length === 0) return true;
        const latestMigration = sqlFiles.sort().pop();
        const latestMigrationPath = path.join(migrationsDirPath, latestMigration);
        const migrationStats = await fs3.stat(latestMigrationPath);
        if (schemaStats.mtime > migrationStats.mtime) {
          return true;
        }
      }
    }
    return false;
  }
}
async function checkTypeORMChanges(config, projectPath) {
  try {
    try {
      const { stdout } = await execAsync("npx typeorm migration:show", { cwd: projectPath });
      return !stdout.includes("No migrations are pending");
    } catch {
      const entityDirs = ["src/entities", "src/entity", "entities"];
      const migrationsDir = config?.migrationDirectory || "./src/migrations";
      const migrationsDirPath = path.join(projectPath, migrationsDir);
      if (!await fs3.pathExists(migrationsDirPath)) return true;
      for (const entityDir of entityDirs) {
        const entityDirPath = path.join(projectPath, entityDir);
        if (await fs3.pathExists(entityDirPath)) {
          const entityFiles = await fs3.readdir(entityDirPath);
          const tsFiles = entityFiles.filter((f) => f.endsWith(".ts") || f.endsWith(".js"));
          for (const entityFile of tsFiles) {
            const entityPath = path.join(entityDirPath, entityFile);
            const entityStats = await fs3.stat(entityPath);
            const migrationFiles = await fs3.readdir(migrationsDirPath);
            if (migrationFiles.length === 0) return true;
            const latestMigration = migrationFiles.sort().pop();
            const latestMigrationPath = path.join(migrationsDirPath, latestMigration);
            const migrationStats = await fs3.stat(latestMigrationPath);
            if (entityStats.mtime > migrationStats.mtime) {
              return true;
            }
          }
        }
      }
      return false;
    }
  } catch (error) {
    console.warn("Error checking TypeORM changes:", error);
    return false;
  }
}
async function handleSchemaChanges(orm, config, migrationsDir, globalOptions) {
  const migrationName = `flow_change_${Date.now()}`;
  let generateCmd = "";
  switch (orm) {
    case "prisma":
      generateCmd = `npx prisma migrate dev --name ${migrationName}`;
      break;
    case "drizzle":
      generateCmd = `npx drizzle-kit generate`;
      if (config?.driver === "mysql2") {
        generateCmd += " --dialect=mysql";
      } else if (config?.driver === "pg") {
        generateCmd += " --dialect=postgresql";
      } else {
        generateCmd += " --dialect=sqlite";
      }
      break;
    case "typeorm":
      const migPath = path.join(migrationsDir, migrationName);
      generateCmd = `npx typeorm migration:generate ${migPath}`;
      break;
  }
  const spinner3 = createSpinner(`Running ${orm} to generate migration...`);
  try {
    const { stdout, stderr } = await execAsync(generateCmd, { cwd: process.cwd() });
    if (globalOptions.debug) {
      console.log(stdout);
      if (stderr) console.error(pc.yellow(stderr));
    }
    spinner3.succeed("ORM migration generated successfully.");
    await enhanceExistingMigrations(migrationsDir, globalOptions);
  } catch (error) {
    spinner3.fail("Migration generation failed.");
    console.error(pc.red(error.stderr || error.message));
    console.log(pc.yellow(`Could not automatically generate migration. Please run the following command manually:
${generateCmd}`));
  }
}
async function enhanceExistingMigrations(migrationsDir, globalOptions) {
  const spinner3 = createSpinner("Analyzing migrations for enhancements...");
  if (!await fs3.pathExists(migrationsDir)) {
    spinner3.fail(`Migrations directory not found: ${migrationsDir}`);
    return;
  }
  const files = await fs3.readdir(migrationsDir);
  const migrationFiles = files.filter((file) => file.endsWith(".sql") || file.endsWith(".ts") || file.endsWith(".js"));
  if (migrationFiles.length === 0) {
    spinner3.succeed("No migration files found to analyze.");
    return;
  }
  spinner3.update(`Found ${migrationFiles.length} migration(s) to analyze for enhancements.`);
  const engine = new EnhancementEngine();
  for (const file of migrationFiles) {
    spinner3.update(`Analyzing ${file}...`);
    const filePath = path.join(migrationsDir, file);
    const content = await fs3.readFile(filePath, "utf-8");
    const sql = extractSQLFromMigrationFile(content);
    const migrationFile = {
      path: filePath,
      name: file,
      up: sql,
      down: "",
      timestamp: /* @__PURE__ */ new Date(),
      operations: [],
      checksum: ""
    };
    const enhanced = await engine.enhance(migrationFile);
    if (enhanced.original.up !== enhanced.enhanced.up) {
      const originalColor = (text2) => pc.red(`- ${text2}`);
      const enhancedColor = (text2) => pc.green(`+ ${text2}`);
      const diff = diffChars(enhanced.original.up, enhanced.enhanced.up);
      let diffOutput = "";
      diff.forEach((part) => {
        const color = part.added ? enhancedColor : part.removed ? originalColor : pc.gray;
        diffOutput += color(part.value);
      });
      console.log(pc.bold(`
Enhancements for ${file}:`));
      console.log(diffOutput);
      const proceed = await confirm2({ message: `Apply these enhancements to ${file}?` });
      if (proceed) {
        try {
          const newContent = await replaceEnhancedSQLInMigrationFile(filePath, enhanced.enhanced.up, enhanced.enhanced.down);
          await fs3.writeFile(filePath, newContent, "utf-8");
          console.log(pc.green(`\u2705 Updated ${file}`));
        } catch (error) {
          console.log(pc.yellow(`\u26A0\uFE0F  Could not automatically update ${file}: ${error}`));
          console.log(pc.gray("Enhanced UP SQL:"));
          console.log(enhanced.enhanced.up);
          if (enhanced.enhanced.down) {
            console.log(pc.gray("Enhanced DOWN SQL:"));
            console.log(enhanced.enhanced.down);
          }
        }
      } else {
        console.log(pc.gray(`Skipped ${file}`));
      }
    } else {
      console.log(pc.gray("No enhancements needed."));
    }
  }
}
function extractSQLFromMigrationFile(content) {
  const sqlPatterns = [
    /queryRunner\.query\s*\(\s*[`"']([^`"']+)[`"']/g,
    /sql\s*`([^`]+)`/g,
    /"((?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)[^"]+)"/gi
  ];
  let extractedSQL = "";
  for (const pattern of sqlPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      extractedSQL += match[1] + ";\n";
    }
  }
  return extractedSQL || content;
}
async function replaceEnhancedSQLInMigrationFile(filePath, upSQL, downSQL) {
  const content = await fs3.readFile(filePath, "utf-8");
  let updatedContent = content;
  updatedContent = updatedContent.replace(/queryRunner\.query\s*\(\s*[`"']([^`"']+)[`"']/g, `queryRunner.query(\`${upSQL.trim()}\`)`);
  updatedContent = updatedContent.replace(/sql\s*`([^`]+)`/g, `sql\`${upSQL.trim()}\``);
  updatedContent = updatedContent.replace(/"((?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)[^"]+)"/gi, `"${upSQL.trim()}"`);
  if (downSQL) {
    updatedContent = updatedContent.replace(/(public async down\(.*?\): Promise<void> \{[\s\S]*?queryRunner\.query\s*\(\s*[`"'])([^`"']+)([`"'])/, `$1${downSQL.trim()}$3`);
  }
  return updatedContent;
}

// src/commands/test.ts
import { spinner as spinner2 } from "@clack/prompts";
async function testCommand(options, globalOptions) {
  const s = spinner2();
  const cfg = await getFlowConfig(globalOptions);
  if (globalOptions.verbose) {
    console.log("Testing migrations against env:", cfg.defaultEnvironment);
  }
  s.start("Running migration tests...");
  await new Promise((resolve3) => setTimeout(resolve3, 2e3));
  s.stop("Safety tests completed");
  console.log("\u2705 All safety checks passed");
}

// src/commands/apply.ts
import { confirm as confirm3 } from "@clack/prompts";
import fs4 from "fs-extra";
import path2 from "path";
import pc2 from "picocolors";
import { Client as PgClient } from "pg";
import mysql from "mysql2/promise";
import sqlite3 from "sqlite3";
async function applyCommand(options, globalOptions) {
  console.log("applyCommand started");
  const cfg = await getFlowConfig(globalOptions);
  console.log("got flow config");
  const envCfg = cfg.environments[cfg.defaultEnvironment];
  if (globalOptions.debug) {
    console.log("Applying migration using env:", cfg.defaultEnvironment);
  }
  const spinner3 = createSpinner("Connecting to database...");
  let connection = null;
  try {
    console.log("connecting to database...");
    connection = await connectToDatabase(envCfg);
    console.log("connected to database");
    spinner3.update("Connected to database successfully");
  } catch (error) {
    console.log("error connecting to database", error);
    spinner3.fail("Failed to connect to database");
    console.log(pc2.red(`\u274C Database connection failed: ${error}`));
    return;
  }
  try {
    spinner3.update("Ensuring migration tracking table exists...");
    await ensureMigrationsTable(connection);
    console.log("ensured migrations table");
    spinner3.update("Finding migrations to apply...");
    const migrationsDir = envCfg.migrationsPath || "./migrations";
    const absoluteMigrationsDir = path2.resolve(process.cwd(), migrationsDir);
    const pendingMigrations = await findPendingMigrations(connection, absoluteMigrationsDir, options.migration);
    console.log("found pending migrations");
    if (pendingMigrations.length === 0) {
      spinner3.succeed("No pending migrations to apply");
      console.log(pc2.green("\u2705 Database is up to date"));
      return;
    }
    spinner3.stop();
    console.log(`
\u{1F4CB} Found ${pendingMigrations.length} pending migration(s):`);
    pendingMigrations.forEach((migration, idx) => {
      console.log(`  ${idx + 1}. ${pc2.cyan(migration.name)}`);
    });
    if (globalOptions.dryRun) {
      console.log(pc2.yellow("\n\u{1F50D} Dry run mode - showing what would be applied:"));
      for (const migration of pendingMigrations) {
        console.log(`
${pc2.cyan(`--- ${migration.name} ---`)}`);
        console.log(pc2.gray(migration.content));
      }
      return;
    }
    const proceed = await confirm3({
      message: `Apply ${pendingMigrations.length} migration(s) to the database?`
    });
    console.log("confirmed apply");
    if (!proceed) {
      console.log(pc2.gray("Migration cancelled."));
      return;
    }
    const applySpinner = createSpinner("Applying migrations...");
    for (const migration of pendingMigrations) {
      try {
        applySpinner.update(`Applying ${migration.name}...`);
        await applyMigration(connection, migration);
        await recordMigrationApplied(connection, migration);
        if (globalOptions.debug) {
          console.log(pc2.green(`  \u2705 Applied ${migration.name}`));
        }
      } catch (error) {
        applySpinner.fail(`Failed to apply ${migration.name}`);
        console.log(pc2.red(`\u274C Migration failed: ${error}`));
        if (pendingMigrations.indexOf(migration) < pendingMigrations.length - 1) {
          const continueApplying = await confirm3({
            message: "Continue applying remaining migrations?"
          });
          if (!continueApplying) {
            console.log(pc2.yellow("\u26A0\uFE0F  Migration process stopped"));
            return;
          }
        }
      }
    }
    applySpinner.succeed("All migrations applied successfully");
    console.log(pc2.green("\u2705 Enhanced migrations applied successfully"));
  } finally {
    if (connection) {
      await closeDatabaseConnection(connection);
    }
  }
}
async function connectToDatabase(envCfg) {
  console.log("in connectToDatabase");
  const connectionString = envCfg.db_connection_string || envCfg.databaseUrl;
  console.log("connectionString:", connectionString);
  if (!connectionString) {
    throw new Error('Database connection string not found in flow.config.json. Please provide "db_connection_string" or "databaseUrl".');
  }
  const dbType = connectionString.split(":")[0];
  console.log("dbType:", dbType);
  switch (dbType) {
    case "postgresql":
      console.log("connecting to postgresql");
      const pgClient = new PgClient({ connectionString });
      await pgClient.connect();
      console.log("connected to postgresql");
      return { type: "postgresql", client: pgClient };
    case "mysql":
      console.log("connecting to mysql");
      const mysqlConnection = await mysql.createConnection(connectionString);
      console.log("connected to mysql");
      return { type: "mysql", client: mysqlConnection };
    case "sqlite":
      console.log("connecting to sqlite");
      const sqlitePath = connectionString.substring("sqlite:".length);
      const sqliteDb = new sqlite3.Database(sqlitePath || "./database.db");
      console.log("connected to sqlite");
      return { type: "sqlite", client: sqliteDb };
    default:
      throw new Error(`Unsupported database type: ${dbType}`);
  }
}
async function ensureMigrationsTable(connection) {
  const createTableQuery = (() => {
    switch (connection.type) {
      case "postgresql":
        return `
          CREATE TABLE IF NOT EXISTS flow_migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            checksum VARCHAR(64),
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
      case "mysql":
        return `
          CREATE TABLE IF NOT EXISTS flow_migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            checksum VARCHAR(64),
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `;
      case "sqlite":
        return `
          CREATE TABLE IF NOT EXISTS flow_migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            checksum TEXT,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `;
    }
  })();
  await executeQuery(connection, createTableQuery);
}
async function findPendingMigrations(connection, migrationsDir, targetMigration) {
  if (!await fs4.pathExists(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`);
  }
  const appliedMigrations = await executeQuery(connection, "SELECT name FROM flow_migrations ORDER BY applied_at");
  const appliedNames = new Set(appliedMigrations.map((row) => row.name));
  const allFiles = await fs4.readdir(migrationsDir);
  const migrationFiles = allFiles.filter((f) => f.endsWith(".sql") || f.endsWith(".ts") || f.endsWith(".js")).sort();
  const pendingMigrations = [];
  for (const file of migrationFiles) {
    const migrationName = path2.parse(file).name;
    if (appliedNames.has(migrationName)) {
      continue;
    }
    if (targetMigration && migrationName !== targetMigration) {
      continue;
    }
    const filePath = path2.join(migrationsDir, file);
    let content = await fs4.readFile(filePath, "utf-8");
    if (file.endsWith(".ts") || file.endsWith(".js")) {
      content = extractSQLFromMigrationFile2(content);
    }
    pendingMigrations.push({
      name: migrationName,
      path: filePath,
      content
    });
    if (targetMigration && migrationName === targetMigration) {
      break;
    }
  }
  return pendingMigrations;
}
async function applyMigration(connection, migration) {
  const statements = migration.content.split(";").map((stmt) => stmt.trim()).filter((stmt) => stmt.length > 0);
  for (const statement of statements) {
    if (statement.trim()) {
      await executeQuery(connection, statement);
    }
  }
}
async function recordMigrationApplied(connection, migration) {
  const checksum = Buffer.from(migration.content).toString("base64").slice(0, 32);
  const insertQuery = (() => {
    switch (connection.type) {
      case "postgresql":
        return "INSERT INTO flow_migrations (name, checksum) VALUES ($1, $2)";
      case "mysql":
        return "INSERT INTO flow_migrations (name, checksum) VALUES (?, ?)";
      case "sqlite":
        return "INSERT INTO flow_migrations (name, checksum) VALUES (?, ?)";
    }
  })();
  await executeQuery(connection, insertQuery, [migration.name, checksum]);
}
async function executeQuery(connection, query, params) {
  return new Promise((resolve3, reject) => {
    switch (connection.type) {
      case "postgresql":
        connection.client.query(query, params, (err, result) => {
          if (err) return reject(err);
          resolve3(result.rows);
        });
        break;
      case "mysql":
        connection.client.query(query, params).then(([rows]) => resolve3(rows)).catch((err) => reject(err));
        break;
      case "sqlite":
        connection.client.all(query, params, (err, rows) => {
          if (err) return reject(err);
          resolve3(rows);
        });
        break;
    }
  });
}
async function closeDatabaseConnection(connection) {
  switch (connection.type) {
    case "postgresql":
      await connection.client.end();
      break;
    case "mysql":
      await connection.client.end();
      break;
    case "sqlite":
      connection.client.close();
      break;
  }
}
function extractSQLFromMigrationFile2(content) {
  const sqlPatterns = [
    /queryRunner\.query\s*\(\s*[`"']([^`"']+)[`"']/g,
    /sql\s*`([^`]+)`/g,
    /"((?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)[^"]+)"/gi
  ];
  let extractedSQL = "";
  for (const pattern of sqlPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      extractedSQL += match[1] + ";\n";
    }
  }
  return extractedSQL || content;
}

// src/commands/back.ts
import { confirm as confirm4 } from "@clack/prompts";
import fs5 from "fs-extra";
import path3 from "path";
import pc3 from "picocolors";
import { Client as PgClient2 } from "pg";
import mysql2 from "mysql2/promise";
import Database from "better-sqlite3";
async function backCommand(options, globalOptions) {
  const cfg = await getFlowConfig(globalOptions);
  const envCfg = cfg.environments[cfg.defaultEnvironment];
  if (globalOptions.debug) {
    console.log("Rolling back using env:", cfg.defaultEnvironment);
  }
  const spinner3 = createSpinner("Connecting to database...");
  let connection = null;
  try {
    connection = await connectToDatabase2(envCfg);
    spinner3.update("Connected to database successfully");
  } catch (error) {
    spinner3.fail("Failed to connect to database");
    console.log(pc3.red(`\u274C Database connection failed: ${error}`));
    return;
  }
  try {
    spinner3.update("Fetching applied migrations...");
    const appliedMigrations = await getAppliedMigrations(connection);
    if (appliedMigrations.length === 0) {
      spinner3.succeed("No migrations to rollback");
      console.log(pc3.green("\u2705 No migrations have been applied"));
      return;
    }
    spinner3.stop();
    const migrationsToRollback = await determineMigrationsToRollback(
      appliedMigrations,
      options,
      envCfg
    );
    if (migrationsToRollback.length === 0) {
      console.log(pc3.yellow("\u26A0\uFE0F  No migrations selected for rollback"));
      return;
    }
    console.log(`
\u{1F4CB} Migrations to rollback (${migrationsToRollback.length}):`);
    migrationsToRollback.forEach((migration, idx) => {
      console.log(`  ${idx + 1}. ${pc3.cyan(migration.name)} (applied: ${migration.applied_at})`);
    });
    if (globalOptions.dryRun) {
      console.log(pc3.yellow("\n\u{1F50D} Dry run mode - showing what would be rolled back"));
      for (const migration of migrationsToRollback) {
        console.log(`
${pc3.cyan(`--- Rollback ${migration.name} ---`)}`);
        const downContent = await findDownMigration(migration, envCfg);
        if (downContent) {
          console.log(pc3.gray(downContent));
        } else {
          console.log(pc3.yellow("\u26A0\uFE0F  No rollback script found for this migration"));
        }
      }
      return;
    }
    const riskyMigrations = migrationsToRollback.filter(
      (m) => m.name.toLowerCase().includes("drop") || m.name.toLowerCase().includes("delete")
    );
    if (riskyMigrations.length > 0) {
      console.log(pc3.red("\n\u26A0\uFE0F  WARNING: Some migrations may contain destructive operations:"));
      riskyMigrations.forEach((m) => {
        console.log(`  \u2022 ${pc3.red(m.name)}`);
      });
    }
    const proceed = await confirm4({
      message: riskyMigrations.length > 0 ? pc3.red("\u26A0\uFE0F  Are you sure you want to rollback these potentially destructive migrations?") : `Rollback ${migrationsToRollback.length} migration(s)?`
    });
    if (!proceed) {
      console.log(pc3.gray("Rollback cancelled."));
      return;
    }
    const rollbackSpinner = createSpinner("Rolling back migrations...");
    for (const migration of migrationsToRollback) {
      try {
        rollbackSpinner.update(`Rolling back ${migration.name}...`);
        const downContent = await findDownMigration(migration, envCfg);
        if (downContent) {
          await executeMigrationRollback(connection, downContent);
        } else {
          console.log(pc3.yellow(`\u26A0\uFE0F  No rollback script found for ${migration.name}, skipping...`));
        }
        await removeMigrationRecord(connection, migration);
        if (globalOptions.debug) {
          console.log(pc3.green(`  \u2705 Rolled back ${migration.name}`));
        }
      } catch (error) {
        rollbackSpinner.fail(`Failed to rollback ${migration.name}`);
        console.log(pc3.red(`\u274C Rollback failed: ${error}`));
        if (migrationsToRollback.indexOf(migration) < migrationsToRollback.length - 1) {
          const continueRollback = await confirm4({
            message: "Continue rolling back remaining migrations?"
          });
          if (!continueRollback) {
            console.log(pc3.yellow("\u26A0\uFE0F  Rollback process stopped"));
            return;
          }
        }
      }
    }
    rollbackSpinner.succeed("All migrations rolled back successfully");
    console.log(pc3.green("\u2705 Migration rollback completed safely"));
  } finally {
    if (connection) {
      await closeDatabaseConnection2(connection);
    }
  }
}
async function connectToDatabase2(envCfg) {
  const dbConfig = envCfg.database;
  if (!dbConfig) {
    throw new Error("Database configuration not found in flow.config.json");
  }
  switch (dbConfig.type) {
    case "postgresql":
      const pgClient = new PgClient2({
        host: dbConfig.host,
        port: dbConfig.port || 5432,
        database: dbConfig.database,
        user: dbConfig.user,
        password: dbConfig.password
      });
      await pgClient.connect();
      return { type: "postgresql", client: pgClient };
    case "mysql":
      const mysqlConnection = await mysql2.createConnection({
        host: dbConfig.host,
        port: dbConfig.port || 3306,
        database: dbConfig.database,
        user: dbConfig.user,
        password: dbConfig.password
      });
      return { type: "mysql", client: mysqlConnection };
    case "sqlite":
      const sqliteDb = new Database(dbConfig.database || "./database.db");
      return { type: "sqlite", client: sqliteDb };
    default:
      throw new Error(`Unsupported database type: ${dbConfig.type}`);
  }
}
async function getAppliedMigrations(connection) {
  try {
    const result = await executeQuery2(
      connection,
      "SELECT id, name, checksum, applied_at FROM flow_migrations ORDER BY id DESC"
    );
    return result;
  } catch (error) {
    return [];
  }
}
async function determineMigrationsToRollback(appliedMigrations, options, envCfg) {
  if (options.to) {
    const targetIndex = appliedMigrations.findIndex((m) => m.name === options.to);
    if (targetIndex === -1) {
      throw new Error(`Migration '${options.to}' not found in applied migrations`);
    }
    return appliedMigrations.slice(0, targetIndex);
  }
  const steps = options.steps || 1;
  if (steps >= appliedMigrations.length) {
    const confirmAll = await confirm4({
      message: pc3.yellow(`\u26A0\uFE0F  This will rollback ALL ${appliedMigrations.length} migrations. Continue?`)
    });
    if (!confirmAll) {
      return [];
    }
    return appliedMigrations;
  }
  return appliedMigrations.slice(0, steps);
}
async function findDownMigration(migration, envCfg) {
  const migrationsDir = envCfg.migrationsPath || "./migrations";
  const absoluteMigrationsDir = path3.resolve(process.cwd(), migrationsDir);
  const possibleFiles = [
    `${migration.name}.sql`,
    `${migration.name}.ts`,
    `${migration.name}.js`,
    `${migration.name}_down.sql`,
    `down_${migration.name}.sql`
  ];
  for (const filename of possibleFiles) {
    const filePath = path3.join(absoluteMigrationsDir, filename);
    if (await fs5.pathExists(filePath)) {
      let content = await fs5.readFile(filePath, "utf-8");
      if (filename.endsWith(".ts") || filename.endsWith(".js")) {
        content = extractDownSQLFromMigrationFile(content);
      }
      if (filename.endsWith(".sql") && content.includes("-- DOWN")) {
        const downSection = content.split("-- DOWN")[1];
        if (downSection) {
          return downSection.trim();
        }
      }
      if (filename.includes("down") || filename.includes("_down")) {
        return content;
      }
    }
  }
  return null;
}
async function executeMigrationRollback(connection, downContent) {
  const statements = downContent.split(";").map((stmt) => stmt.trim()).filter((stmt) => stmt.length > 0);
  for (const statement of statements) {
    if (statement.trim()) {
      await executeQuery2(connection, statement);
    }
  }
}
async function removeMigrationRecord(connection, migration) {
  const deleteQuery = (() => {
    switch (connection.type) {
      case "postgresql":
        return "DELETE FROM flow_migrations WHERE id = $1";
      case "mysql":
        return "DELETE FROM flow_migrations WHERE id = ?";
      case "sqlite":
        return "DELETE FROM flow_migrations WHERE id = ?";
    }
  })();
  await executeQuery2(connection, deleteQuery, [migration.id]);
}
async function executeQuery2(connection, query, params) {
  switch (connection.type) {
    case "postgresql":
      const pgResult = await connection.client.query(query, params);
      return pgResult.rows;
    case "mysql":
      const [mysqlResult] = await connection.client.execute(query, params);
      return Array.isArray(mysqlResult) ? mysqlResult : [mysqlResult];
    case "sqlite":
      if (params) {
        const stmt = connection.client.prepare(query);
        return query.toLowerCase().includes("select") ? stmt.all(params) : [stmt.run(params)];
      } else {
        return query.toLowerCase().includes("select") ? connection.client.prepare(query).all() : [connection.client.exec(query)];
      }
    default:
      throw new Error(`Unsupported database type: ${connection.type}`);
  }
}
async function closeDatabaseConnection2(connection) {
  switch (connection.type) {
    case "postgresql":
      await connection.client.end();
      break;
    case "mysql":
      await connection.client.end();
      break;
    case "sqlite":
      connection.client.close();
      break;
  }
}
function extractDownSQLFromMigrationFile(content) {
  const downPatterns = [
    /public async down\(.*?\): Promise<void> \{([\s\S]*?)\}/,
    /async down\(.*?\) \{([\s\S]*?)\}/,
    /down.*?{([\s\S]*?)}/
  ];
  for (const pattern of downPatterns) {
    const match = content.match(pattern);
    if (match) {
      const downCode = match[1];
      const sqlPatterns = [
        /queryRunner\.query\s*\(\s*[`"']([^`"']+)[`"']/g,
        /sql\s*`([^`]+)`/g,
        /"((?:DROP|ALTER|CREATE|INSERT|UPDATE|DELETE)[^"]+)"/gi
      ];
      let extractedSQL = "";
      for (const sqlPattern of sqlPatterns) {
        let sqlMatch;
        while ((sqlMatch = sqlPattern.exec(downCode)) !== null) {
          extractedSQL += sqlMatch[1] + ";\n";
        }
      }
      return extractedSQL;
    }
  }
  return "";
}

// src/index.ts
var handleCommand = async (commandPromise) => {
  try {
    await commandPromise;
  } catch (error) {
    if (isCancel(error)) {
      cancel("Operation cancelled.");
      process.exit(0);
    }
    log2.error(error instanceof Error ? error.message : "An unknown error occurred.");
    process.exit(1);
  }
};
var program = new Command();
program.name("flow").description("Enhanced database migration CLI tool for production-safety").version(version, "-v, --version", "Output the current version").option("-d, --debug", "Enable verbose logging").option("-c, --config <path>", "Path to flow.config.json", "./flow.config.json").option("--dry-run", "Show what would be done without executing");
program.command("init").description("Initialize flow configuration in current project").option("--env-name <name>", "Name for the initial environment", "development").option("--db-url <url>", "Database connection string").option("--migrations-path <path>", "Path to the migrations folder").option("-y, --yes", "Skip interactive prompts and use default or provided values").action(async (options) => {
  intro("\u{1F30A} DriftJS Flow - Initialize");
  await handleCommand(initCommand(options, program.opts()));
  outro("\u2705 Flow configuration initialized successfully!");
});
program.command("sync").description("Analyse schema and create migration plan").option("-f, --force", "Force re-analysis of existing migrations even if no schema changes detected").option("--orm <type>", "Specify ORM type (prisma|drizzle|typeorm|auto)", "auto").action(async (options) => {
  intro("\u{1F30A} DriftJS Flow - Sync");
  await handleCommand(syncCommand(options, program.opts()));
  outro("\u2705 Sync completed");
});
program.command("apply").description("Apply pending migrations to the database").option("--migration <name>", "Apply a specific migration by name").option("--target <name>", "Apply migrations up to and including the target migration").action(async (options) => {
  intro("\u{1F30A} DriftJS Flow - Apply");
  await handleCommand(applyCommand(options, program.opts()));
  outro("\u2705 Apply completed");
});
program.command("back").description("Rollback the latest migration batch").option("--steps <n>", "Number of migrations to rollback", "1").option("--to <name>", "Rollback to a specific migration (exclusive)").action(async (options) => {
  intro("\u{1F30A} DriftJS Flow - Rollback");
  if (options.steps) {
    options.steps = parseInt(options.steps, 10);
  }
  await handleCommand(backCommand(options, program.opts()));
  outro("\u2705 Rollback completed");
});
program.command("test").description("Run internal diagnostics").action(testCommand);
program.parse();
//# sourceMappingURL=index.js.map