/**
 * Validation utilities for DriftJS
 */

import { DatabaseConfig, DatabaseType } from '../types/common.js'

/**
 * Validate database configuration
 */
export function validateDatabaseConfig(config: Partial<DatabaseConfig>): { valid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!config.type) {
    errors.push('Database type is required')
  } else if (!isValidDatabaseType(config.type)) {
    errors.push(`Invalid database type: ${config.type}`)
  }
  
  if (!config.database) {
    errors.push('Database name is required')
  }
  
  if (config.url) {
    if (!isValidConnectionString(config.url)) {
      errors.push('Invalid database connection string')
    }
  } else {
    if (!config.host) {
      errors.push('Database host is required when not using connection string')
    }
    
    if (config.port && (config.port < 1 || config.port > 65535)) {
      errors.push('Invalid port number')
    }
  }
  
  return { valid: errors.length === 0, errors }
}

/**
 * Check if a string is a valid database type
 */
export function isValidDatabaseType(type: string): type is DatabaseType {
  return ['postgresql', 'mysql', 'sqlite', 'mariadb'].includes(type)
}

/**
 * Basic validation for database connection strings
 */
export function isValidConnectionString(url: string): boolean {
  try {
    const parsed = new URL(url)
    return ['postgresql:', 'postgres:', 'mysql:', 'sqlite:'].includes(parsed.protocol)
  } catch {
    return false
  }
}

/**
 * Validate file path
 */
export function isValidFilePath(path: string): boolean {
  if (!path || typeof path !== 'string') {
    return false
  }
  
  // Check for invalid characters
  const invalidChars = /[<>:"|?*]/
  if (invalidChars.test(path)) {
    return false
  }
  
  return true
}

/**
 * Validate version string (semver-like)
 */
export function isValidVersion(version: string): boolean {
  const semverRegex = /^\d+\.\d+\.\d+(?:-[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*)?(?:\+[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*)?$/
  return semverRegex.test(version)
}

/**
 * Sanitize user input
 */
export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/[\x00-\x1f\x7f]/g, '') // Remove control characters
    .trim()
}

/**
 * Validate SQL identifier (table/column names)
 */
export function isValidSQLIdentifier(identifier: string): boolean {
  if (!identifier || typeof identifier !== 'string') {
    return false
  }
  
  // SQL identifier rules: start with letter or underscore, followed by letters, digits, or underscores
  const identifierRegex = /^[a-zA-Z_][a-zA-Z0-9_]*$/
  return identifierRegex.test(identifier) && identifier.length <= 63 // PostgreSQL limit
} 