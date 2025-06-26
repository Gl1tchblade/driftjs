/**
 * Flow CLI - Database Migration Enhancement Tool
 * Automatically enhance database migrations with safety and performance improvements
 */

import { program } from 'commander';
import { intro, outro, log } from '@clack/prompts';
import pc from 'picocolors';
import gradient from 'gradient-string';
import boxen from 'boxen';

// Import commands with lazy loading for better performance
const lazyImport = (importFn: () => Promise<any>) => {
  let cachedModule: any = null;
  return async () => {
    if (!cachedModule) {
      cachedModule = await importFn();
    }
    return cachedModule;
  };
};

const getEnhanceCommand = lazyImport(() => import('./commands/enhance.js'));
const getValidateCommand = lazyImport(() => import('./commands/validate.js'));
const getPlanCommand = lazyImport(() => import('./commands/plan.js'));
const getRollbackCommand = lazyImport(() => import('./commands/rollback.js'));
const getInitCommand = lazyImport(() => import('./commands/init.js'));
const getConfigCommand = lazyImport(() => import('./commands/config.js'));
const getStatusCommand = lazyImport(() => import('./commands/status.js'));

// Global options interface
export interface GlobalOptions {
  verbose?: boolean;
  config?: string;
  dry?: boolean;
}

// Performance: Cache the banner to avoid recomputing
let cachedBanner: string | null = null;

function getBanner(): string {
  if (cachedBanner) return cachedBanner;
  
  const flowTitle = gradient('#00D4FF', '#0099CC', '#006699')('Flow');
  const subtitle = pc.dim('Database Migration Enhancement Tool');
  
  cachedBanner = boxen(
    `${flowTitle}\n${subtitle}`,
    {
      padding: { top: 1, bottom: 1, left: 2, right: 2 },
      margin: { top: 1, bottom: 1 },
      borderStyle: 'round',
      borderColor: 'cyan',
      backgroundColor: '#001122',
      align: 'center'
    }
  );
  
  return cachedBanner!; // Non-null assertion since we just assigned it
}

function showBanner(): void {
  console.log(getBanner());
}

// Enhanced error handling with better UX
function handleError(error: any): void {
  console.error(pc.red('\n❌ Error:'), error.message || error);
  if (program.opts().verbose && error.stack) {
    console.error(pc.dim('\nStack trace:'));
    console.error(pc.dim(error.stack));
  }
  process.exit(1);
}

// Set up global error handlers
process.on('uncaughtException', handleError);
process.on('unhandledRejection', handleError);

// Configure the CLI program
program
  .name('flow')
  .description('🌊 Flow - Database Migration Enhancement Tool')
  .version('1.2.0')
  .option('-v, --verbose', 'Enable verbose output for debugging')
  .option('-c, --config <path>', 'Path to configuration file')
  .option('--dry', 'Run in dry-run mode (preview changes without applying)')
  .hook('preAction', () => {
    // Only show banner for the main commands, not help
    const command = process.argv[2];
    if (command && !['--help', '-h', '--version', '-V'].includes(command)) {
      showBanner();
    }
  });

// Main action commands - these operate on migration files
program
  .command('enhance')
  .description('🚀 Interactively enhance a migration file with safety and performance improvements')
  .argument('[file]', 'Migration file to enhance (auto-detects latest if not specified)')
  .option('-p, --project <path>', 'Path to project directory')
  .action(async (file: string | undefined, options: any) => {
    try {
      intro(pc.cyan('Starting Flow Enhancement Process'));
      const { enhanceCommand } = await getEnhanceCommand();
      await enhanceCommand({ file, project: options.project }, program.opts());
      outro(pc.green('Enhancement completed! 🎉'));
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('validate')
  .description('🔍 Validate a migration file for potential issues')
  .argument('[file]', 'Migration file to validate (auto-detects latest if not specified)')
  .option('-p, --project <path>', 'Path to project directory')
  .action(async (file: string | undefined, options: any) => {
    try {
      intro(pc.cyan('Starting Migration Validation'));
      const { validateCommand } = await getValidateCommand();
      await validateCommand({ file, project: options.project }, program.opts());
      outro(pc.green('Validation completed! ✅'));
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('plan')
  .description('📋 Plan enhancement changes for a migration file')
  .argument('[file]', 'Migration file to plan (auto-detects latest if not specified)')
  .option('-p, --project <path>', 'Path to project directory')
  .action(async (file: string | undefined, options: any) => {
    try {
      intro(pc.cyan('Creating Enhancement Plan'));
      const { planCommand } = await getPlanCommand();
      await planCommand({ file, project: options.project }, program.opts());
      outro(pc.green('Plan created! 📋'));
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('rollback')
  .description('↩️  Rollback changes to a migration file')
  .argument('[file]', 'Migration file to rollback (auto-detects latest if not specified)')
  .option('-p, --project <path>', 'Path to project directory')
  .action(async (file: string | undefined, options: any) => {
    try {
      intro(pc.cyan('Starting Rollback Process'));
      const { rollbackCommand } = await getRollbackCommand();
      await rollbackCommand({ file, project: options.project }, program.opts());
      outro(pc.green('Rollback completed! ↩️'));
    } catch (error) {
      handleError(error);
    }
  });

// Management commands - these manage the Flow tool itself
program
  .command('init')
  .description('🚀 Initialize Flow in your project')
  .option('-p, --project <path>', 'Path to project directory')
  .action(async (options: any) => {
    try {
      intro(pc.cyan('Initializing Flow'));
      const { initCommand } = await getInitCommand();
      await initCommand({ project: options.project }, program.opts());
      outro(pc.green('Flow initialized successfully! 🚀'));
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('config')
  .description('⚙️  Configure Flow settings')
  .option('-p, --project <path>', 'Path to project directory')
  .option('-s, --show', 'Show current configuration')
  .option('-e, --edit', 'Edit configuration interactively')
  .action(async (options: any) => {
    try {
      intro(pc.cyan('Managing Flow Configuration'));
      const { configCommand } = await getConfigCommand();
      await configCommand(options, program.opts());
      outro(pc.green('Configuration updated! ⚙️'));
    } catch (error) {
      handleError(error);
    }
  });

program
  .command('status')
  .description('📊 Show Flow status and statistics')
  .option('-p, --project <path>', 'Path to project directory')
  .action(async (options: any) => {
    try {
      intro(pc.cyan('Getting Flow Status'));
      const { statusCommand } = await getStatusCommand();
      await statusCommand({ project: options.project }, program.opts());
      outro(pc.green('Status retrieved! 📊'));
    } catch (error) {
      handleError(error);
    }
  });

// Show enhanced help if no arguments provided
if (process.argv.length === 2) {
  showBanner();
  console.log(pc.dim('\n💡 Tip: Run'), pc.cyan('flow --help'), pc.dim('to see available commands'));
  console.log(pc.dim('   Start with:'), pc.cyan('flow init'), pc.dim('to initialize Flow in your project'));
  console.log(pc.dim('   Then use:'), pc.cyan('flow enhance'), pc.dim('to enhance your latest migration'));
  console.log('');
}

// Parse command line arguments
program.parse(); 