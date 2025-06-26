import fs from 'fs-extra'
import path from 'node:path'
import { FlowConfig } from '../types/config.js'
import { validateDatabaseConfig } from './validation.js'

/**
 * Default file names that Drift Flow will look for when no --config flag is passed.
 */
const DEFAULT_CONFIG_FILES = [
  'flow.config.json',
  'flow.config.js',
  'flow.config.cjs',
  'flow.config.mjs',
  'flow.config.ts',
]

/**
 * Load the first configuration file found in the current working directory hierarchy.
 * @param cwd Directory to start the search from (defaults to process.cwd())
 * @param explicitPath Optional explicit path passed by CLI flag
 */
export async function loadFlowConfig(
  cwd: string = process.cwd(),
  explicitPath?: string,
): Promise<FlowConfig> {
  let configPath: string | undefined = explicitPath

  if (!configPath) {
    configPath = await findConfigFile(cwd)
    if (!configPath) {
      throw new Error('Unable to locate flow.config file in current directory tree.')
    }
  }

  const ext = path.extname(configPath)
  let raw: unknown

  if (ext === '.json') {
    raw = await fs.readJSON(configPath)
  } else if (ext === '.js' || ext === '.cjs' || ext === '.mjs') {
    // eslint-disable-next-line import/no-dynamic-require, @typescript-eslint/no-var-requires
    raw = await import(configPath)
    raw = (raw as any).default ?? raw
  } else if (ext === '.ts') {
    throw new Error('Loading TypeScript config files is not yet supported. Please use JSON or JavaScript.')
  } else {
    throw new Error(`Unsupported config file extension: ${ext}`)
  }

  const validated = validateFlowConfig(raw)
  if (!validated.valid) {
    throw new Error(`Invalid flow.config: \n${validated.errors.join('\n')}`)
  }

  return validated.config!
}

/** Find the nearest config file walking up the directory tree */
async function findConfigFile(startDir: string): Promise<string | undefined> {
  let dir = startDir
  while (path.dirname(dir) !== dir) {
    for (const file of DEFAULT_CONFIG_FILES) {
      const candidate = path.join(dir, file)
      if (await fs.pathExists(candidate)) {
        return candidate
      }
    }
    dir = path.dirname(dir)
  }
  return undefined
}

export interface ValidationResult {
  valid: boolean
  errors: string[]
  config?: FlowConfig
}

/**
 * Perform structural validation of FlowConfig instance.
 * We purposefully avoid pulling in a JSON-schema validator to keep deps light.
 */
export function validateFlowConfig(input: unknown): ValidationResult {
  if (typeof input !== 'object' || input === null) {
    return { valid: false, errors: ['Configuration must be an object'] }
  }
  const cfg = input as Partial<FlowConfig>
  const errors: string[] = []

  if (!cfg.environments || Object.keys(cfg.environments).length === 0) {
    errors.push('`environments` section is required and cannot be empty')
  }
  if (!cfg.defaultEnvironment) {
    errors.push('`defaultEnvironment` is required')
  } else if (cfg.environments && !(cfg.defaultEnvironment in cfg.environments)) {
    errors.push(`defaultEnvironment \`${cfg.defaultEnvironment}\` not found in environments section`)
  }

  // Validate each environment
  if (cfg.environments) {
    for (const [envName, envCfg] of Object.entries(cfg.environments)) {
      if (!envCfg.databaseUrl) {
        errors.push(`environment[${envName}].databaseUrl is required`)
      }
      if (envCfg.migrationsPath && typeof envCfg.migrationsPath !== 'string') {
        errors.push(`environment[${envName}].migrationsPath must be a string`)
      }
      if (envCfg.migrationsPath) {
        const absPath = path.isAbsolute(envCfg.migrationsPath)
          ? envCfg.migrationsPath
          : path.join(process.cwd(), envCfg.migrationsPath)
        if (!(fs.existsSync(absPath))) {
          errors.push(`environment[${envName}].migrationsPath '${envCfg.migrationsPath}' does not exist`)
        }
      }
      // pattern toggles validation
      if (envCfg.patterns) {
        if (typeof envCfg.patterns !== 'object') {
          errors.push(`environment[${envName}].patterns must be an object`)
        }
      }
    }
  }

  // Validate safety thresholds
  if (cfg.safety) {
    if (cfg.safety.maxLockTimeMs && cfg.safety.maxLockTimeMs < 0) {
      errors.push('safety.maxLockTimeMs must be positive')
    }
    if (cfg.safety.maxTableSizeMB && cfg.safety.maxTableSizeMB < 0) {
      errors.push('safety.maxTableSizeMB must be positive')
    }
  }

  // Validate database optimisation settings
  if (cfg.database) {
    for (const [name, dbCfg] of Object.entries(cfg.database)) {
      const { valid, errors: dbErrors } = validateDatabaseConfig(dbCfg as any)
      if (!valid) {
        errors.push(...dbErrors.map((e) => `database[${name}]: ${e}`))
      }
    }
  }

  return { valid: errors.length === 0, errors, config: cfg as FlowConfig }
} 