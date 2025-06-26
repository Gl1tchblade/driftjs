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
  console.log() // Add space before starting
  console.log(pc.cyan('🌊 DriftJS Flow - Sync'))
  console.log() // Add space after header
  
  const projectPath = options.project ? path.resolve(options.project) : process.cwd()
  const cfg = await getFlowConfig(globalOptions, projectPath)
  const envCfg = cfg.environments[cfg.defaultEnvironment]
  
  // Step 1: ORM Detection
  const spinner = createSpinner('Detecting ORM setup...')
  
  let detectedORM: string | null = null
  const detectors = [
    { name: 'prisma', detector: new PrismaDetector() },
    { name: 'drizzle', detector: new DrizzleDetector() },
    { name: 'typeorm', detector: new TypeORMDetector() }
  ]

  if (options.orm && options.orm !== 'auto') {
    detectedORM = options.orm
    spinner.succeed(`Using specified ORM: ${pc.green(detectedORM)}`)
  } else {
    for (const { name, detector } of detectors) {
      const result = await detector.detect(projectPath)
      if (result.found) {
        detectedORM = name
        break
      }
    }
    
    if (detectedORM) {
      spinner.succeed(`Detected ORM: ${pc.green(detectedORM.toUpperCase())}`)
    } else {
      spinner.fail('No ORM detected')
      console.log()
      console.log(pc.red('✗ No supported ORM found'))
      console.log(pc.gray('  Supported ORMs: Prisma, Drizzle, TypeORM'))
      console.log(pc.gray('  Make sure you have a valid ORM configuration in your project'))
      return
    }
  }

  // Step 2: Schema Analysis
  const detector = detectors.find(d => d.name === detectedORM)?.detector
  if (!detector) {
    console.log(pc.red('✗ Detector initialization failed'))
    return
  }

  const ormConfig = await detector.extractConfig(projectPath)
  
  const analysisSpinner = createSpinner('Analyzing schema changes...')
  const hasChanges = await checkForSchemaChanges(detectedORM, ormConfig, projectPath)
  
  if (!hasChanges && !options.force) {
    analysisSpinner.succeed('Schema analysis complete')
    console.log()
    console.log(pc.green('✓ No pending schema changes detected'))
    console.log(pc.gray('  Your migrations are up to date'))
    console.log(pc.gray('  Use --force to re-analyze existing migrations'))
    return
  }

  analysisSpinner.succeed('Schema analysis complete')

  const migrationsDir = envCfg.migrationsPath || (ormConfig?.migrationDirectory?.relative) || './migrations'
  const absoluteMigrationsDir = path.resolve(projectPath, migrationsDir)

  if (hasChanges) {
    console.log()
    console.log(pc.yellow('⚠ Schema changes detected - generating migration...'))
    await handleSchemaChanges(detectedORM, ormConfig, absoluteMigrationsDir, globalOptions, projectPath, options)
  }

  // Step 3: Enhancement Analysis
  console.log()
  await enhanceExistingMigrations(absoluteMigrationsDir, globalOptions, options)
  
  console.log()
  console.log(pc.green('✓ Sync completed successfully'))
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
    return false
  }
}

async function checkDrizzleChanges(config: any, projectPath: string): Promise<boolean> {
  // For now, always return true for Drizzle as detection is complex
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
  let workingDir = projectPath

  switch (orm) {
    case 'prisma':
      generateCmd = `npx prisma migrate dev --name ${migrationName}`
      break
    case 'drizzle':
      if (config?.configFile?.absolute) {
        workingDir = path.dirname(config.configFile.absolute)
        generateCmd = `npx drizzle-kit generate`
      } else {
        generateCmd = `npx drizzle-kit generate`
      }
      break
    case 'typeorm':
      const migPath = path.join(migrationsDir, migrationName)
      generateCmd = `npx typeorm migration:generate ${migPath}`
      break
  }

  const spinner = createSpinner('Generating migration...')
  try {
    const { stdout, stderr } = await execa(generateCmd, { cwd: workingDir, shell: true })
    if (globalOptions.debug) {
      console.log(stdout)
      if (stderr) console.error(pc.yellow(stderr))
    }
    spinner.succeed('Migration generated successfully')
  } catch (error: any) {
    spinner.fail('Migration generation failed')
    console.log()
    console.log(pc.red('✗ Failed to generate migration'))
    console.log(pc.gray(`  Error: ${error.stderr || error.message}`))
    console.log()
    console.log(pc.yellow('⚠ Please run this command manually:'))
    console.log(pc.cyan(`  ${generateCmd}`))
    return
  }
}

