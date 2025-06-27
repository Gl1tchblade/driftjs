
/**
 * flow plan - Show what enhance would do to a file
 */
import { intro, outro } from '@clack/prompts';
import { getFlowConfig, GlobalOptions } from '../lib/config.js';
import { createSpinner } from '../lib/prompts.js';
import fs from 'fs-extra';
import path from 'node:path';
import pc from 'picocolors';
import { EnhancementEngine } from '../core/enhancement-engine.js';
import { diffChars } from 'diff';

export interface PlanOptions {
  file?: string;
  project?: string;
}

export async function planCommand(options: PlanOptions, globalOptions: GlobalOptions): Promise<void> {
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

  intro('📝 Planning Enhancement');

  const migration = {
    path: filePath,
    name: migrationFile,
    up: content,
    down: '',
    timestamp: new Date(),
    operations: [],
    checksum: '',
  };

  const safetyEnhancements = await engine.detectSafetyEnhancements(migration);
  const speedEnhancements = await engine.detectSpeedEnhancements(migration);

  const allEnhancements = [...safetyEnhancements, ...speedEnhancements];

  if (allEnhancements.length > 0) {
    const newContent = await engine.applyEnhancements(content, migration, allEnhancements);
    const diff = diffChars(content, newContent);

    console.log(pc.bold(`
Changes for ${migrationFile}:
`));

    diff.forEach(part => {
      const color = part.added ? pc.green : part.removed ? pc.red : pc.gray;
      process.stdout.write(color(part.value));
    });

    console.log();
  } else {
    console.log(pc.green('✅ No enhancements to apply.'));
  }

  outro('📝 Plan complete.');
}
