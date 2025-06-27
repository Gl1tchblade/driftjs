import * as fs from 'fs/promises';
import * as path from 'path';
import { SqlParser, type ParsedSqlOperation } from './sql-parser.js';

/**
 * Migration file types supported
 */
export enum MigrationType {
  PRISMA = 'PRISMA',
  DRIZZLE = 'DRIZZLE',
  TYPEORM = 'TYPEORM',
  PLAIN_SQL = 'PLAIN_SQL'
}

/**
 * Parsed migration file result
 */
export interface ParsedMigration {
  filePath: string;
  type: MigrationType;
  name: string;
  timestamp?: Date;
  upOperations: ParsedSqlOperation[];
  downOperations: ParsedSqlOperation[];
  metadata: {
    ormVersion?: string;
    database: 'postgresql' | 'mysql' | 'sqlite';
    hasUpMigration: boolean;
    hasDownMigration: boolean;
    totalOperations: number;
    destructiveOperations: number;
    blockingOperations: number;
  };
  errors: string[];
  warnings: string[];
}

/**
 * Migration parsing result for multiple files
 */
export interface MigrationParseResult {
  migrations: ParsedMigration[];
  totalMigrations: number;
  errors: string[];
  warnings: string[];
  summary: {
    byType: Record<MigrationType, number>;
    totalOperations: number;
    destructiveOperations: number;
    blockingOperations: number;
  };
}

/**
 * Migration Parser for different ORM formats
 */
export class MigrationParser {
  private sqlParser: SqlParser;

  constructor() {
    this.sqlParser = new SqlParser();
  }

  /**
   * Parse a single migration file
   */
  public async parseMigrationFile(filePath: string, type?: MigrationType): Promise<ParsedMigration> {
    const content = await fs.readFile(filePath, 'utf-8');
    const detectedType = type || this.detectMigrationType(filePath, content);
    
    switch (detectedType) {
      case MigrationType.PRISMA:
        return this.parsePrismaMigration(filePath, content);
      case MigrationType.DRIZZLE:
        return this.parseDrizzleMigration(filePath, content);
      case MigrationType.TYPEORM:
        return this.parseTypeOrmMigration(filePath, content);
      case MigrationType.PLAIN_SQL:
        return this.parsePlainSqlMigration(filePath, content);
      default:
        throw new Error(`Unsupported migration type: ${detectedType}`);
    }
  }

  /**
   * Parse multiple migration files from a directory
   */
  public async parseMigrationDirectory(dirPath: string): Promise<MigrationParseResult> {
    const files = await this.findMigrationFiles(dirPath);
    const migrations: ParsedMigration[] = [];
    const errors: string[] = [];
    const warnings: string[] = [];

    for (const file of files) {
      try {
        const migration = await this.parseMigrationFile(file);
        migrations.push(migration);
        errors.push(...migration.errors);
        warnings.push(...migration.warnings);
      } catch (error) {
        errors.push(`Failed to parse ${file}: ${error}`);
      }
    }

    const summary = this.calculateSummary(migrations);

    return {
      migrations,
      totalMigrations: migrations.length,
      errors,
      warnings,
      summary
    };
  }

  /**
   * Detect migration type from file path and content
   */
  private detectMigrationType(filePath: string, content: string): MigrationType {
    const fileName = path.basename(filePath);
    const extension = path.extname(filePath);

    // Check for Prisma migration (usually in prisma/migrations/)
    if (filePath.includes('prisma/migrations') || fileName === 'migration.sql') {
      return MigrationType.PRISMA;
    }

    // Check for Drizzle migration
    if (extension === '.ts' && (
      content.includes('import { sql }') ||
      content.includes('drizzle-orm') ||
      fileName.includes('drizzle')
    )) {
      return MigrationType.DRIZZLE;
    }

    // Check for TypeORM migration
    if (extension === '.ts' && (
      content.includes('import { MigrationInterface') ||
      content.includes('QueryRunner') ||
      fileName.match(/^\d{13}-.*\.ts$/)
    )) {
      return MigrationType.TYPEORM;
    }

    // Default to plain SQL
    if (extension === '.sql') {
      return MigrationType.PLAIN_SQL;
    }

    // If TypeScript but couldn't determine, try to guess from content
    if (extension === '.ts') {
      return MigrationType.TYPEORM; // Default for TS files
    }

    return MigrationType.PLAIN_SQL;
  }

