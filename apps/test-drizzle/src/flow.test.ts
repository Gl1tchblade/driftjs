// @ts-nocheck

import { execa } from 'execa'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import fsExtra from 'fs-extra'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const testProjectDir = join(__dirname, '..')

describe('DriftJS Flow CLI with Drizzle project', () => {
  it('runs flow --help successfully', async () => {
    const { stdout, exitCode } = await execa('flow', ['--help'], {
      cwd: testProjectDir,
      env: { FORCE_COLOR: '0' }
    })
    expect(exitCode).toBe(0)
    expect(stdout).toContain('Enhanced database migration CLI tool')
  }, 20000)

  it('runs flow sync successfully', async () => {
    const { stdout, exitCode } = await execa('flow', ['sync'], {
      cwd: testProjectDir,
      env: { FORCE_COLOR: '0' }
    })

    expect(exitCode).toBe(0)
    expect(stdout).toContain('Sync completed')
  }, 20000)
}) 