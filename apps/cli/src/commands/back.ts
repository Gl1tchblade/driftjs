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

export interface BackOptions {
  steps?: number
  to?: string
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
  const cfg = await getFlowConfig(globalOptions)
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
      envCfg
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
        const downContent = await findDownMigration(migration, envCfg)
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
    
    const proceed = await confirm({
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
        
        const downContent = await findDownMigration(migration, envCfg)
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
  const dbConfig = envCfg.database
  
  if (!dbConfig) {
    throw new Error('Database configuration not found in flow.config.json')
  }
  
  switch (dbConfig.type) {
    case 'postgresql':
      const pgClient = new PgClient({
        host: dbConfig.host,
        port: dbConfig.port || 5432,
        database: dbConfig.database,
        user: dbConfig.user,
        password: dbConfig.password,
      })
      await pgClient.connect()
      return { type: 'postgresql', client: pgClient }
      
    case 'mysql':
      const mysqlConnection = await mysql.createConnection({
        host: dbConfig.host,
        port: dbConfig.port || 3306,
        database: dbConfig.database,
        user: dbConfig.user,
        password: dbConfig.password,
      })
      return { type: 'mysql', client: mysqlConnection }
      
    case 'sqlite':
      const sqliteDb = new Database(dbConfig.database || './database.db')
      return { type: 'sqlite', client: sqliteDb }
      
    default:
      throw new Error(`Unsupported database type: ${dbConfig.type}`)
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
  envCfg: any
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
    const confirmAll = await confirm({
      message: pc.yellow(`⚠️  This will rollback ALL ${appliedMigrations.length} migrations. Continue?`)
    })
    
    if (!confirmAll) {
      return []
    }
    
    return appliedMigrations
  }
  
  return appliedMigrations.slice(0, steps)
}

async function findDownMigration(migration: AppliedMigration, envCfg: any): Promise<string | null> {
  const migrationsDir = envCfg.migrationsPath || './migrations'
  const absoluteMigrationsDir = path.resolve(process.cwd(), migrationsDir)
  
  // Look for migration files that match this migration name
  const possibleFiles = [
    `${migration.name}.sql`,
    `${migration.name}.ts`,
    `${migration.name}.js`,
    `${migration.name}_down.sql`,
    `down_${migration.name}.sql`
  ]
  
  for (const filename of possibleFiles) {
    const filePath = path.join(absoluteMigrationsDir, filename)
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
      if (params) {
        const stmt = connection.client.prepare(query)
        return query.toLowerCase().includes('select') ? stmt.all(params) : [stmt.run(params)]
      } else {
        return query.toLowerCase().includes('select') ? connection.client.prepare(query).all() : [connection.client.exec(query)]
      }
      
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