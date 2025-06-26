/**
 * flow back - Rollback migrations
 */

import { confirm, select } from '@clack/prompts'
import { getFlowConfig, GlobalOptions } from '../lib/config.js'
import { createSpinner } from '../lib/prompts.js'
import fs from 'fs-extra'
import path from 'node:path'
import pc from 'picocolors'
import { Client as PgClient } from 'pg'
import mysql from 'mysql2/promise'
import Database from 'better-sqlite3'
import sqlite3 from 'sqlite3'

export interface BackOptions {
  steps?: number
  to?: string
  project?: string
  yes?: boolean
}

interface DatabaseConnection {
  type: 'postgresql' | 'mysql' | 'sqlite'
  client: any
}

interface AppliedMigration {
  id: number
  name: string
  checksum: string
  applied_at: string
}

export async function backCommand(options: BackOptions, globalOptions: GlobalOptions): Promise<void> {
  const projectPath = options.project ? path.resolve(options.project) : process.cwd()
  const cfg = await getFlowConfig(globalOptions, projectPath)
  const envCfg = cfg.environments[cfg.defaultEnvironment]
  
  if (globalOptions.debug) {
    console.log('Rolling back using env:', cfg.defaultEnvironment)
  }
  
  const spinner = createSpinner('Connecting to database...')
  
  // Connect to database
  let connection: DatabaseConnection | null = null
  try {
    connection = await connectToDatabase(envCfg)
    spinner.update('Connected to database successfully')
  } catch (error) {
    spinner.fail('Failed to connect to database')
    console.log(pc.red(`❌ Database connection failed: ${error}`))
    return
  }
  
  try {
    // Get applied migrations
    spinner.update('Fetching applied migrations...')
    const appliedMigrations = await getAppliedMigrations(connection)
    
    if (appliedMigrations.length === 0) {
      spinner.succeed('No migrations to rollback')
      console.log(pc.green('✅ No migrations have been applied'))
      return
    }
    
    spinner.stop()
    
    // Determine which migrations to rollback
    const migrationsToRollback = await determineMigrationsToRollback(
      appliedMigrations, 
      options, 
      envCfg,
      projectPath
    )
    
    if (migrationsToRollback.length === 0) {
      console.log(pc.yellow('⚠️  No migrations selected for rollback'))
      return
    }
    
    console.log(`\n📋 Migrations to rollback (${migrationsToRollback.length}):`)
    migrationsToRollback.forEach((migration, idx) => {
      console.log(`  ${idx + 1}. ${pc.cyan(migration.name)} (applied: ${migration.applied_at})`)
    })
    
    if (globalOptions.dryRun) {
      console.log(pc.yellow('\n🔍 Dry run mode - showing what would be rolled back'))
      for (const migration of migrationsToRollback) {
        console.log(`\n${pc.cyan(`--- Rollback ${migration.name} ---`)}`)
        
        // Try to find the DOWN migration content
        const downContent = await findDownMigration(migration, envCfg, projectPath)
        if (downContent) {
          console.log(pc.gray(downContent))
        } else {
          console.log(pc.yellow('⚠️  No rollback script found for this migration'))
        }
      }
      return
    }
    
    // Confirm rollback
    const riskyMigrations = migrationsToRollback.filter(m => 
      m.name.toLowerCase().includes('drop') || 
      m.name.toLowerCase().includes('delete')
    )
    
    if (riskyMigrations.length > 0) {
      console.log(pc.red('\n⚠️  WARNING: Some migrations may contain destructive operations:'))
      riskyMigrations.forEach(m => {
        console.log(`  • ${pc.red(m.name)}`)
      })
    }
    
    const proceed = options.yes ? true : await confirm({
      message: riskyMigrations.length > 0
        ? pc.red('⚠️  Are you sure you want to rollback these potentially destructive migrations?')
        : `Rollback ${migrationsToRollback.length} migration(s)?`
    })
    
    if (!proceed) {
      console.log(pc.gray('Rollback cancelled.'))
      return
    }
    
    // Perform rollback
    const rollbackSpinner = createSpinner('Rolling back migrations...')
    
    for (const migration of migrationsToRollback) {
      try {
        rollbackSpinner.update(`Rolling back ${migration.name}...`)
        
        const downContent = await findDownMigration(migration, envCfg, projectPath)
        if (downContent) {
          await executeMigrationRollback(connection, downContent)
        } else {
          console.log(pc.yellow(`⚠️  No rollback script found for ${migration.name}, skipping...`))
        }
        
        await removeMigrationRecord(connection, migration)
        
        if (globalOptions.debug) {
          console.log(pc.green(`  ✅ Rolled back ${migration.name}`))
        }
      } catch (error) {
        rollbackSpinner.fail(`Failed to rollback ${migration.name}`)
        console.log(pc.red(`❌ Rollback failed: ${error}`))
        
        // Ask if they want to continue with remaining rollbacks
        if (migrationsToRollback.indexOf(migration) < migrationsToRollback.length - 1) {
          const continueRollback = await confirm({
            message: 'Continue rolling back remaining migrations?'
          })
          
          if (!continueRollback) {
            console.log(pc.yellow('⚠️  Rollback process stopped'))
            return
          }
        }
      }
    }
    
    rollbackSpinner.succeed('All migrations rolled back successfully')
    console.log(pc.green('✅ Migration rollback completed safely'))
    
  } finally {
    // Close database connection
    if (connection) {
      await closeDatabaseConnection(connection)
    }
  }
}

