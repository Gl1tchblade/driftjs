/**
 * Base ORM detector with common functionality
 */

import { join } from 'path'
import { ORMDetector, ORMConfig } from '@driftjs/core'
import { DatabaseConfig, DetectionResult, FilePath } from '@driftjs/core'
import { exists, createFilePath, readJsonFile, findFiles } from '@driftjs/core'

export abstract class BaseORMDetector implements ORMDetector {
  abstract name: string
  
  /**
   * Detect if this ORM is present in the project
   */
  abstract detect(projectPath: string): Promise<DetectionResult>
  
  /**
   * Extract ORM-specific configuration
   */
  abstract extractConfig(projectPath: string): Promise<ORMConfig | null>
  
  /**
   * Extract database configuration from ORM setup
   */
  abstract getDatabaseConfig(projectPath: string): Promise<DatabaseConfig | null>
  
  /**
   * Common helper: Check if package.json contains specific dependencies
   */
  protected async checkPackageJsonDependencies(
    projectPath: string,
    dependencies: string[]
  ): Promise<{ found: string[]; missing: string[] }> {
    const packageJsonPath = join(projectPath, 'package.json')
    const packageResult = await readJsonFile<{ dependencies?: Record<string, string>; devDependencies?: Record<string, string> }>(packageJsonPath)
    
    if (!packageResult.success) {
      return { found: [], missing: dependencies }
    }
    
    const allDeps = {
      ...packageResult.data.dependencies,
      ...packageResult.data.devDependencies
    }
    
    const found = dependencies.filter(dep => dep in allDeps)
    const missing = dependencies.filter(dep => !(dep in allDeps))
    
    return { found, missing }
  }
  
  /**
   * Common helper: Check if specific files exist
   */
  protected async checkFiles(
    projectPath: string,
    filePaths: string[]
  ): Promise<{ existing: FilePath[]; missing: string[] }> {
    const existing: FilePath[] = []
    const missing: string[] = []
    
    for (const filePath of filePaths) {
      const fullPath = join(projectPath, filePath)
      const fileExists = await exists(fullPath)
      
      if (fileExists) {
        existing.push(await createFilePath(filePath, projectPath))
      } else {
        missing.push(filePath)
      }
    }
    
    return { existing, missing }
  }
  
  /**
   * Common helper: Find files matching patterns
   */
  protected async findFilesByPattern(
    projectPath: string,
    patterns: RegExp[],
    directories: string[] = ['.']
  ): Promise<string[]> {
    const allFiles: string[] = []
    
    for (const directory of directories) {
      const fullDirectory = join(projectPath, directory)
      
      for (const pattern of patterns) {
        const files = await findFiles(fullDirectory, pattern, true)
        allFiles.push(...files)
      }
    }
    
    return allFiles
  }
  
  /**
   * Common helper: Calculate confidence score based on evidence
   */
  protected calculateConfidence(evidence: {
    required: { found: number; total: number }
    optional: { found: number; total: number }
    negative: number
  }): number {
    if (evidence.required.total === 0) {
      return 0
    }
    
    const requiredScore = evidence.required.found / evidence.required.total
    const optionalScore = evidence.optional.total > 0 
      ? evidence.optional.found / evidence.optional.total 
      : 0
    
    // Base score from required items (70% weight)
    const baseScore = requiredScore * 0.7
    
    // Bonus from optional items (30% weight)
    const bonusScore = optionalScore * 0.3
    
    // Penalty for negative evidence
    const penalty = Math.min(evidence.negative * 0.1, 0.5)
    
    return Math.max(0, Math.min(1, baseScore + bonusScore - penalty))
  }
  
  /**
   * Parse database URL into DatabaseConfig
   */
  protected parseDatabaseUrl(url: string): DatabaseConfig | null {
    try {
      const parsed = new URL(url)
      
      let type: DatabaseConfig['type']
      
      switch (parsed.protocol) {
        case 'postgresql:':
        case 'postgres:':
          type = 'postgresql'
          break
        case 'mysql:':
          type = 'mysql'
          break
        case 'sqlite:':
          type = 'sqlite'
          break
        default:
          return null
      }
      
      return {
        type,
        host: parsed.hostname || undefined,
        port: parsed.port ? parseInt(parsed.port) : undefined,
        database: parsed.pathname.slice(1), // Remove leading slash
        username: parsed.username || undefined,
        password: parsed.password || undefined,
        url
      }
    } catch {
      return null
    }
  }
} 