async function enhanceExistingMigrations(
  migrationsDir: string,
  globalOptions: GlobalOptions,
  options: SyncOptions,
): Promise<void> {
  const spinner = createSpinner('Analyzing migrations...')
  
  if (!(await fs.pathExists(migrationsDir))) {
    spinner.fail('Migrations directory not found')
    console.log()
    console.log(pc.red('✗ Migrations directory not found'))
    console.log(pc.gray(`  Looking for: ${migrationsDir}`))
    return
  }

  const files = await fs.readdir(migrationsDir)
  const migrationFiles = files.filter(file => file.endsWith('.sql') || file.endsWith('.ts') || file.endsWith('.js'))

  if (migrationFiles.length === 0) {
    spinner.succeed('Analysis complete')
    console.log()
    console.log(pc.gray('• No migration files found to analyze'))
    return
  }
  
  spinner.succeed(`Found ${migrationFiles.length} migration file(s)`)

  // Analyze migrations
  const engine = new EnhancementEngine()
  const analysisSpinner = createSpinner('Analyzing enhancement opportunities...')
  
  const fileReads = await Promise.all(
    migrationFiles.map(async (file) => {
      const filePath = path.join(migrationsDir, file)
      const content = await fs.readFile(filePath, 'utf-8')
      const sql = extractSQLFromMigrationFile(content)
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
      }
    })
  )

  const analyses = await Promise.all(
    fileReads.map(async ({ file, filePath, content, sql, migrationFile }) => {
      const enhanced = await engine.enhance(migrationFile)
      return {
        file,
        filePath,
        content,
        sql,
        enhanced,
        hasChanges: enhanced.original.up !== enhanced.enhanced.up
      }
    })
  )

  analysisSpinner.succeed('Enhancement analysis complete')

  // Display and apply enhancements
  let changesApplied = 0
  const enhancementsFound = analyses.filter(a => a.hasChanges)
  
  if (enhancementsFound.length === 0) {
    console.log()
    console.log(pc.gray('• No enhancements needed - migrations are already optimized'))
    return
  }

  console.log()
  console.log(pc.blue(`Found ${enhancementsFound.length} migration(s) that can be enhanced:`))

  for (const analysis of enhancementsFound) {
    console.log()
    console.log(pc.bold(`📄 ${analysis.file}`))
    
    // Show clean diff
    const diff = diffChars(analysis.enhanced.original.up, analysis.enhanced.enhanced.up)
    let hasAdditions = false
    let hasRemovals = false
    
    diff.forEach(part => {
      if (part.added) hasAdditions = true
      if (part.removed) hasRemovals = true
    })
    
    if (hasAdditions || hasRemovals) {
      console.log()
      diff.forEach(part => {
        if (part.added) {
          const lines = part.value.split('\n').filter(line => line.trim())
          lines.forEach(line => {
            if (line.trim()) {
              console.log(pc.green(`+ ${line.trim()}`))
            }
          })
        } else if (part.removed) {
          const lines = part.value.split('\n').filter(line => line.trim())
          lines.forEach(line => {
            if (line.trim()) {
              console.log(pc.red(`- ${line.trim()}`))
            }
          })
        }
      })
    }

    const proceed = options.yes ? true : await confirm({ 
      message: `Apply enhancements to ${analysis.file}?`,
      initialValue: true
    })

    if (proceed) {
      try {
        const newContent = await replaceEnhancedSQLInMigrationFile(
          analysis.filePath, 
          analysis.enhanced.enhanced.up, 
          analysis.enhanced.enhanced.down
        )
        await fs.writeFile(analysis.filePath, newContent, 'utf-8')
        console.log(pc.green(`✓ Enhanced ${analysis.file}`))
        changesApplied++
      } catch (error) {
        console.log(pc.yellow(`⚠ Could not automatically enhance ${analysis.file}`))
        console.log(pc.gray(`  Error: ${error}`))
      }
    } else {
      console.log(pc.gray(`• Skipped ${analysis.file}`))
    }
  }

  if (changesApplied > 0) {
    console.log()
    console.log(pc.green(`✓ Applied ${changesApplied} enhancement(s) to migration files`))
  }
}

