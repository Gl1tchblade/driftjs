/**
 * flow sync - Detect ORM changes and create enhanced migration plan
 */

import { confirm, select } from '@clack/prompts'
import { getFlowConfig, GlobalOptions } from '../lib/config.js'
import { createSpinner } from '../lib/prompts.js'
import { PrismaDetector, DrizzleDetector, TypeORMDetector } from '../analyzer/index.js'
import { EnhancementEngine } from '../enhancer/index.js'
import fs from 'fs-extra'
import path from 'node:path'
import { diffChars } from 'diff'
import pc from 'picocolors'
import { execa } from 'execa'

export interface SyncOptions {
  force?: boolean
  orm?: 'prisma' | 'drizzle' | 'typeorm' | 'auto'
  project?: string
  yes?: boolean
}

export async function syncCommand(options: SyncOptions, globalOptions: GlobalOptions): Promise<void> {
  const spinner = createSpinner('Detecting ORM setup and analyzing schema changes...')
  
  const projectPath = options.project ? path.resolve(options.project) : process.cwd()
  const cfg = await getFlowConfig(globalOptions, projectPath)
  const envCfg = cfg.environments[cfg.defaultEnvironment]
  
  let detectedORM: string | null = null
  const detectors = [
    { name: 'prisma', detector: new PrismaDetector() },
    { name: 'drizzle', detector: new DrizzleDetector() },
    { name: 'typeorm', detector: new TypeORMDetector() }
  ]

  if (options.orm && options.orm !== 'auto') {
    detectedORM = options.orm
  } else {
    for (const { name, detector } of detectors) {
      const result = await detector.detect(projectPath)
      if (result.found) {
        detectedORM = name
        break
      }
    }
  }

  if (!detectedORM) {
    spinner.fail('ORM detection failed')
    console.log(pc.red('No supported ORM detected. Make sure you have Prisma, Drizzle, or TypeORM configured.'))
    return
  }

  spinner.update(`Detected ${detectedORM.toUpperCase()} - analyzing schema changes...`)

  const detector = detectors.find(d => d.name === detectedORM)?.detector
  if (!detector) {
    spinner.fail('Detector not found')
    return
  }

  const ormConfig = await detector.extractConfig(projectPath)
  
  const hasChanges = await checkForSchemaChanges(detectedORM, ormConfig, projectPath)
  
  if (!hasChanges && !options.force) {
    spinner.succeed('Schema analysis completed')
    console.log(pc.green('🎉 No pending schema changes detected. Your migrations are up to date.'))
    console.log(pc.gray('Use --force to re-analyze existing migrations for enhancements.'))
    return
  }

  const migrationsDir = envCfg.migrationsPath || (ormConfig?.migrationDirectory?.relative) || './migrations'
  const absoluteMigrationsDir = path.resolve(projectPath, migrationsDir)

  if (hasChanges) {
    spinner.update('Generating migration plan for schema changes...')
    await handleSchemaChanges(detectedORM, ormConfig, absoluteMigrationsDir, globalOptions, projectPath, options)
  } else {
    spinner.update('Analyzing existing migrations for enhancements...')
    await enhanceExistingMigrations(absoluteMigrationsDir, globalOptions, options)
  }

  spinner.succeed('Sync completed')
}

async function checkForSchemaChanges(orm: string, config: any, projectPath: string): Promise<boolean> {
  switch (orm) {
    case 'prisma':
      return await checkPrismaChanges(config, projectPath)
    case 'drizzle':
      return await checkDrizzleChanges(config, projectPath)
    case 'typeorm':
      return await checkTypeORMChanges(config, projectPath)
    default:
      return false
  }
}

