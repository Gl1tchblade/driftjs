/**
 * @driftjs/flow - Enhanced database migration CLI tool
 * Core entry point with beautiful CLI interactions
 */

import { Command } from 'commander'
import { intro, outro, isCancel, cancel, log } from '@clack/prompts'
import { version } from '../package.json'
import { initCommand } from './commands/init.js'
import { syncCommand } from './commands/sync.js'
import { testCommand } from './commands/test.js'
import { applyCommand } from './commands/apply.js'
import { backCommand } from './commands/back.js'

const handleCommand = async (commandPromise: Promise<any>) => {
  try {
    await commandPromise;
  } catch (error) {
    if (isCancel(error)) {
      cancel('Operation cancelled.');
      process.exit(0);
    }
    log.error(error instanceof Error ? error.message : 'An unknown error occurred.');
    process.exit(1);
  }
};

const program = new Command()

program
  .name('flow')
  .description('Enhanced database migration CLI tool for production-safety')
  .version(version, '-v, --version', 'Output the current version')
  .option('-d, --debug', 'Enable verbose logging')
  .option('-c, --config <path>', 'Path to flow.config.json', './flow.config.json')
  .option('--dry-run', 'Show what would be done without executing')

// flow init - Initialize flow configuration
program
  .command('init')
  .description('Initialize flow configuration in current project')
  .option('--env-name <name>', 'Name for the initial environment', 'development')
  .option('--db-url <url>', 'Database connection string')
  .option('--migrations-path <path>', 'Path to the migrations folder')
  .option('-y, --yes', 'Skip interactive prompts and use default or provided values')
  .action(async (options) => {
    intro('🌊 DriftJS Flow - Initialize')
    await handleCommand(initCommand(options, program.opts() as any));
    outro('✅ Flow configuration initialized successfully!')
  })

// flow sync
program
  .command('sync')
  .description('Analyse schema and create migration plan')
  .option('-f, --force', 'Force re-analysis of existing migrations even if no schema changes detected')
  .option('--orm <type>', 'Specify ORM type (prisma|drizzle|typeorm|auto)', 'auto')
  .action(async (options) => {
    intro('🌊 DriftJS Flow - Sync')
    await handleCommand(syncCommand(options, program.opts() as any));
    outro('✅ Sync completed')
  })

// flow apply
program
  .command('apply')
  .description('Apply pending migrations to the database')
  .option('--migration <name>', 'Apply a specific migration by name')
  .option('--target <name>', 'Apply migrations up to and including the target migration')
  .action(async (options) => {
    intro('🌊 DriftJS Flow - Apply')
    await handleCommand(applyCommand(options, program.opts() as any));
    outro('✅ Apply completed')
  })

// flow back
program
  .command('back')
  .description('Rollback the latest migration batch')
  .option('--steps <n>', 'Number of migrations to rollback', '1')
  .option('--to <name>', 'Rollback to a specific migration (exclusive)')
  .action(async (options) => {
    intro('🌊 DriftJS Flow - Rollback')
    // Convert steps to number
    if (options.steps) {
      options.steps = parseInt(options.steps, 10)
    }
    await handleCommand(backCommand(options, program.opts() as any));
    outro('✅ Rollback completed')
  })

// flow test (internal)
program
  .command('test')
  .description('Run internal diagnostics')
  .action(testCommand as any)

// Execute the CLI
program.parse() 