function extractSQLFromMigrationFile(content: string): string {
  const sqlPatterns = [
    /queryRunner\.query\s*\(\s*[`"']([^`"']+)[`"']/g,
    /sql\s*`([^`]+)`/g,
    /"((?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)[^"]+)"/gi
  ]
  let extractedSQL = ''
  for (const pattern of sqlPatterns) {
    let match
    while ((match = pattern.exec(content)) !== null) {
      extractedSQL += match[1] + ';\n'
    }
  }
  return extractedSQL || content
}

async function replaceEnhancedSQLInMigrationFile(filePath: string, upSQL: string, downSQL?: string): Promise<string> {
  const content = await fs.readFile(filePath, 'utf-8')
  let updatedContent = content

  // Generate enhancement comment header
  const fileName = path.basename(filePath)
  const enhancementComment = generateEnhancementComment(fileName, upSQL)

  // Add comment at the top of the file if it doesn't already exist
  if (!updatedContent.includes('Enhanced by DriftJS')) {
    const lines = updatedContent.split('\n')
    let insertIndex = 0
    
    // Skip existing comments and imports to find insertion point
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line && !line.startsWith('//') && !line.startsWith('/*') && !line.startsWith('*') && !line.startsWith('import') && !line.startsWith('export')) {
        insertIndex = i
        break
      }
    }
    
    lines.splice(insertIndex, 0, enhancementComment, '')
    updatedContent = lines.join('\n')
  }

  updatedContent = updatedContent.replace(/queryRunner\.query\s*\(\s*[`"']([^`"']+)[`"']/g, `queryRunner.query(\`${upSQL.trim()}\`)`)
  updatedContent = updatedContent.replace(/sql\s*`([^`]+)`/g, `sql\`${upSQL.trim()}\``)
  updatedContent = updatedContent.replace(/"((?:CREATE|ALTER|DROP|INSERT|UPDATE|DELETE)[^"]+)"/gi, `"${upSQL.trim()}"`)

  if (downSQL) {
    updatedContent = updatedContent.replace(/(public async down\(.*?\): Promise<void> \{[\s\S]*?queryRunner\.query\s*\(\s*[`"'])([^`"']+)([`"'])/, `$1${downSQL.trim()}$3`)
  }

  return updatedContent
}

function generateEnhancementComment(fileName: string, enhancedSQL: string): string {
  const timestamp = new Date().toISOString().split('T')[0]
  const operations = analyzeEnhancements(enhancedSQL)
  
  const header = `/*
 * Migration Enhanced by DriftJS.com
 * File: ${fileName}
 * Enhanced: ${timestamp}
 * 
 * This migration has been optimized for production safety and performance.
 * Learn more at https://driftjs.com
 */`

  if (operations.length === 1) {
    return `${header.slice(0, -2)}
 * 
 * Enhancement: ${operations[0]}
 */`
  } else if (operations.length > 1) {
    const enhancementList = operations.map(op => ` * - ${op}`).join('\n')
    return `${header.slice(0, -2)}
 * 
 * Enhancements Applied:
${enhancementList}
 */`
  }
  
  return header
}

function analyzeEnhancements(sql: string): string[] {
  const enhancements: string[] = []
  const sqlLower = sql.toLowerCase()
  
  // Detect common enhancement patterns
  if (sqlLower.includes('add constraint') && sqlLower.includes('not valid')) {
    enhancements.push('Safe constraint addition with NOT VALID optimization')
  }
  if (sqlLower.includes('concurrently')) {
    enhancements.push('Non-blocking concurrent index creation')
  }
  if (sqlLower.includes('backup') || sqlLower.includes('copy')) {
    enhancements.push('Data backup created before destructive operations')
  }
  if (sqlLower.includes('alter table') && sqlLower.includes('add column') && !sqlLower.includes('not null')) {
    enhancements.push('Nullable column added first for safe NOT NULL migration')
  }
  if (sqlLower.includes('validate constraint')) {
    enhancements.push('Constraint validation separated for reduced downtime')
  }
  if (sqlLower.includes('lock timeout') || sqlLower.includes('statement_timeout')) {
    enhancements.push('Query timeouts configured to prevent long locks')
  }
  if (sqlLower.includes('begin;') && sqlLower.includes('commit;')) {
    enhancements.push('Transaction boundaries optimized for safety')
  }
  
  // Default if no specific enhancements detected
  if (enhancements.length === 0) {
    enhancements.push('Production-ready migration optimizations applied')
  }
  
  return enhancements
}