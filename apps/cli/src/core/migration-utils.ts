/**
 * Migration utilities for parsing and handling migration files
 */

import fs from 'fs-extra';
import path from 'node:path';
import crypto from 'node:crypto';
import pkg from 'node-sql-parser';
const { Parser } = pkg;
import { MigrationFile, SqlOperation } from './types.js';

/**
 * Find the latest migration file in a directory
 * @param migrationsDir Path to the migrations directory
 * @returns Path to the latest migration file, or null if none found
 */
export async function findLatestMigration(migrationsDir: string): Promise<string | null> {
  try {
    const files = await fs.readdir(migrationsDir);
    const migrationFiles = files
      .filter(file => file.endsWith('.sql'))
      .sort((a, b) => {
        // Sort by timestamp prefix (assuming format like 0000_name.sql or timestamp_name.sql)
        const aPrefix = a.split('_')[0];
        const bPrefix = b.split('_')[0];
        return bPrefix.localeCompare(aPrefix); // Descending order (latest first)
      });
    
    return migrationFiles.length > 0 ? migrationFiles[0] : null;
  } catch (error) {
    return null;
  }
}

/**
 * Parse a migration file into a structured MigrationFile object
 * @param filePath Path to the migration file
 * @returns Parsed MigrationFile object
 */
