/**
 * flow enhance - Interactively enhance a migration file
 * This is the most important command - implements the interactive enhancement flow
 */

import { confirm, log } from '@clack/prompts';
import { getFlowConfig, GlobalOptions } from '../lib/config.js';
import { createFlowSpinner, displaySuccess, displayError, displayInfo, displayWarning } from '../lib/prompts.js';
import fs from 'fs-extra';
import path from 'node:path';
import pc from 'picocolors';
import { EnhancementEngine } from '../core/enhancement-engine.js';
import { findLatestMigration, parseMigrationFile, validateMigrationPath } from '../core/migration-utils.js';

export interface EnhanceOptions {
  file?: string;
  project?: string;
}

export async function enhanceCommand(options: EnhanceOptions, globalOptions: GlobalOptions): Promise<void> {
  // Create a shared spinner instance for better performance
  const spinner = createFlowSpinner();
  
  try {
    const projectPath = options.project ? path.resolve(options.project) : process.cwd();
    const cfg = await getFlowConfig(globalOptions, projectPath);
    const envCfg = cfg.environments[cfg.defaultEnvironment];
    const migrationsDir = envCfg.migrationsPath || './migrations';
    const absoluteMigrationsDir = path.resolve(projectPath, migrationsDir);

    let migrationFile = options.file;

    // If no file specified, automatically operate on the latest migration file
    if (!migrationFile) {
      const latestFile = await findLatestMigration(absoluteMigrationsDir);
      if (!latestFile) {
        displayError('No migration files found', [`Directory: ${absoluteMigrationsDir}`]);
        return;
      }
      migrationFile = latestFile;
      displayInfo(`Operating on latest migration: ${pc.cyan(migrationFile)}`);
    }

    // Validate and resolve the migration file path
    let filePath: string;
    try {
      filePath = await validateMigrationPath(migrationFile, absoluteMigrationsDir);
    } catch (error) {
      displayError('Migration file validation failed', [error instanceof Error ? error.message : 'Migration file not found']);
      return;
    }

    // Parse the migration file with performance optimization
    const loadSpinner = spinner.start('Loading migration file...');
    let migration, engine;
    
    try {
      [migration, engine] = await Promise.all([
        parseMigrationFile(filePath),
        new Promise(resolve => {
          const eng = new EnhancementEngine();
          resolve(eng);
        })
      ]);
      loadSpinner.succeed('Migration file loaded successfully');
    } catch (error) {
      loadSpinner.fail('Failed to load migration file');
      displayError('Parse error', [error instanceof Error ? error.message : 'Unknown error']);
      return;
    }

    log.info(''); // Empty line for spacing
    displayInfo(`🚀 Starting Enhancement Process for ${pc.bold(migration.name)}`);
    log.info(''); // Empty line for spacing

    // Phase 1: Safety Enhancements
    log.info(pc.bold(pc.blue('━━━ Phase 1: Safety Enhancements ━━━')));
    const safetySpinner = spinner.start('Scanning for safety issues...');
    
    try {
      const safetyEnhancements = await (engine as any).detectSafetyEnhancements(migration);
      
      if (safetyEnhancements.length > 0) {
        safetySpinner.succeed(`Found ${safetyEnhancements.length} safety issue(s)`);
        
        // List all safety issues with explanations
        for (const enhancement of safetyEnhancements) {
          const analysis = await (engine as any).getEnhancementAnalysis(enhancement.id, migration);
          if (analysis && analysis.issues.length > 0) {
            displayWarning(`${enhancement.name}`, [enhancement.description]);
            for (const issue of analysis.issues) {
              log.info(`    ${pc.red('⚠')} ${issue.description} ${pc.gray(`(line ${issue.line})`)}`);
              log.info(`    ${pc.gray('→ ' + issue.recommendation)}`);
            }
            log.info(''); // Spacing
          } else {
            displayInfo(`${enhancement.name}`, [enhancement.description]);
          }
        }
        
        // Ask user if they want to apply safety enhancements (default to Yes)
        const applySafety = await confirm({
          message: pc.cyan('Apply recommended safety enhancements?'),
          initialValue: true,
        });
        
        if (applySafety) {
          const applySpinner = spinner.start('Applying safety enhancements...');
          try {
            const enhancedContent = await (engine as any).applyEnhancements(migration.up, migration, safetyEnhancements);
            await fs.writeFile(filePath, enhancedContent, 'utf-8');
            
            // Update migration object for next phase
            migration.up = enhancedContent;
            
            applySpinner.succeed('Safety enhancements applied successfully');
            displaySuccess('Safety improvements completed', [`Applied ${safetyEnhancements.length} enhancement(s)`]);
          } catch (error) {
            applySpinner.fail('Failed to apply safety enhancements');
            displayError('Enhancement error', [error instanceof Error ? error.message : 'Unknown error']);
            return;
          }
        } else {
          displayInfo('Skipping safety enhancements');
        }
      } else {
        safetySpinner.succeed('No safety issues found - migration looks safe!');
      }
    } catch (error) {
      safetySpinner.fail('Error during safety analysis');
      displayError('Analysis failed', [error instanceof Error ? error.message : 'Unknown error']);
      return;
    }

    log.info(''); // Empty line for spacing

    // Phase 2: Speed Enhancements
    log.info(pc.bold(pc.green('━━━ Phase 2: Speed Enhancements ━━━')));
    const speedSpinner = spinner.start('Analyzing performance optimization opportunities...');
    
    try {
      const speedEnhancements = await (engine as any).detectSpeedEnhancements(migration);
      
      if (speedEnhancements.length > 0) {
        speedSpinner.succeed(`Found ${speedEnhancements.length} optimization opportunity(ies)`);
        
        // List all speed optimization opportunities
        for (const enhancement of speedEnhancements) {
          const analysis = await (engine as any).getEnhancementAnalysis(enhancement.id, migration);
          if (analysis && analysis.issues.length > 0) {
            displayInfo(`${enhancement.name}`, [enhancement.description]);
            for (const issue of analysis.issues) {
              log.info(`    ${pc.yellow('⚡')} ${issue.description} ${pc.gray(`(line ${issue.line})`)}`);
              log.info(`    ${pc.gray('→ ' + issue.recommendation)}`);
            }
            log.info(''); // Spacing
          } else {
            displayInfo(`${enhancement.name}`, [enhancement.description]);
          }
        }
        
        // Ask user if they want to apply speed enhancements
        const applySpeed = await confirm({
          message: pc.cyan('Apply recommended speed enhancements?'),
          initialValue: true,
        });
        
        if (applySpeed) {
          const applySpinner = spinner.start('Applying speed enhancements...');
          try {
            const enhancedContent = await (engine as any).applyEnhancements(migration.up, migration, speedEnhancements);
            await fs.writeFile(filePath, enhancedContent, 'utf-8');
            
            applySpinner.succeed('Speed enhancements applied successfully');
            displaySuccess('Performance optimizations completed', [`Applied ${speedEnhancements.length} enhancement(s)`]);
          } catch (error) {
            applySpinner.fail('Failed to apply speed enhancements');
            displayError('Enhancement error', [error instanceof Error ? error.message : 'Unknown error']);
            return;
          }
        } else {
          displayInfo('Skipping speed enhancements');
        }
      } else {
        speedSpinner.succeed('No speed optimizations found - migration is already optimized!');
      }
    } catch (error) {
      speedSpinner.fail('Error during speed analysis');
      displayError('Analysis failed', [error instanceof Error ? error.message : 'Unknown error']);
      return;
    }

    log.info(''); // Empty line for spacing
    displaySuccess('✨ Enhancement process completed successfully!', [
      `Enhanced migration file: ${pc.cyan(path.relative(projectPath, filePath))}`
    ]);
    
  } catch (error) {
    displayError('Enhancement command failed', [error instanceof Error ? error.message : 'Unknown error']);
  }
}