  /**
   * Parse Prisma migration file
   */
  private async parsePrismaMigration(filePath: string, content: string): Promise<ParsedMigration> {
    const fileName = path.basename(filePath);
    const timestamp = this.extractTimestampFromPrismaFile(filePath);
    
    // Prisma migrations are usually just SQL files
    const sqlStatements = this.extractSqlStatements(content);
    const database = this.detectDatabaseFromSql(content);
    
    const parseResult = this.sqlParser.parseMultipleSql(sqlStatements, database);

    return {
      filePath,
      type: MigrationType.PRISMA,
      name: fileName,
      timestamp,
      upOperations: parseResult.operations,
      downOperations: [], // Prisma doesn't typically have down migrations
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
  private async parseDrizzleMigration(filePath: string, content: string): Promise<ParsedMigration> {
    const fileName = path.basename(filePath, '.ts');
    const timestamp = this.extractTimestampFromDrizzleFile(fileName);

    // Extract SQL from Drizzle TypeScript file
    const sqlStatements = this.extractSqlFromDrizzleTs(content);
    const database = this.detectDatabaseFromContent(content);
    
    const parseResult = this.sqlParser.parseMultipleSql(sqlStatements, database);

    return {
      filePath,
      type: MigrationType.DRIZZLE,
      name: fileName,
      timestamp,
      upOperations: parseResult.operations,
      downOperations: [], // Drizzle typically doesn't have down migrations in the same file
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
  private async parseTypeOrmMigration(filePath: string, content: string): Promise<ParsedMigration> {
    const fileName = path.basename(filePath, '.ts');
    const timestamp = this.extractTimestampFromTypeOrmFile(fileName);

    // Extract SQL from up() and down() methods
    const upSql = this.extractSqlFromTypeOrmMethod(content, 'up');
    const downSql = this.extractSqlFromTypeOrmMethod(content, 'down');
    const database = this.detectDatabaseFromContent(content);

    const upParseResult = this.sqlParser.parseMultipleSql(upSql, database);
    const downParseResult = this.sqlParser.parseMultipleSql(downSql, database);

    return {
      filePath,
      type: MigrationType.TYPEORM,
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
  private async parsePlainSqlMigration(filePath: string, content: string): Promise<ParsedMigration> {
    const fileName = path.basename(filePath);
    const timestamp = this.extractTimestampFromSqlFile(fileName);

    // Split content by common delimiters for up/down migrations
    const { upSql, downSql } = this.splitUpDownSql(content);
    const database = this.detectDatabaseFromSql(content);

    const upParseResult = this.sqlParser.parseMultipleSql(upSql, database);
    const downParseResult = this.sqlParser.parseMultipleSql(downSql, database);

    return {
      filePath,
      type: MigrationType.PLAIN_SQL,
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
  private async findMigrationFiles(dirPath: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory()) {
          // Recursively search subdirectories
          const subFiles = await this.findMigrationFiles(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile() && this.isMigrationFile(entry.name)) {
          files.push(fullPath);
        }
      }
    } catch (error) {
      // Directory might not exist, that's okay
    }

    return files.sort(); // Sort for consistent ordering
  }

  /**
   * Check if a file is a migration file
   */
  private isMigrationFile(fileName: string): boolean {
    const ext = path.extname(fileName);
    
    // Common migration file patterns
    return (ext === '.sql' || ext === '.ts') && (
      fileName.includes('migration') ||
      /^\d{4}-\d{2}-\d{2}/.test(fileName) || // Date format
      /^\d{10,}/.test(fileName) || // Timestamp format
      fileName.includes('schema') ||
      fileName === 'migration.sql'
    );
  }

  /**
   * Extract SQL statements from content
   */
  private extractSqlStatements(content: string): string[] {
    return content
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'));
  }

  /**
   * Extract SQL from Drizzle TypeScript content
   */
  private extractSqlFromDrizzleTs(content: string): string[] {
    const statements: string[] = [];
    
    // Look for sql`...` template literals
    const sqlRegex = /sql`([^`]*)`/g;
    let match;
    
    while ((match = sqlRegex.exec(content)) !== null) {
      const sqlContent = match[1].trim();
      if (sqlContent) {
        statements.push(sqlContent);
      }
    }

    // Look for direct SQL strings
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
  private extractSqlFromTypeOrmMethod(content: string, method: 'up' | 'down'): string[] {
    const statements: string[] = [];
    
    // Find the method definition
    const methodRegex = new RegExp(`public\\s+async\\s+${method}\\s*\\([^)]*\\)\\s*:\\s*Promise<void>\\s*{([^}]*)}`, 's');
    const match = methodRegex.exec(content);
    
    if (!match) return statements;
    
    const methodBody = match[1];
    
    // Look for queryRunner.query calls
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
  private splitUpDownSql(content: string): { upSql: string[]; downSql: string[] } {
    // Look for common delimiters
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

    // If no delimiter found, treat entire content as up SQL
    return {
      upSql: this.extractSqlStatements(content),
      downSql: []
    };
  }

  /**
   * Detect database type from SQL content
   */
  private detectDatabaseFromSql(content: string): 'postgresql' | 'mysql' | 'sqlite' {
    const upperContent = content.toUpperCase();
    
    if (upperContent.includes('SERIAL') || upperContent.includes('BIGSERIAL') || upperContent.includes('UUID')) {
      return 'postgresql';
    }
    if (upperContent.includes('AUTO_INCREMENT') || upperContent.includes('TINYINT') || upperContent.includes('MEDIUMINT')) {
      return 'mysql';
    }
    if (upperContent.includes('AUTOINCREMENT') || upperContent.includes('INTEGER PRIMARY KEY')) {
      return 'sqlite';
    }
    
    // Default to PostgreSQL
    return 'postgresql';
  }

  /**
   * Detect database type from TypeScript content
   */
  private detectDatabaseFromContent(content: string): 'postgresql' | 'mysql' | 'sqlite' {
    if (content.includes('postgres') || content.includes('pg')) {
      return 'postgresql';
    }
    if (content.includes('mysql') || content.includes('mariadb')) {
      return 'mysql';
    }
    if (content.includes('sqlite')) {
      return 'sqlite';
    }
    
    // Default to PostgreSQL
    return 'postgresql';
  }

  /**
   * Extract timestamp from Prisma migration file path
   */
  private extractTimestampFromPrismaFile(filePath: string): Date | undefined {
    // Prisma migrations are in format: 20231225120000_migration_name
    const match = path.dirname(filePath).match(/(\d{14})_/);
    if (match) {
      const timestamp = match[1];
      return new Date(
        parseInt(timestamp.substring(0, 4)), // year
        parseInt(timestamp.substring(4, 6)) - 1, // month (0-based)
        parseInt(timestamp.substring(6, 8)), // day
        parseInt(timestamp.substring(8, 10)), // hour
        parseInt(timestamp.substring(10, 12)), // minute
        parseInt(timestamp.substring(12, 14)) // second
      );
    }
    return undefined;
  }

  /**
   * Extract timestamp from Drizzle migration file name
   */
  private extractTimestampFromDrizzleFile(fileName: string): Date | undefined {
    // Drizzle migrations often have timestamps
    const match = fileName.match(/(\d{10,13})/);
    if (match) {
      const timestamp = parseInt(match[1]);
      // If it's a 10-digit timestamp, it's in seconds; if 13-digit, it's in milliseconds
      return new Date(timestamp < 10000000000 ? timestamp * 1000 : timestamp);
    }
    return undefined;
  }

  /**
   * Extract timestamp from TypeORM migration file name
   */
  private extractTimestampFromTypeOrmFile(fileName: string): Date | undefined {
    // TypeORM migrations are in format: 1640995200000-MigrationName
    const match = fileName.match(/^(\d{13})-/);
    if (match) {
      return new Date(parseInt(match[1]));
    }
    return undefined;
  }

  /**
   * Extract timestamp from SQL file name
   */
  private extractTimestampFromSqlFile(fileName: string): Date | undefined {
    // Try various timestamp formats
    const patterns = [
      /(\d{4}-\d{2}-\d{2}[-_]\d{2}-\d{2}-\d{2})/, // YYYY-MM-DD-HH-MM-SS
      /(\d{8}[-_]\d{6})/, // YYYYMMDD-HHMMSS
      /(\d{10,13})/ // Unix timestamp
    ];

    for (const pattern of patterns) {
      const match = fileName.match(pattern);
      if (match) {
        const timestamp = match[1];
        if (timestamp.match(/^\d{10,13}$/)) {
          const ts = parseInt(timestamp);
          return new Date(ts < 10000000000 ? ts * 1000 : ts);
        } else {
          // Try to parse as date string
          try {
            return new Date(timestamp.replace(/[-_]/g, match => match === '_' ? ' ' : '-'));
          } catch {
            continue;
          }
        }
      }
    }
    return undefined;
  }

  /**
   * Calculate summary statistics
   */
  private calculateSummary(migrations: ParsedMigration[]): MigrationParseResult['summary'] {
    const byType: Record<MigrationType, number> = {
      [MigrationType.PRISMA]: 0,
      [MigrationType.DRIZZLE]: 0,
      [MigrationType.TYPEORM]: 0,
      [MigrationType.PLAIN_SQL]: 0
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
} 