export async function parseMigrationFile(filePath: string): Promise<MigrationFile> {
  const content = await fs.readFile(filePath, 'utf-8');
  const fileName = path.basename(filePath);
  
  // Calculate checksum
  const checksum = crypto.createHash('sha256').update(content).digest('hex');
  
  // Extract timestamp from filename (basic implementation)
  const timestamp = extractTimestampFromFilename(fileName);
  
  // Parse SQL operations
  const operations = await parseSqlOperations(content);
  
  // For now, we'll assume the entire content is "up" migration
  // In a real implementation, you might split up/down migrations
  const upContent = content;
  const downContent = ''; // Would be extracted if present
  
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

/**
 * Extract timestamp from migration filename
 * @param filename Migration filename
 * @returns Date object representing the migration timestamp
 */
function extractTimestampFromFilename(filename: string): Date {
  // Try to extract timestamp from various formats
  const timestampMatch = filename.match(/^(\d{4})_/);
  if (timestampMatch) {
    // Simple numeric prefix - convert to date (this is basic, real implementation would be more sophisticated)
    const year = new Date().getFullYear();
    const month = new Date().getMonth();
    const day = new Date().getDate();
    return new Date(year, month, day, 0, 0, 0, parseInt(timestampMatch[1]));
  }
  
  // Fallback to file modification time or current time
  return new Date();
}

/**
 * Parse SQL content into structured operations
 * @param content SQL content to parse
 * @returns Array of SqlOperation objects
 */
export async function parseSqlOperations(content: string): Promise<SqlOperation[]> {
  const operations: SqlOperation[] = [];
  const parser = new Parser();
  
  // Split by statement breakpoints or semicolons
  const statements = content
    .split(/(--> statement-breakpoint|;)/i)
    .map(stmt => stmt.trim())
    .filter(stmt => stmt && !stmt.match(/^--> statement-breakpoint$/i) && stmt !== ';');
  
  let lineNumber = 1;
  
  for (const statement of statements) {
    if (!statement.trim()) continue;
    
    try {
      // Try to parse the SQL statement
      const ast = parser.astify(statement, { database: 'sqlite' });
      const operation = extractOperationFromAst(ast, statement, lineNumber);
      if (operation) {
        operations.push(operation);
      }
    } catch (error) {
      // If parsing fails, create a generic operation
      operations.push({
        type: 'OTHER',
        sql: statement,
        line: lineNumber
      });
    }
    
    // Increment line number based on newlines in the statement
    lineNumber += (statement.match(/\n/g) || []).length + 1;
  }
  
  return operations;
}

/**
 * Extract operation details from SQL AST
 * @param ast Parsed SQL AST
 * @param sql Original SQL statement
 * @param line Line number
 * @returns SqlOperation object
 */
function extractOperationFromAst(ast: any, sql: string, line: number): SqlOperation | null {
  if (!ast || !ast.type) return null;
  
  const operation: SqlOperation = {
    type: 'OTHER',
    sql,
    line
  };
  
  switch (ast.type?.toLowerCase()) {
    case 'create':
      if (ast.keyword === 'table') {
        operation.type = 'CREATE_TABLE';
        operation.table = ast.table?.[0]?.table || extractTableNameFromSql(sql);
      } else if (ast.keyword === 'index') {
        operation.type = 'CREATE_INDEX';
        operation.index = ast.index || extractIndexNameFromSql(sql);
        operation.table = ast.table?.[0]?.table || extractTableNameFromIndexSql(sql);
      }
      break;
    
    case 'drop':
      if (ast.keyword === 'table') {
        operation.type = 'DROP_TABLE';
        operation.table = ast.name?.[0]?.table || extractTableNameFromSql(sql);
      } else if (ast.keyword === 'index') {
        operation.type = 'DROP_INDEX';
        operation.index = ast.name || extractIndexNameFromSql(sql);
      }
      break;
    
    case 'alter':
      operation.type = 'ALTER_TABLE';
      operation.table = ast.table?.[0]?.table || extractTableNameFromSql(sql);
      break;
    
    case 'insert':
      operation.type = 'INSERT';
      operation.table = ast.table?.[0]?.table || extractTableNameFromSql(sql);
      break;
    
    case 'update':
      operation.type = 'UPDATE';
      operation.table = ast.table?.[0]?.table || extractTableNameFromSql(sql);
      break;
    
    case 'delete':
      operation.type = 'DELETE';
      operation.table = ast.table?.[0]?.table || extractTableNameFromSql(sql);
      break;
  }
  
  return operation;
}

/**
 * Extract table name from SQL using regex (fallback when AST parsing fails)
 * @param sql SQL statement
 * @returns Table name or undefined
 */
function extractTableNameFromSql(sql: string): string | undefined {
  // Match various SQL patterns to extract table names
  const patterns = [
    /CREATE\s+TABLE\s+`?([^`\s\(]+)`?/i,
    /DROP\s+TABLE\s+`?([^`\s\(]+)`?/i,
    /ALTER\s+TABLE\s+`?([^`\s\(]+)`?/i,
    /INSERT\s+INTO\s+`?([^`\s\(]+)`?/i,
    /UPDATE\s+`?([^`\s\(]+)`?/i,
    /DELETE\s+FROM\s+`?([^`\s\(]+)`?/i,
  ];
  
  for (const pattern of patterns) {
    const match = sql.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return undefined;
}

/**
 * Extract index name from SQL
 * @param sql SQL statement
 * @returns Index name or undefined
 */
function extractIndexNameFromSql(sql: string): string | undefined {
  const patterns = [
    /CREATE\s+(?:UNIQUE\s+)?INDEX\s+`?([^`\s\(]+)`?/i,
    /DROP\s+INDEX\s+`?([^`\s\(]+)`?/i,
  ];
  
  for (const pattern of patterns) {
    const match = sql.match(pattern);
    if (match) {
      return match[1];
    }
  }
  
  return undefined;
}

/**
 * Extract table name from index SQL
 * @param sql SQL statement
 * @returns Table name or undefined
 */
function extractTableNameFromIndexSql(sql: string): string | undefined {
  const match = sql.match(/ON\s+`?([^`\s\(]+)`?/i);
  return match ? match[1] : undefined;
}

/**
 * Get all migration files in a directory
 * @param migrationsDir Path to migrations directory
 * @returns Array of migration file paths
 */
export async function getAllMigrationFiles(migrationsDir: string): Promise<string[]> {
  try {
    const files = await fs.readdir(migrationsDir);
    return files
      .filter(file => file.endsWith('.sql'))
      .map(file => path.join(migrationsDir, file))
      .sort(); // Sort alphabetically/chronologically
  } catch (error) {
    return [];
  }
}

/**
 * Check if a file is a migration file
 * @param filePath Path to the file
 * @returns True if it's a migration file
 */
export function isMigrationFile(filePath: string): boolean {
  return path.extname(filePath).toLowerCase() === '.sql';
}

/**
 * Validate migration file path
 * @param filePath Path to validate
 * @param migrationsDir Migrations directory
 * @returns Resolved path if valid, throws error if invalid
 */
export async function validateMigrationPath(filePath: string, migrationsDir: string): Promise<string> {
  let resolvedPath: string;
  
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