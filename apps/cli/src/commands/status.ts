
/**
 * flow status - Show the status of all migrations
 */
import { intro, outro } from '@clack/prompts';
import { getFlowConfig, GlobalOptions } from '../lib/config.js';
import fs from 'fs-extra';
import path from 'node:path';
import pc from 'picocolors';

export interface StatusOptions {
  project?: string;
}

export async function statusCommand(options: StatusOptions, globalOptions: GlobalOptions): Promise<void> {
  const projectPath = options.project ? path.resolve(options.project) : process.cwd();
  const cfg = await getFlowConfig(globalOptions, projectPath);
  const envCfg = cfg.environments[cfg.defaultEnvironment];
  const migrationsDir = envCfg.migrationsPath || './migrations';
  const absoluteMigrationsDir = path.resolve(projectPath, migrationsDir);

  intro('📊 Migration Status');

  if (!await fs.pathExists(absoluteMigrationsDir)) {
    console.log(pc.yellow('Migrations directory not found.'));
    return;
  }

  const files = await fs.readdir(absoluteMigrationsDir);
  const migrationFiles = files.filter(file => file.endsWith('.sql')).sort();

  if (migrationFiles.length === 0) {
    console.log(pc.yellow('No migration files found.'));
  } else {
    console.log(pc.bold('Found migrations:'));
    migrationFiles.forEach(file => {
      console.log(`  - ${pc.cyan(file)}`);
    });
  }

  outro('📊 Status check complete.');
}
