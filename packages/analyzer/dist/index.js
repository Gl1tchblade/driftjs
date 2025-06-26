// src/orm-detectors/base-detector.ts
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

// src/orm-detectors/prisma-detector.ts
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

// src/orm-detectors/drizzle-detector.ts
import path from "path";
import fs from "fs-extra";
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
      const driver = this.extractConfigValue(configContent, "dialect") || "pg";
      const validDrivers = ["pg", "mysql2", "better-sqlite3", "sqlite"];
      const mappedDriver = validDrivers.includes(driver) ? driver : "pg";
      const outDir = this.extractConfigValue(configContent, "out") || "./drizzle";
      const migrationDirAbsolute = path.resolve(projectPath, outDir);
      const config = {
        type: "drizzle",
        configFile,
        driver: mappedDriver,
        schemaPath: this.extractConfigValue(configContent, "schema") || "./src/db/schema.ts",
        outDir,
        migrationDirectory: {
          absolute: migrationDirAbsolute,
          relative: outDir,
          exists: await fs.pathExists(migrationDirAbsolute)
        },
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

// src/orm-detectors/typeorm-detector.ts
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

// src/database/connection.ts
var PostgreSQLConnection = class {
  type = "postgresql";
  isConnected = false;
  client = null;
  config;
  constructor(config) {
    this.config = config;
  }
  async connect() {
    try {
      const { Client } = await import("pg");
      this.client = new Client({
        host: this.config.host,
        port: this.config.port || 5432,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: this.config.ssl,
        connectionTimeoutMillis: 1e4,
        // 10 seconds
        query_timeout: 3e4
        // 30 seconds
      });
      await this.client.connect();
      this.isConnected = true;
    } catch (error) {
      this.isConnected = false;
      throw new Error(`Failed to connect to PostgreSQL: ${error}`);
    }
  }
  async disconnect() {
    try {
      if (this.client) {
        await this.client.end();
        this.client = null;
      }
      this.isConnected = false;
    } catch (error) {
      console.warn(`Error disconnecting from PostgreSQL: ${error}`);
      this.isConnected = false;
    }
  }
  async query(sql, params) {
    if (!this.isConnected || !this.client) {
      throw new Error("Database not connected");
    }
    try {
      const result = await this.client.query(sql, params);
      return result.rows;
    } catch (error) {
      throw new Error(`Query failed: ${error}`);
    }
  }
  async transaction(callback) {
    if (!this.isConnected || !this.client) {
      throw new Error("Database not connected");
    }
    try {
      await this.client.query("BEGIN");
      const result = await callback(this);
      await this.client.query("COMMIT");
      return result;
    } catch (error) {
      await this.client.query("ROLLBACK");
      throw error;
    }
  }
};
var MySQLConnection = class {
  type = "mysql";
  isConnected = false;
  connection = null;
  config;
  constructor(config) {
    this.config = config;
  }
  async connect() {
    try {
      const mysql = await import("mysql2/promise");
      this.connection = await mysql.createConnection({
        host: this.config.host,
        port: this.config.port || 3306,
        database: this.config.database,
        user: this.config.username,
        password: this.config.password,
        ssl: typeof this.config.ssl === "boolean" ? void 0 : this.config.ssl
      });
      this.isConnected = true;
    } catch (error) {
      this.isConnected = false;
      throw new Error(`Failed to connect to MySQL: ${error}`);
    }
  }
  async disconnect() {
    try {
      if (this.connection) {
        await this.connection.end();
        this.connection = null;
      }
      this.isConnected = false;
    } catch (error) {
      console.warn(`Error disconnecting from MySQL: ${error}`);
      this.isConnected = false;
    }
  }
  async query(sql, params) {
    if (!this.isConnected || !this.connection) {
      throw new Error("Database not connected");
    }
    try {
      const [rows] = await this.connection.execute(sql, params);
      return Array.isArray(rows) ? rows : [];
    } catch (error) {
      throw new Error(`Query failed: ${error}`);
    }
  }
  async transaction(callback) {
    if (!this.isConnected || !this.connection) {
      throw new Error("Database not connected");
    }
    try {
      await this.connection.beginTransaction();
      const result = await callback(this);
      await this.connection.commit();
      return result;
    } catch (error) {
      await this.connection.rollback();
      throw error;
    }
  }
};
var SQLiteConnection = class {
  type = "sqlite";
  isConnected = false;
  db = null;
  config;
  constructor(config) {
    this.config = config;
  }
  async connect() {
    try {
      const Database = (await import("better-sqlite3")).default;
      const dbPath = this.config.database || "database.sqlite";
      this.db = new Database(dbPath, {
        timeout: 1e4
        // 10 seconds
      });
      this.isConnected = true;
    } catch (error) {
      this.isConnected = false;
      throw new Error(`Failed to connect to SQLite: ${error}`);
    }
  }
  async disconnect() {
    try {
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      this.isConnected = false;
    } catch (error) {
      console.warn(`Error disconnecting from SQLite: ${error}`);
      this.isConnected = false;
    }
  }
  async query(sql, params) {
    if (!this.isConnected || !this.db) {
      throw new Error("Database not connected");
    }
    try {
      const stmt = this.db.prepare(sql);
      const result = params ? stmt.all(params) : stmt.all();
      return Array.isArray(result) ? result : [];
    } catch (error) {
      throw new Error(`Query failed: ${error}`);
    }
  }
  async transaction(callback) {
    if (!this.isConnected || !this.db) {
      throw new Error("Database not connected");
    }
    const transaction = this.db.transaction(async () => {
      return await callback(this);
    });
    return transaction();
  }
};
async function createConnection(config) {
  switch (config.type) {
    case "postgresql":
      return new PostgreSQLConnection(config);
    case "mysql":
      return new MySQLConnection(config);
    case "sqlite":
      return new SQLiteConnection(config);
    default:
      throw new Error(`Unsupported database type: ${config.type}`);
  }
}
async function testConnection(config, timeoutMs = 1e4) {
  const startTime = Date.now();
  let connection = null;
  try {
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Connection timeout")), timeoutMs);
    });
    connection = await createConnection(config);
    await Promise.race([connection.connect(), timeoutPromise]);
    const testQuery = config.type === "postgresql" ? "SELECT 1 as test" : config.type === "mysql" ? "SELECT 1 as test" : "SELECT 1 as test";
    await connection.query(testQuery);
    const latency = Date.now() - startTime;
    return {
      success: true,
      latency
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  } finally {
    if (connection) {
      try {
        await connection.disconnect();
      } catch {
      }
    }
  }
}
var ConnectionPool = class {
  pools = /* @__PURE__ */ new Map();
  maxPoolSize = 5;
  minPoolSize = 1;
  constructor(options) {
    this.maxPoolSize = options?.maxPoolSize || 5;
    this.minPoolSize = options?.minPoolSize || 1;
  }
  getPoolKey(config) {
    return `${config.type}://${config.host}:${config.port}/${config.database}`;
  }
  async getConnection(config) {
    const key = this.getPoolKey(config);
    let pool = this.pools.get(key);
    if (!pool) {
      pool = [];
      this.pools.set(key, pool);
    }
    const connection = pool.pop();
    if (connection && connection.isConnected) {
      return connection;
    }
    const newConnection = await createConnection(config);
    await newConnection.connect();
    return newConnection;
  }
  async releaseConnection(config, connection) {
    const key = this.getPoolKey(config);
    const pool = this.pools.get(key) || [];
    if (pool.length < this.maxPoolSize && connection.isConnected) {
      pool.push(connection);
      this.pools.set(key, pool);
    } else {
      await connection.disconnect();
    }
  }
  async closeAll() {
    for (const pool of this.pools.values()) {
      await Promise.all(pool.map((conn) => conn.disconnect()));
    }
    this.pools.clear();
  }
};

