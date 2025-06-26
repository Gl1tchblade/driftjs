/**
 * flow apply - Apply enhanced migrations
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

export interface ApplyOptions {
  migration?: string
  target?: string
  project?: string
  yes?: boolean
}

interface DatabaseConnection {
  type: 'postgresql' | 'mysql' | 'sqlite'
  client: any
}

export async function applyCommand(options: ApplyOptions, globalOptions: GlobalOptions): Promise<void> {
  const projectPath = options.project ? path.resolve(options.project) : process.cwd()
  const cfg = await getFlowConfig(globalOptions, projectPath)
  const envCfg = cfg.environments[cfg.defaultEnvironment]
  
  if (globalOptions.debug) {
    console.log('Applying migration using env:', cfg.defaultEnvironment)
  }
  
  const spinner = createSpinner('Connecting to database...')
  
  // Connect to database
  let connection: DatabaseConnection | null = null
  try {
    console.log('connecting to database...'); // DEBUG LOG
    connection = await connectToDatabase(envCfg)
    console.log('connected to database'); // DEBUG LOG
    spinner.update('Connected to database successfully')
  } catch (error) {
    console.log('error connecting to database', error); // DEBUG LOG
    spinner.fail('Failed to connect to database')
    console.log(pc.red(`❌ Database connection failed: ${error}`))
    return
  }
  
  try {
    // Ensure migrations tracking table exists
    spinner.update('Ensuring migration tracking table exists...')
    await ensureMigrationsTable(connection)
    console.log('ensured migrations table'); // DEBUG LOG
    
    // Find migrations to apply
    spinner.update('Finding migrations to apply...')
    const migrationsDir = envCfg.migrationsPath || './migrations'
    const absoluteMigrationsDir = path.resolve(projectPath, migrationsDir)
    
    const pendingMigrations = await findPendingMigrations(connection, absoluteMigrationsDir, options.migration)
    console.log('found pending migrations'); // DEBUG LOG
    
    if (pendingMigrations.length === 0) {
      spinner.succeed('No pending migrations to apply')
      console.log(pc.green('✅ Database is up to date'))
      return
    }
    
    spinner.stop()
    
    console.log(`\n📋 Found ${pendingMigrations.length} pending migration(s):`)
    pendingMigrations.forEach((migration, idx) => {
      console.log(`  ${idx + 1}. ${pc.cyan(migration.name)}`)
    })
    
    if (globalOptions.dryRun) {
      console.log(pc.yellow('\n🔍 Dry run mode - showing what would be applied:'))
      for (const migration of pendingMigrations) {
        console.log(`\n${pc.cyan(`--- ${migration.name} ---`)}`)
        console.log(pc.gray(migration.content))
      }
      return
    }
    
    const proceed = options.yes ? true : await confirm({
      message: `Apply ${pendingMigrations.length} migration(s) to the database?`
    })
    console.log('confirmed apply'); // DEBUG LOG
    
    if (!proceed) {
      console.log(pc.gray('Migration cancelled.'))
      return
    }
    
    // Apply migrations
    const applySpinner = createSpinner('Applying migrations...')
    
    for (const migration of pendingMigrations) {
      try {
        applySpinner.update(`Applying ${migration.name}...`)
        
        await applyMigration(connection, migration)
        await recordMigrationApplied(connection, migration)
        
        if (globalOptions.debug) {
          console.log(pc.green(`  ✅ Applied ${migration.name}`))
        }
      } catch (error) {
        applySpinner.fail(`Failed to apply ${migration.name}`)
        console.log(pc.red(`❌ Migration failed: ${error}`))
        
        // Ask if they want to continue with remaining migrations
        if (pendingMigrations.indexOf(migration) < pendingMigrations.length - 1) {
          const continueApplying = await confirm({
            message: 'Continue applying remaining migrations?'
          })
          
          if (!continueApplying) {
            console.log(pc.yellow('⚠️  Migration process stopped'))
            return
          }
        }
      }
    }
    
    applySpinner.succeed('All migrations applied successfully')
    console.log(pc.green('✅ Enhanced migrations applied successfully'))
    
  } finally {
    // Close database connection
    if (connection) {
      await closeDatabaseConnection(connection)
    }
  }
}

async function connectToDatabase(envCfg: any): Promise<DatabaseConnection> {
  console.log('in connectToDatabase'); // DEBUG LOG
  const connectionString = envCfg.db_connection_string || envCfg.databaseUrl;
  console.log('connectionString:', connectionString); // DEBUG LOG
  
  if (!connectionString) {
    throw new Error('Database connection string not found in flow.config.json. Please provide "db_connection_string" or "databaseUrl".')
  }

  const dbType = connectionString.split(':')[0];
  console.log('dbType:', dbType); // DEBUG LOG

  switch (dbType) {
    case 'postgresql':
      console.log('connecting to postgresql'); // DEBUG LOG
      const pgClient = new PgClient({ connectionString })
      await pgClient.connect()
      console.log('connected to postgresql'); // DEBUG LOG
      return { type: 'postgresql', client: pgClient }
      
    case 'mysql':
      console.log('connecting to mysql'); // DEBUG LOG
      const mysqlConnection = await mysql.createConnection(connectionString)
      console.log('connected to mysql'); // DEBUG LOG
      return { type: 'mysql', client: mysqlConnection }
      
    case 'sqlite':
      console.log('connecting to sqlite'); // DEBUG LOG
      const sqlitePath = connectionString.substring('sqlite:'.length);
      const sqliteDb = new Database(sqlitePath || './database.db')
      console.log('connected to sqlite'); // DEBUG LOG
      return { type: 'sqlite', client: sqliteDb }
      
    default:
      throw new Error(`Unsupported database type: ${dbType}`)
  }
}

async function ensureMigrationsTable(connection: DatabaseConnection): Promise<void> {
  const createTableQuery = (() => {
    switch (connection.type) {
      case 'postgresql':
        return `
          CREATE TABLE IF NOT EXISTS flow_migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            checksum VARCHAR(64),
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      case 'mysql':
        return `
          CREATE TABLE IF NOT EXISTS flow_migrations (
            id INT AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            checksum VARCHAR(64),
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          )
        `
      case 'sqlite':
        return `
          CREATE TABLE IF NOT EXISTS flow_migrations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            checksum TEXT,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
          )
        `
    }
  })()
  
  await executeQuery(connection, createTableQuery)
}

async function findPendingMigrations(connection: DatabaseConnection, migrationsDir: string, targetMigration?: string): Promise<Array<{name: string, path: string, content: string}>> {
  if (!await fs.pathExists(migrationsDir)) {
    throw new Error(`Migrations directory not found: ${migrationsDir}`)
  }
  
  const appliedMigrations = await executeQuery(connection, 'SELECT name FROM flow_migrations ORDER BY applied_at')
  const appliedNames = new Set(appliedMigrations.map((row: any) => row.name))
  
  const allFiles = await fs.readdir(migrationsDir)
  const migrationFiles = allFiles
    .filter(f => f.endsWith('.sql') || f.endsWith('.ts') || f.endsWith('.js'))
    .sort()
  
  const pendingMigrations = []
  
  for (const file of migrationFiles) {
    const migrationName = path.parse(file).name
    
    if (appliedNames.has(migrationName)) {
      continue
    }
    
    if (targetMigration && migrationName !== targetMigration) {
      continue
    }
    
    const filePath = path.join(migrationsDir, file)
    let content = await fs.readFile(filePath, 'utf-8')
    
    if (file.endsWith('.ts') || file.endsWith('.js')) {
      content = extractSQLFromMigrationFile(content)
    }
    
    pendingMigrations.push({
      name: migrationName,
      path: filePath,
      content
    })
    
    if (targetMigration && migrationName === targetMigration) {
      break
    }
  }
  
  return pendingMigrations
}

async function applyMigration(connection: DatabaseConnection, migration: {name: string, content: string}): Promise<void> {
  // Split migration content by semicolon and execute each statement
  const statements = migration.content
    .split(';')
    .map(stmt => stmt.trim())
    .filter(stmt => stmt.length > 0)
  
  for (const statement of statements) {
    if (statement.trim()) {
      await executeQuery(connection, statement)
    }
  }
}

async function recordMigrationApplied(connection: DatabaseConnection, migration: {name: string, content: string}): Promise<void> {
  // Simple checksum calculation (could be improved)
  const checksum = Buffer.from(migration.content).toString('base64').slice(0, 32)
  
  const insertQuery = (() => {
    switch (connection.type) {
      case 'postgresql':
        return 'INSERT INTO flow_migrations (name, checksum) VALUES ($1, $2)'
      case 'mysql':
        return 'INSERT INTO flow_migrations (name, checksum) VALUES (?, ?)'
      case 'sqlite':
        return 'INSERT INTO flow_migrations (name, checksum) VALUES (?, ?)'
    }
  })()
  
  await executeQuery(connection, insertQuery, [migration.name, checksum])
}

async function executeQuery(connection: DatabaseConnection, query: string, params?: any[]): Promise<any[]> {
  switch (connection.type) {
    case 'postgresql':
      const pgResult = await connection.client.query(query, params)
      return pgResult.rows
      
    case 'mysql':
      const [mysqlResult] = await connection.client.execute(query, params)
      return mysqlResult as any[]
      
    case 'sqlite':
      const stmt = connection.client.prepare(query)
      return stmt.all(params)
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

function extractSQLFromMigrationFile(content: string): string {
  // Simple extraction logic, can be improved
  // For now, assume SQL is in a template literal tagged with `sql`
  const match = content.match(/sql`([\s\S]*)`/)
  
  const extractedSQL = match ? match[1].trim() : ''
  
  if (!extractedSQL) {
    // Fallback for plain SQL files or different export format
    if (content.includes('CREATE') || content.includes('ALTER') || content.includes('INSERT') || content.includes('UPDATE') || content.includes('DELETE')) {
      return content;
    }
  }
  
  return extractedSQL || content
} 