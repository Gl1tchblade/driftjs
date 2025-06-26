export interface GlobalOptions {
  debug?: boolean
  config?: string
  dryRun?: boolean
}

import fsExtra from 'fs-extra'
import { resolve, dirname } from 'node:path'

/**
 * Locate and parse flow.config.json.
 * If --config is supplied use that path, otherwise walk parent directories.
 */
export async function getFlowConfig(global: GlobalOptions, projectPath?: string) {
  const configPath = await findConfigFile(projectPath || process.cwd(), global.config)
  return JSON.parse(await fsExtra.readFile(configPath, 'utf8'))
}

async function findConfigFile(startDir: string, explicit?: string): Promise<string> {
  if (explicit) {
    const p = resolve(explicit)
    if (await fsExtra.pathExists(p)) return p
    throw new Error(`Config file not found at ${p}`)
  }

  let dir = startDir
  while (true) {
    const candidate = resolve(dir, 'flow.config.json')
    if (await fsExtra.pathExists(candidate)) return candidate
    const parent = dirname(dir)
    if (parent === dir) break
    dir = parent
  }
  throw new Error('flow.config.json not found')
} 