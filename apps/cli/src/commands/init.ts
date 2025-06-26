/**
 * flow init - Initialize flow configuration
 */

import { createSpinner, textInput, confirmAction } from '../lib/prompts.js'
import { GlobalOptions } from '../lib/config.js'
import fsExtra from 'fs-extra'
import { resolve } from 'node:path'
import dotenv from 'dotenv'
// @ts-ignore – optional type import not strictly needed for compilation
// import type { FlowConfig } from '@driftjs/core'

export interface InitOptions {
  force?: boolean
  envName?: string
  dbUrl?: string
  migrationsPath?: string
  yes?: boolean
}

async function findDatabaseUrl(envName: string): Promise<string> {
  const candidateFiles: string[] = []
  // 1) current directory .env
  candidateFiles.push(resolve('.env'))
  // 2) parent directories up to repo root
  const parts = process.cwd().split('/')
  for (let i = parts.length - 1; i > 0; i--) {
    candidateFiles.push(parts.slice(0, i + 1).join('/') + '/.env')
  }
  // 3) common monorepo locations (apps/*/.env and packages/*/.env)
  const appsDir = resolve('apps')
  const pkgsDir = resolve('packages')
  if (await fsExtra.pathExists(appsDir)) {
    const sub = await fsExtra.readdir(appsDir)
    sub.forEach((s) => candidateFiles.push(resolve(appsDir, s, '.env')))
  }
  if (await fsExtra.pathExists(pkgsDir)) {
    const sub = await fsExtra.readdir(pkgsDir)
    sub.forEach((s) => candidateFiles.push(resolve(pkgsDir, s, '.env')))
  }

  for (const file of candidateFiles) {
    if (await fsExtra.pathExists(file)) {
      try {
        const envVars = dotenv.parse(await fsExtra.readFile(file))
        const v =
          envVars.DATABASE_URL || envVars[`DATABASE_URL_${envName.toUpperCase()}`]
        if (v) return v
      } catch {}
    }
  }
  return ''
}

async function detectMigrationsDir(): Promise<string | null> {
  const candidates = [
    'migrations',
    'db/migrations',
    'drizzle/migrations',
    'prisma/migrations',
    'database/migrations'
  ]
  // Parse drizzle.config.* for out path
  const drizzleConfigFiles = ['drizzle.config.ts', 'drizzle.config.js', 'drizzle.config.mjs', 'drizzle.config.cjs']
  for (const f of drizzleConfigFiles) {
    if (await fsExtra.pathExists(resolve(f))) {
      const content = await fsExtra.readFile(resolve(f), 'utf8')
      const match = content.match(/out\s*:\s*["'`](.+?)["'`]/)
      if (match) {
        candidates.unshift(match[1])
      }
    }
  }
  for (const rel of candidates) {
    if (await fsExtra.pathExists(resolve(rel))) return rel
  }
  return null
}

export async function initCommand(options: InitOptions, globalOptions: GlobalOptions): Promise<void> {
  const spinner = createSpinner('Collecting project information')

  let envName: string, databaseUrl: string, migrationsPath: string;

  if (options.yes) {
    // Non-interactive mode
    envName = options.envName || 'development';
    const detectedDb = await findDatabaseUrl(envName);
    databaseUrl = options.dbUrl || detectedDb;

    if (!databaseUrl) {
      spinner.fail('Database connection string is required. Please provide it with --db-url.');
      throw new Error('FLOW_MISSING_DB_NON_INTERACTIVE');
    }
    
    const detectedPath = await detectMigrationsDir();
    migrationsPath = options.migrationsPath || detectedPath || './migrations';

  } else {
    // Interactive mode
    const envNameInput = await textInput('Environment name', {
      placeholder: 'development',
      defaultValue: 'development'
    });
    envName = envNameInput?.trim() || 'development';

    const defaultDb = await findDatabaseUrl(envName);
    const dbPrompt = 'Database connection string (e.g. postgresql://user:pass@localhost:5432/db)';
    const dbInput = await textInput(dbPrompt, {
      placeholder: defaultDb || 'postgresql://user:pass@localhost:5432/db',
      defaultValue: defaultDb
    });
    databaseUrl = (dbInput?.trim() || defaultDb).trim();

    if (!databaseUrl) {
      spinner.fail('Database connection string is required');
      throw new Error('FLOW_MISSING_DB');
    }

    const detectedPath = (await detectMigrationsDir()) || './migrations';
    const migInput = await textInput('Path to migrations folder', {
      placeholder: detectedPath,
      defaultValue: detectedPath
    });
    migrationsPath = migInput?.trim() || detectedPath;

    const proceed = await confirmAction('Generate configuration with these values?');
    if (!proceed) {
      spinner.fail('User cancelled');
      return;
    }
  }

  spinner.update('Generating flow.config')

  // Guess DB type
  const dbTypeMatch = databaseUrl.split(':')[0]

  // Build config object
  const config: any = {
    version: '0.1.0',
    defaultEnvironment: envName,
    environments: {
      [envName]: {
        databaseUrl,
        migrationsPath
      }
    },
    safety: {
      maxTableSizeMB: 1024,
      maxLockTimeMs: 300_000
    },
    database: {
      default: {
        type: dbTypeMatch
      }
    }
  }

  const configPath = resolve(globalOptions.config || 'flow.config.json')

  if (await fsExtra.pathExists(configPath) && !options.yes && !(await confirmAction(`Overwrite existing ${configPath}?`))) {
    spinner.fail('Init aborted – config exists')
    return
  }

  if (!globalOptions.dryRun) {
    await fsExtra.writeFile(configPath, JSON.stringify(config, null, 2))
    spinner.succeed(`Configuration written to ${configPath}`)
  } else {
    spinner.succeed('Dry run complete – configuration would be:')
    console.log(JSON.stringify(config, null, 2))
  }

  // --- NEW: ensure package.json has a "flow" script for easy execution
  try {
    const pkgPath = resolve('package.json')
    if (await fsExtra.pathExists(pkgPath)) {
      // Dynamic import to avoid increasing cold start
      const fsmod: any = await import('fs-extra')
      const fsDyn = (fsmod.default ?? fsmod) as typeof fsExtra
      const pkg = await fsDyn.readJson(pkgPath)
      pkg.scripts = pkg.scripts || {}
      if (!pkg.scripts.flow) {
        pkg.scripts.flow = 'flow'
        await fsDyn.writeJson(pkgPath, pkg, { spaces: 2 })
        spinner.update('Added "flow" script to package.json')
      }
    }
  } catch (err) {
    // Non-fatal; emit warning but continue
    console.warn('⚠️  Could not update package.json:', err instanceof Error ? err.message : err)
  }
} 