async function connectToDatabase(envCfg: any): Promise<DatabaseConnection> {
  const connectionString = envCfg.db_connection_string || envCfg.databaseUrl;

  if (!connectionString) {
    throw new Error('Database connection string not found in flow.config.json. Please provide "db_connection_string" or "databaseUrl".')
  }

  const dbType = connectionString.split(':')[0];

  switch (dbType) {
    case 'postgresql':
      const pgClient = new PgClient({ connectionString })
      await pgClient.connect()
      return { type: 'postgresql', client: pgClient }

    case 'mysql':
      const mysqlConnection = await mysql.createConnection(connectionString)
      return { type: 'mysql', client: mysqlConnection }

    case 'sqlite':
      const sqlitePath = connectionString.substring('sqlite:'.length);
      const sqliteDb = new sqlite3.Database(sqlitePath || './database.db')
      return { type: 'sqlite', client: sqliteDb }

    default:
      throw new Error(`Unsupported database type: ${dbType}`)
  }
}

async function getAppliedMigrations(connection: DatabaseConnection): Promise<AppliedMigration[]> {
  try {
    const result = await executeQuery(
      connection, 
      'SELECT id, name, checksum, applied_at FROM flow_migrations ORDER BY id DESC'
    )
    return result
  } catch (error) {
    // If the table doesn't exist, no migrations have been applied
    return []
  }
}

async function determineMigrationsToRollback(
  appliedMigrations: AppliedMigration[], 
  options: BackOptions,
  envCfg: any,
  projectPath: string
): Promise<AppliedMigration[]> {
  if (options.to) {
    // Rollback to a specific migration (exclusive)
    const targetIndex = appliedMigrations.findIndex(m => m.name === options.to)
    if (targetIndex === -1) {
      throw new Error(`Migration '${options.to}' not found in applied migrations`)
    }
    return appliedMigrations.slice(0, targetIndex)
  }
  
  const steps = options.steps || 1
  
  if (steps >= appliedMigrations.length) {
    // Confirm rolling back all migrations
    const confirmAll = options.yes ? true : await confirm({
      message: pc.yellow(`⚠️  This will rollback ALL ${appliedMigrations.length} migrations. Continue?`)
    })
    
    if (!confirmAll) {
      return []
    }
    
    return appliedMigrations
  }
  
  return appliedMigrations.slice(0, steps)
}