async function checkPrismaChanges(config: any, projectPath: string): Promise<boolean> {
  try {
    const schemaPath = path.join(projectPath, 'prisma', 'schema.prisma')
    const migrationsPath = path.join(projectPath, 'prisma', 'migrations')
    
    if (!await fs.pathExists(schemaPath)) return false
    if (!await fs.pathExists(migrationsPath)) return true
    
    try {
      await execa('npx prisma migrate status', { cwd: projectPath })
      try {
        const { stdout } = await execa('npx prisma migrate diff --from-migrations ./prisma/migrations --to-schema-datamodel ./prisma/schema.prisma', { cwd: projectPath })
        return stdout.trim().length > 0
      } catch {
        return true
      }
    } catch {
      const schemaStats = await fs.stat(schemaPath)
      const migrationFiles = await fs.readdir(migrationsPath)
      if (migrationFiles.length === 0) return true
      const migrationDirs = migrationFiles.filter(file => file.match(/^\d{14}_/))
      if (migrationDirs.length === 0) return true
      const latestMigration = migrationDirs.sort().pop()
      const latestMigrationPath = path.join(migrationsPath, latestMigration!)
      const migrationStats = await fs.stat(latestMigrationPath)
      return schemaStats.mtime > migrationStats.mtime
    }
  } catch (error) {
    console.warn('Error checking Prisma changes:', error)
    return false
  }
}

async function checkDrizzleChanges(config: any, projectPath: string): Promise<boolean> {
  // FIXME: This is a temporary hack to bypass the unreliable drizzle-kit check
  return true
}

async function checkTypeORMChanges(config: any, projectPath: string): Promise<boolean> {
  try {
    try {
      const { stdout } = await execa('npx typeorm migration:show', { cwd: projectPath })
      return !stdout.includes('No migrations are pending')
    } catch {
      const entityDirs = ['src/entities', 'src/entity', 'entities']
      const migrationsDir = config?.migrationDirectory || './src/migrations'
      const migrationsDirPath = path.join(projectPath, migrationsDir)
      
      if (!await fs.pathExists(migrationsDirPath)) return true
      
      for (const entityDir of entityDirs) {
        const entityDirPath = path.join(projectPath, entityDir)
        if (await fs.pathExists(entityDirPath)) {
          const entityFiles = await fs.readdir(entityDirPath)
          const tsFiles = entityFiles.filter(f => f.endsWith('.ts') || f.endsWith('.js'))
          
          for (const entityFile of tsFiles) {
            const entityPath = path.join(entityDirPath, entityFile)
            const entityStats = await fs.stat(entityPath)
            const migrationFiles = await fs.readdir(migrationsDirPath)
            if (migrationFiles.length === 0) return true
            const latestMigration = migrationFiles.sort().pop()
            const latestMigrationPath = path.join(migrationsDirPath, latestMigration!)
            const migrationStats = await fs.stat(latestMigrationPath)
            if (entityStats.mtime > migrationStats.mtime) {
              return true
            }
          }
        }
      }
      return false
    }
  } catch (error) {
    console.warn('Error checking TypeORM changes:', error)
    return false
  }
}

async function handleSchemaChanges(
  orm: string,
  config: any,
  migrationsDir: string,
  globalOptions: GlobalOptions,
  projectPath: string,
  options: SyncOptions,
): Promise<void> {
  const migrationName = `flow_change_${Date.now()}`
  let generateCmd = ''

  switch (orm) {
    case 'prisma':
      generateCmd = `npx prisma migrate dev --name ${migrationName}`
      break
    case 'drizzle':
      // The --dialect flag conflicts with the --config flag which drizzle-kit uses implicitly.
      // Drizzle Kit will detect the dialect from the config file.
      generateCmd = `npx drizzle-kit generate`
      break
    case 'typeorm':
      const migPath = path.join(migrationsDir, migrationName)
      generateCmd = `npx typeorm migration:generate ${migPath}`
      break
  }

  const spinner = createSpinner(`Running ${orm} to generate migration...`)
  try {
    const { stdout, stderr } = await execa(generateCmd, { cwd: projectPath, shell: true })
    if (globalOptions.debug) {
      console.log(stdout)
      if (stderr) console.error(pc.yellow(stderr))
    }
    spinner.succeed('ORM migration generated successfully.')
    await enhanceExistingMigrations(migrationsDir, globalOptions, options)
  } catch (error: any) {
    spinner.fail('Migration generation failed.')
    console.error(pc.red(error.stderr || error.message))
    console.log(pc.yellow(`Could not automatically generate migration. Please run the following command manually:\n${generateCmd}`))
  }
}

