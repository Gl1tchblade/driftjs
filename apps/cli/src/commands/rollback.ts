
/**
 * flow rollback - Generate a script to undo a migration
 */
import { intro, outro } from '@clack/prompts';
import { getFlowConfig, GlobalOptions } from '../lib/config.js';
import { createSpinner } from '../lib/prompts.js';
import fs from 'fs-extra';
import path from 'node:path';
import pc from 'picocolors';
import { EnhancementEngine } from '../core/enhancement-engine.js';

export interface RollbackOptions {
  file?: string;
  project?: string;
}

export async function rollbackCommand(options: RollbackOptions, globalOptions: GlobalOptions): Promise<void> {
  const projectPath = options.project ? path.resolve(options.project) : process.cwd();
  const cfg = await getFlowConfig(globalOptions, projectPath);
  const envCfg = cfg.environments[cfg.defaultEnvironment];
  const migrationsDir = envCfg.migrationsPath || './migrations';
  const absoluteMigrationsDir = path.resolve(projectPath, migrationsDir);

  let migrationFile = options.file;

  if (!migrationFile) {
    const files = await fs.readdir(absoluteMigrationsDir);
    const migrationFiles = files.filter(file => file.endsWith('.sql')).sort();
    if (migrationFiles.length === 0) {
      console.log(pc.yellow('No migration files found.'));
      return;
    }
    migrationFile = migrationFiles[migrationFiles.length - 1];
  }

  const filePath = path.join(absoluteMigrationsDir, migrationFile);
  if (!await fs.pathExists(filePath)) {
    console.log(pc.red(`File not found: ${filePath}`));
    return;
  }

  const content = await fs.readFile(filePath, 'utf-8');
  const engine = new EnhancementEngine();

  intro('⏪ Generating Rollback Script');

  const rollbackScript = await engine.generateRollback({
    path: filePath,
    name: migrationFile,
    up: content,
    down: '',
    timestamp: new Date(),
    operations: [],
    checksum: '',
  });

  console.log(pc.bold(`
Rollback script for ${migrationFile}:
`));
  console.log(pc.cyan(rollbackScript));

  outro('⏪ Rollback script generated.');
}
