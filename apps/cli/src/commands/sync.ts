/**
 * flow sync - Detect ORM changes and create enhanced migration plan
 */

import { confirm, select } from '@clack/prompts'
import { getFlowConfig, GlobalOptions } from '../lib/config.js'
import { createSpinner } from '../lib/prompts.js'
import { PrismaDetector, DrizzleDetector, TypeORMDetector } from '@driftjs/analyzer'
import { EnhancementEngine } from '@driftjs/enhancer'
import fs from 'fs-extra'
import path from 'node:path'
import { diffChars } from 'diff'
import pc from 'picocolors'
import { exec } from 'node:child_process'
import { promisify } from 'node:util'

const execAsync = promisify(exec)

export interface SyncOptions {
  force?: boolean
  orm?: 'prisma' | 'drizzle' | 'typeorm' | 'auto'
}

export async function syncCommand(options: SyncOptions, globalOptions: GlobalOptions): Promise<void> {
  const spinner = createSpinner('Detecting ORM setup and analyzing schema changes...')
  
  const cfg = await getFlowConfig(globalOptions)
  const envCfg = cfg.environments[cfg.defaultEnvironment]
  const projectPath = process.cwd()
  
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
    await handleSchemaChanges(detectedORM, ormConfig, absoluteMigrationsDir, globalOptions)
  } else {
    spinner.update('Analyzing existing migrations for enhancements...')
    await enhanceExistingMigrations(absoluteMigrationsDir, globalOptions)
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
      await execAsync('npx prisma migrate status', { cwd: projectPath })
      try {
        const { stdout } = await execAsync('npx prisma migrate diff --from-migrations ./prisma/migrations --to-schema-datamodel ./prisma/schema.prisma', { cwd: projectPath })
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
    try {
        await execAsync('npx drizzle-kit check', { cwd: projectPath });
        return false;
    } catch (error: any) {
        if (error.code === 1) {
            return true;
        }
        console.warn('drizzle-kit check failed, falling back to file-based change detection.');
        const schemaFiles = [ 'src/db/schema.ts', 'src/schema.ts', 'db/schema.ts', 'schema.ts', 'src/lib/db/schema.ts' ];
        const migrationsDir = config?.outDir || './drizzle';
        const migrationsDirPath = path.join(projectPath, migrationsDir);

        if (!await fs.pathExists(migrationsDirPath)) return true;

        for (const schemaFile of schemaFiles) {
            const schemaPath = path.join(projectPath, schemaFile);
            if (await fs.pathExists(schemaPath)) {
                const schemaStats = await fs.stat(schemaPath);
                const migrationFiles = await fs.readdir(migrationsDirPath);
                const sqlFiles = migrationFiles.filter(f => f.endsWith('.sql'));

                if (sqlFiles.length === 0) return true;

                const latestMigration = sqlFiles.sort().pop();
                const latestMigrationPath = path.join(migrationsDirPath, latestMigration!);
                const migrationStats = await fs.stat(latestMigrationPath);

                if (schemaStats.mtime > migrationStats.mtime) {
                    return true;
                }
            }
        }
        return false;
    }
}

async function checkTypeORMChanges(config: any, projectPath: string): Promise<boolean> {
  try {
    try {
      const { stdout } = await execAsync('npx typeorm migration:show', { cwd: projectPath })
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

async function handleSchemaChanges(orm: string, config: any, migrationsDir: string, globalOptions: GlobalOptions): Promise<void> {
  const migrationName = `flow_change_${Date.now()}`
  let generateCmd = ''

  switch (orm) {
    case 'prisma':
      generateCmd = `npx prisma migrate dev --name ${migrationName}`
      break
    case 'drizzle':
      generateCmd = `npx drizzle-kit generate`
      if (config?.driver === 'mysql2') {
        generateCmd += ' --dialect=mysql'
      } else if (config?.driver === 'pg') {
        generateCmd += ' --dialect=postgresql'
      } else {
        generateCmd += ' --dialect=sqlite'
      }
      break
    case 'typeorm':
      const migPath = path.join(migrationsDir, migrationName)
      generateCmd = `npx typeorm migration:generate ${migPath}`
      break
  }

  const spinner = createSpinner(`Running ${orm} to generate migration...`)
  try {
    const { stdout, stderr } = await execAsync(generateCmd, { cwd: process.cwd() })
    if (globalOptions.debug) {
      console.log(stdout)
      if (stderr) console.error(pc.yellow(stderr))
    }
    spinner.succeed('ORM migration generated successfully.')
    await enhanceExistingMigrations(migrationsDir, globalOptions)
  } catch (error: any) {
    spinner.fail('Migration generation failed.')
    console.error(pc.red(error.stderr || error.message))
    console.log(pc.yellow(`Could not automatically generate migration. Please run the following command manually:\n${generateCmd}`))
  }
}

async function enhanceExistingMigrations(migrationsDir: string, globalOptions: GlobalOptions): Promise<void> {
    const spinner = createSpinner('Analyzing migrations for enhancements...')
    if (!await fs.pathExists(migrationsDir)) {
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

    const engine = new EnhancementEngine();

    for (const file of migrationFiles) {
        spinner.update(`Analyzing ${file}...`)
        const filePath = path.join(migrationsDir, file);
        const content = await fs.readFile(filePath, 'utf-8');
        const sql = extractSQLFromMigrationFile(content);
        
        const migrationFile: any = {
          path: filePath,
          name: file,
          up: sql,
          down: '',
          timestamp: new Date(),
          operations: [],
          checksum: '',
        };

        const enhanced = await engine.enhance(migrationFile);

        if (enhanced.original.up !== enhanced.enhanced.up) {
            const originalColor = (text: string) => pc.red(`- ${text}`);
            const enhancedColor = (text: string) => pc.green(`+ ${text}`);
            const diff = diffChars(enhanced.original.up, enhanced.enhanced.up);
            let diffOutput = '';
            diff.forEach(part => {
                const color = part.added ? enhancedColor : part.removed ? originalColor : pc.gray;
                diffOutput += color(part.value);
            });
            console.log(pc.bold(`\nEnhancements for ${file}:`))
            console.log(diffOutput)

            const proceed = await confirm({ message: `Apply these enhancements to ${file}?` })

            if (proceed) {
                try {
                    const newContent = await replaceEnhancedSQLInMigrationFile(filePath, enhanced.enhanced.up, enhanced.enhanced.down);
                    await fs.writeFile(filePath, newContent, 'utf-8');
                    console.log(pc.green(`✅ Updated ${file}`))
                } catch (error) {
                    console.log(pc.yellow(`⚠️  Could not automatically update ${file}: ${error}`))
                    console.log(pc.gray('Enhanced UP SQL:'))
                    console.log(enhanced.enhanced.up)
                    if (enhanced.enhanced.down) {
                        console.log(pc.gray('Enhanced DOWN SQL:'))
                        console.log(enhanced.enhanced.down)
                    }
                }
            } else {
                console.log(pc.gray(`Skipped ${file}`))
            }
        } else {
            console.log(pc.gray('No enhancements needed.'))
        }
    }
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

    updatedContent = updatedContent.replace(/queryRunner\.query\s*\(\s*[`"']([^`"']+)[`"']/g, `queryRunner.query(\`${upSQL.trim()}\`)`);
    updatedContent = updatedContent.replace(/sql\s*`([^`]+)`/g, `sql\`${upSQL.trim()}\``);
    updatedContent = updatedContent.replace(/"((?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)[^"]+)"/gi, `"${upSQL.trim()}"`);

    if (downSQL) {
        updatedContent = updatedContent.replace(/(public async down\(.*?\): Promise<void> \{[\s\S]*?queryRunner\.query\s*\(\s*[`"'])([^`"']+)([`"'])/, `$1${downSQL.trim()}$3`);
    }

    return updatedContent;
}