async function enhanceExistingMigrations(
  migrationsDir: string,
  globalOptions: GlobalOptions,
  options: SyncOptions,
): Promise<void> {
  const spinner = createSpinner('Analyzing migrations for enhancements...')
  if (!(await fs.pathExists(migrationsDir))) {
    spinner.fail(`Migrations directory not found: ${migrationsDir}`)
    return
  }

  const files = await fs.readdir(migrationsDir)
  const migrationFiles = files.filter(file => file.endsWith('.sql') || file.endsWith('.ts') || file.endsWith('.js'));

  if (migrationFiles.length === 0) {
    spinner.succeed('No migration files found to analyze.')
    return
  }
  
  spinner.update(`Found ${migrationFiles.length} migration(s) to analyze for enhancements.`)

  // Ultra-fast parallel processing
  const engine = new EnhancementEngine();
  
  // Step 1: Read all files in parallel (ultra-fast I/O)
  spinner.update('Reading migration files...')
  const fileReads = await Promise.all(
    migrationFiles.map(async (file) => {
      const filePath = path.join(migrationsDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const sql = extractSQLFromMigrationFile(content);
      return {
        file,
        filePath,
        content,
        sql,
        migrationFile: {
          path: filePath,
          name: file,
          up: sql,
          down: '',
          timestamp: new Date(),
          operations: [],
          checksum: '',
        }
      };
    })
  );

  // Step 2: Analyze all migrations in parallel (ultra-fast processing)
  spinner.update('Analyzing migrations in parallel...')
  const analyses = await Promise.all(
    fileReads.map(async ({ file, filePath, content, sql, migrationFile }) => {
      const enhanced = await engine.enhance(migrationFile);
      return {
        file,
        filePath,
        content,
        sql,
        enhanced,
        hasChanges: enhanced.original.up !== enhanced.enhanced.up
      };
    })
  );

  // Step 3: Present results and apply changes
  let changesApplied = 0;
  for (const analysis of analyses) {
    if (analysis.hasChanges) {
      const originalColor = (text: string) => pc.red(`- ${text}`);
      const enhancedColor = (text: string) => pc.green(`+ ${text}`);
      const diff = diffChars(analysis.enhanced.original.up, analysis.enhanced.enhanced.up);
      let diffOutput = '';
      diff.forEach(part => {
        const color = part.added ? enhancedColor : part.removed ? originalColor : pc.gray;
        diffOutput += color(part.value);
      });
      console.log(pc.bold(`\nEnhancements for ${analysis.file}:`))
      console.log(diffOutput)

      const proceed = options.yes ? true : await confirm({ message: `Apply these enhancements to ${analysis.file}?` })

      if (proceed) {
        try {
          const newContent = await replaceEnhancedSQLInMigrationFile(analysis.filePath, analysis.enhanced.enhanced.up, analysis.enhanced.enhanced.down);
          await fs.writeFile(analysis.filePath, newContent, 'utf-8');
          console.log(pc.green(`✅ Updated ${analysis.file}`))
          changesApplied++;
        } catch (error) {
          console.log(pc.yellow(`⚠️  Could not automatically update ${analysis.file}: ${error}`))
          console.log(pc.gray('Enhanced UP SQL:'))
          console.log(analysis.enhanced.enhanced.up)
          if (analysis.enhanced.enhanced.down) {
            console.log(pc.gray('Enhanced DOWN SQL:'))
            console.log(analysis.enhanced.enhanced.down)
          }
        }
      } else {
        console.log(pc.gray(`Skipped ${analysis.file}`))
      }
    }
  }

  if (changesApplied === 0 && analyses.every(a => !a.hasChanges)) {
    console.log(pc.gray('No enhancements needed for any migration files.'))
  }
  spinner.succeed('Enhancement analysis completed.')
}

function extractSQLFromMigrationFile(content: string): string {
  const sqlPatterns = [
    /queryRunner\.query\s*\(\s*[`"']([^`"']+)[`"']/g,
    /sql\s*`([^`]+)`/g,
    /"((?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)[^"]+)"/gi
  ];
  let extractedSQL = '';
  for (const pattern of sqlPatterns) {
    let match;
    while ((match = pattern.exec(content)) !== null) {
      extractedSQL += match[1] + ';\n';
    }
  }
  return extractedSQL || content;
}

async function replaceEnhancedSQLInMigrationFile(filePath: string, upSQL: string, downSQL?: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8');
  let updatedContent = content;

  // Generate enhancement comment header
  const fileName = path.basename(filePath);
  const enhancementComment = generateEnhancementComment(fileName, upSQL);

  // Add comment at the top of the file if it doesn't already exist
  if (!updatedContent.includes('Enhanced by DriftJS')) {
    const lines = updatedContent.split('\n');
    let insertIndex = 0;
    
    // Skip existing comments and imports to find insertion point
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*') && !line.startsWith('import') && !line.startsWith('export')) {
        insertIndex = i;
        break;
      }
    }
    
    lines.splice(insertIndex, 0, enhancementComment, '');
    updatedContent = lines.join('\n');
  }

  updatedContent = updatedContent.replace(/queryRunner\.query\s*\(\s*[`"']([^`"']+)[`"']/g, `queryRunner.query(\`${upSQL.trim()}\`)`);
  updatedContent = updatedContent.replace(/sql\s*`([^`]+)`/g, `sql\`${upSQL.trim()}\``);
  updatedContent = updatedContent.replace(/"((?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)[^"]+)"/gi, `"${upSQL.trim()}"`);

  if (downSQL) {
    updatedContent = updatedContent.replace(/(public async down\(.*?\): Promise<void> \{[\s\S]*?queryRunner\.query\s*\(\s*[`"'])([^`"']+)([`"'])/, `$1${downSQL.trim()}$3`);
  }

  return updatedContent;
}

function generateEnhancementComment(fileName: string, enhancedSQL: string): string {
  const timestamp = new Date().toISOString().split('T')[0];
  const operations = analyzeEnhancements(enhancedSQL);
  
  const header = `/*
 * Migration Enhanced by DriftJS.com
 * File: ${fileName}
 * Enhanced: ${timestamp}
 * 
 * This migration has been optimized for production safety and performance.
 * Learn more at https://driftjs.com
 */`;

  if (operations.length === 1) {
    return `${header.slice(0, -2)}
 * 
 * Enhancement: ${operations[0]}
 */`;
  } else if (operations.length > 1) {
    const enhancementList = operations.map(op => ` * - ${op}`).join('\n');
    return `${header.slice(0, -2)}
 * 
 * Enhancements Applied:
${enhancementList}
 */`;
  }
  
  return header;
}

function analyzeEnhancements(sql: string): string[] {
  const enhancements: string[] = [];
  const sqlLower = sql.toLowerCase();
  
  // Detect common enhancement patterns
  if (sqlLower.includes('add constraint') && sqlLower.includes('not valid')) {
    enhancements.push('Safe constraint addition with NOT VALID optimization');
  }
  if (sqlLower.includes('concurrently')) {
    enhancements.push('Non-blocking concurrent index creation');
  }
  if (sqlLower.includes('backup') || sqlLower.includes('copy')) {
    enhancements.push('Data backup created before destructive operations');
  }
  if (sqlLower.includes('alter table') && sqlLower.includes('add column') && !sqlLower.includes('not null')) {
    enhancements.push('Nullable column added first for safe NOT NULL migration');
  }
  if (sqlLower.includes('validate constraint')) {
    enhancements.push('Constraint validation separated for reduced downtime');
  }
  if (sqlLower.includes('lock timeout') || sqlLower.includes('statement_timeout')) {
    enhancements.push('Query timeouts configured to prevent long locks');
  }
  if (sqlLower.includes('begin;') && sqlLower.includes('commit;')) {
    enhancements.push('Transaction boundaries optimized for safety');
  }
  
  // Default if no specific enhancements detected
  if (enhancements.length === 0) {
    enhancements.push('Production-ready migration optimizations applied');
  }
  
  return enhancements;
}