// src/database/analysis.ts
var DatabaseAnalyzer = class {
  constructor(connection) {
    this.connection = connection;
  }
  /**
   * Perform comprehensive database analysis
   */
  async analyze() {
    const tables = await this.getAllTables();
    const tableMetadata = await Promise.all(
      tables.map((tableName) => this.analyzeTable(tableName))
    );
    const totalSize = tableMetadata.reduce((sum, table) => sum + table.sizeBytes, 0);
    const version = await this.getDatabaseVersion();
    const features = await this.getDatabaseFeatures();
    const performance = await this.getPerformanceMetrics();
    return {
      tables: tableMetadata,
      totalSize,
      version,
      features,
      performance
    };
  }
  /**
   * Analyze a specific table for metadata
   */
  async analyzeTable(tableName, schema) {
    const fullTableName = schema ? `${schema}.${tableName}` : tableName;
    const [columns, indexes, constraints, rowCount, sizeBytes, dependencies] = await Promise.all([
      this.getTableColumns(tableName, schema),
      this.getTableIndexes(tableName, schema),
      this.getTableConstraints(tableName, schema),
      this.getTableRowCount(tableName, schema),
      this.getTableSize(tableName, schema),
      this.getTableDependencies(tableName, schema)
    ]);
    return {
      name: tableName,
      schema,
      rowCount,
      sizeBytes,
      columns,
      indexes,
      constraints,
      dependencies
    };
  }
  /**
   * Get all table names in the database
   */
  async getAllTables() {
    switch (this.connection.type) {
      case "postgresql":
        return await this.getPostgreSQLTables();
      case "mysql":
        return await this.getMySQLTables();
      case "sqlite":
        return await this.getSQLiteTables();
      default:
        throw new Error(`Unsupported database type: ${this.connection.type}`);
    }
  }
  async getPostgreSQLTables() {
    const result = await this.connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    return result.map((row) => row.table_name);
  }
  async getMySQLTables() {
    const result = await this.connection.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);
    return result.map((row) => row.table_name || row.TABLE_NAME);
  }
  async getSQLiteTables() {
    const result = await this.connection.query(`
      SELECT name 
      FROM sqlite_master 
      WHERE type = 'table' 
      AND name NOT LIKE 'sqlite_%'
      ORDER BY name
    `);
    return result.map((row) => row.name);
  }
  /**
   * Get column metadata for a table
   */
  async getTableColumns(tableName, schema) {
    switch (this.connection.type) {
      case "postgresql":
        return await this.getPostgreSQLColumns(tableName, schema);
      case "mysql":
        return await this.getMySQLColumns(tableName, schema);
      case "sqlite":
        return await this.getSQLiteColumns(tableName);
      default:
        return [];
    }
  }
  async getPostgreSQLColumns(tableName, schema = "public") {
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
    `, [tableName, schema]);
    return result.map((row) => ({
      name: row.column_name,
      type: row.data_type,
      nullable: row.nullable,
      defaultValue: row.default_value,
      isPrimary: row.is_primary,
      isUnique: row.is_unique,
      references: row.referenced_table ? {
        table: row.referenced_table,
        column: row.referenced_column
      } : void 0
    }));
  }
  async getMySQLColumns(tableName, schema) {
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
    `, [tableName, schema]);
    return result.map((row) => ({
      name: row.column_name || row.COLUMN_NAME,
      type: row.data_type || row.DATA_TYPE,
      nullable: Boolean(row.nullable),
      defaultValue: row.default_value || row.COLUMN_DEFAULT,
      isPrimary: Boolean(row.is_primary),
      isUnique: Boolean(row.is_unique),
      references: void 0
      // TODO: Implement FK detection for MySQL
    }));
  }
  async getSQLiteColumns(tableName) {
    const result = await this.connection.query(`PRAGMA table_info(${tableName})`);
    return result.map((row) => ({
      name: row.name,
      type: row.type,
      nullable: !row.notnull,
      defaultValue: row.dflt_value,
      isPrimary: Boolean(row.pk),
      isUnique: false,
      // TODO: Implement unique detection for SQLite
      references: void 0
      // TODO: Implement FK detection for SQLite
    }));
  }
  /**
   * Get index metadata for a table
   */
  async getTableIndexes(tableName, schema) {
    switch (this.connection.type) {
      case "postgresql":
        return await this.getPostgreSQLIndexes(tableName, schema);
      case "mysql":
        return await this.getMySQLIndexes(tableName, schema);
      case "sqlite":
        return await this.getSQLiteIndexes(tableName);
      default:
        return [];
    }
  }
  async getPostgreSQLIndexes(tableName, schema = "public") {
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
    `, [tableName, schema]);
    return result.map((row) => ({
      name: row.name,
      columns: Array.isArray(row.columns) ? row.columns : [row.columns],
      unique: row.unique,
      type: row.type,
      sizeBytes: parseInt(row.size_bytes) || 0
    }));
  }
  async getMySQLIndexes(tableName, schema) {
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
    `, [tableName, schema]);
    return result.map((row) => ({
      name: row.name,
      columns: row.columns.split(","),
      unique: Boolean(row.unique),
      type: row.type,
      sizeBytes: void 0
      // Size info not easily available in MySQL
    }));
  }
  async getSQLiteIndexes(tableName) {
    const result = await this.connection.query(`
      SELECT name, sql 
      FROM sqlite_master 
      WHERE type = 'index' AND tbl_name = ?
    `, [tableName]);
    return result.map((row) => ({
      name: row.name,
      columns: [],
      // TODO: Parse from SQL
      unique: row.sql?.includes("UNIQUE") || false,
      type: "btree",
      sizeBytes: void 0
    }));
  }
  /**
   * Get constraint metadata for a table
   */
  async getTableConstraints(tableName, schema) {
    switch (this.connection.type) {
      case "postgresql":
        return await this.getPostgreSQLConstraints(tableName, schema);
      case "mysql":
        return await this.getMySQLConstraints(tableName, schema);
      case "sqlite":
        return await this.getSQLiteConstraints(tableName);
      default:
        return [];
    }
  }
  async getPostgreSQLConstraints(tableName, schema = "public") {
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
    `, [tableName, schema]);
    return result.map((row) => ({
      name: row.name,
      type: row.type,
      columns: Array.isArray(row.columns) ? row.columns.filter(Boolean) : [row.columns].filter(Boolean),
      referencedTable: row.referenced_table,
      referencedColumns: Array.isArray(row.referenced_columns) ? row.referenced_columns.filter(Boolean) : [row.referenced_columns].filter(Boolean),
      definition: row.definition
    }));
  }
  async getMySQLConstraints(tableName, schema) {
    return [];
  }
  async getSQLiteConstraints(tableName) {
    return [];
  }
  /**
   * Get table row count
   */
  async getTableRowCount(tableName, schema) {
    try {
      const fullTableName = schema ? `${schema}.${tableName}` : tableName;
      const result = await this.connection.query(`SELECT COUNT(*) as count FROM ${fullTableName}`);
      return parseInt(result[0]?.count || result[0]?.COUNT || "0");
    } catch {
      return 0;
    }
  }
  /**
   * Get table size in bytes
   */
  async getTableSize(tableName, schema) {
    try {
      switch (this.connection.type) {
        case "postgresql":
          const pgResult = await this.connection.query(`
            SELECT pg_total_relation_size($1) as size
          `, [tableName]);
          return parseInt(pgResult[0]?.size || "0");
        case "mysql":
          const mysqlResult = await this.connection.query(`
            SELECT (data_length + index_length) as size
            FROM information_schema.tables
            WHERE table_name = ? AND table_schema = COALESCE(?, DATABASE())
          `, [tableName, schema]);
          return parseInt(mysqlResult[0]?.size || "0");
        case "sqlite":
          return 0;
        default:
          return 0;
      }
    } catch {
      return 0;
    }
  }
  /**
   * Get table dependencies
   */
  async getTableDependencies(tableName, schema) {
    return [];
  }
  /**
   * Get database version
   */
  async getDatabaseVersion() {
    try {
      switch (this.connection.type) {
        case "postgresql":
          const pgResult = await this.connection.query("SELECT version()");
          return pgResult[0]?.version || "Unknown";
        case "mysql":
          const mysqlResult = await this.connection.query("SELECT VERSION() as version");
          return mysqlResult[0]?.version || "Unknown";
        case "sqlite":
          const sqliteResult = await this.connection.query("SELECT sqlite_version()");
          return sqliteResult[0]?.["sqlite_version()"] || "Unknown";
        default:
          return "Unknown";
      }
    } catch {
      return "Unknown";
    }
  }
  /**
   * Get database features
   */
  async getDatabaseFeatures() {
    const features = [];
    switch (this.connection.type) {
      case "postgresql":
        features.push("ACID", "Transactions", "Foreign Keys", "Indexes", "Views", "Triggers", "Stored Procedures");
        break;
      case "mysql":
        features.push("ACID", "Transactions", "Foreign Keys", "Indexes", "Views", "Triggers", "Stored Procedures");
        break;
      case "sqlite":
        features.push("ACID", "Transactions", "Foreign Keys", "Indexes", "Views", "Triggers");
        break;
    }
    return features;
  }
  /**
   * Get performance metrics
   */
  async getPerformanceMetrics() {
    return {
      avgQueryTime: 0,
      connectionCount: 1,
      cacheHitRatio: void 0
    };
  }
  /**
   * Estimate migration performance impact
   */
  async estimatePerformanceImpact(sql, tableName) {
    const recommendations = [];
    let riskLevel = "LOW";
    let estimatedTime = 0;
    let lockDuration = 0;
    let affectedRows = 0;
    const sqlLower = sql.toLowerCase();
    if (tableName) {
      const tableMetadata = await this.analyzeTable(tableName);
      affectedRows = tableMetadata.rowCount;
      if (sqlLower.includes("alter table")) {
        estimatedTime = Math.max(1, Math.floor(affectedRows / 1e3));
        lockDuration = estimatedTime;
        if (affectedRows > 1e5) {
          riskLevel = "HIGH";
          recommendations.push("Consider maintenance window for large table migration");
          recommendations.push("Test migration on staging environment first");
        } else if (affectedRows > 1e4) {
          riskLevel = "MEDIUM";
          recommendations.push("Monitor migration progress");
        }
        if (sqlLower.includes("add column") && !sqlLower.includes("not null")) {
          recommendations.push("Adding nullable column is generally safe");
        } else if (sqlLower.includes("add column") && sqlLower.includes("not null")) {
          riskLevel = "HIGH";
          recommendations.push("Adding NOT NULL column requires table rewrite");
          recommendations.push("Consider adding column as nullable first, then adding constraint");
        }
      }
      if (sqlLower.includes("drop column")) {
        riskLevel = "HIGH";
        recommendations.push("Dropping columns is destructive - ensure data is not needed");
        recommendations.push("Consider creating backup before migration");
      }
      if (sqlLower.includes("create index")) {
        estimatedTime = Math.max(1, Math.floor(affectedRows / 5e3));
        lockDuration = 0;
        if (this.connection.type === "postgresql") {
          recommendations.push("Use CREATE INDEX CONCURRENTLY to avoid blocking");
        }
      }
    }
    return {
      estimatedTime,
      lockDuration,
      affectedRows,
      riskLevel,
      recommendations
    };
  }
};

// src/database/adapters.ts
var PostgreSQLAdapter = class {
  type = "postgresql";
  supportsFeature(feature) {
    return false;
  }
  getOptimalIndexType(columns) {
    return "btree";
  }
  estimateOperationTime(operation, tableSize) {
    return 0;
  }
};
export {
  BaseORMDetector,
  ConnectionPool,
  DatabaseAnalyzer,
  DrizzleDetector,
  MySQLConnection,
  PostgreSQLAdapter,
  PostgreSQLConnection,
  PrismaDetector,
  SQLiteConnection,
  TypeORMDetector,
  createConnection,
  testConnection
};
//# sourceMappingURL=index.js.map