// @ts-nocheck

import { execa } from 'execa'
import { join } from 'node:path'
import fsExtra from 'fs-extra'

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

  it('detects migration file with flow sync', async () => {
    const migDir = join(testProjectDir, 'migrations')
    await fsExtra.mkdirp(migDir)
    const migFile = join(migDir, '000_test.sql')
    await fsExtra.writeFile(migFile, '-- test migration')

    const { stdout, exitCode } = await execa('flow', ['sync'], {
      cwd: testProjectDir,
      env: { FORCE_COLOR: '0' }
    })

    expect(exitCode).toBe(0)
    expect(stdout).toContain('000_test.sql')

    await fsExtra.remove(migDir)
  }, 20000)
}) 