async function findDownMigration(migration: AppliedMigration, envCfg: any, projectPath: string): Promise<string | null> {
  const migrationsDir = envCfg.migrationsPath || './migrations'
  const absoluteMigrationsDir = path.resolve(projectPath, migrationsDir)
  
  // Find the corresponding migration file
  const files = await fs.readdir(absoluteMigrationsDir)
  
  for (const filename of files) {
    const filePath = path.join(absoluteMigrationsDir, filename)
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) {
      continue;
    }
    
    if (await fs.pathExists(filePath)) {
      let content = await fs.readFile(filePath, 'utf-8')
      
      // Extract SQL from TypeScript/JavaScript files if needed
      if (filename.endsWith('.ts') || filename.endsWith('.js')) {
        content = extractDownSQLFromMigrationFile(content)
      }
      
      // For .sql files, look for -- DOWN section
      if (filename.endsWith('.sql') && content.includes('-- DOWN')) {
        const downSection = content.split('-- DOWN')[1]
        if (downSection) {
          return downSection.trim()
        }
      }
      
      // If it's a dedicated down file, return the whole content
      if (filename.includes('down') || filename.includes('_down')) {
        return content
      }
    }
  }
  
  return null
}

async function executeMigrationRollback(connection: DatabaseConnection, downContent: string): Promise<void> {
  // Split migration content by semicolon and execute each statement
  const statements = downContent
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0)
  
  for (const statement of statements) {
    if (statement.trim()) {
      await executeQuery(connection, statement)
    }
  }
}

async function removeMigrationRecord(connection: DatabaseConnection, migration: AppliedMigration): Promise<void> {
  const deleteQuery = (() => {
    switch (connection.type) {
      case 'postgresql':
        return 'DELETE FROM flow_migrations WHERE id = $1'
      case 'mysql':
        return 'DELETE FROM flow_migrations WHERE id = ?'
      case 'sqlite':
        return 'DELETE FROM flow_migrations WHERE id = ?'
    }
  })()
  
  await executeQuery(connection, deleteQuery, [migration.id])
}

async function executeQuery(connection: DatabaseConnection, query: string, params?: any[]): Promise<any[]> {
  switch (connection.type) {
    case 'postgresql':
      const pgResult = await connection.client.query(query, params)
      return pgResult.rows
      
    case 'mysql':
      const [mysqlResult] = await connection.client.execute(query, params)
      return Array.isArray(mysqlResult) ? mysqlResult : [mysqlResult]
      
    case 'sqlite':
      return new Promise((resolve, reject) => {
        const callback = (err: Error | null, rows: any[]) => {
          if (err) {
            reject(err)
          } else {
            resolve(rows)
          }
        }
        if (query.toLowerCase().trim().startsWith('select')) {
          connection.client.all(query, params, callback)
        } else {
          connection.client.run(query, params, callback)
          resolve([]);
        }
      })
      
    default:
      throw new Error(`Unsupported database type: ${connection.type}`)
  }
}

async function closeDatabaseConnection(connection: DatabaseConnection): Promise<void> {
  switch (connection.type) {
    case 'postgresql':
      await connection.client.end()
      break
    case 'mysql':
      await connection.client.end()
      break
    case 'sqlite':
      connection.client.close()
      break
  }
}

function extractDownSQLFromMigrationFile(content: string): string {
  // Look for down migration patterns in TypeScript/JavaScript files
  const downPatterns = [
    /public async down\(.*?\): Promise<void> \{([\s\S]*?)\}/,
    /async down\(.*?\) \{([\s\S]*?)\}/,
    /down.*?{([\s\S]*?)}/,
  ]
  
  for (const pattern of downPatterns) {
    const match = content.match(pattern)
    if (match) {
      const downCode = match[1]
      
      // Extract SQL from the down method
      const sqlPatterns = [
        /queryRunner\.query\s*\(\s*[`"']([^`"']+)[`"']/g,
        /sql\s*`([^`]+)`/g,
        /"((?:DROP|ALTER|CREATE|INSERT|UPDATE|DELETE)[^"]+)"/gi
      ]
      
      let extractedSQL = ''
      for (const sqlPattern of sqlPatterns) {
        let sqlMatch
        while ((sqlMatch = sqlPattern.exec(downCode)) !== null) {
          extractedSQL += sqlMatch[1] + ';\n'
        }
      }
      
      return extractedSQL
    }
  }
  
  return ''
} 