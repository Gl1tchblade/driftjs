import { createFileRoute } from '@tanstack/react-router'
import { CodeBlock } from '@/components/ui/code-block'

export const Route = createFileRoute('/docs/flow/commands')({
  component: FlowCommandsDoc,
})

function FlowCommandsDoc() {
  return (
    <div className="prose prose-lg max-w-4xl mx-auto p-6">
      <div className="not-prose mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
          🛠️ Flow CLI Commands
        </h1>
        <p className="text-xl text-gray-600 mt-2">
          Complete reference for all Flow CLI commands with examples
        </p>
      </div>

      {/* Core Commands */}
      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-6 text-gray-800">🚀 Core Commands</h2>
        
        <div className="space-y-8">
          {/* Enhance Command */}
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-2xl font-semibold mb-4 text-blue-800 flex items-center">
              <span className="mr-2">🚀</span> flow enhance
            </h3>
            <p className="text-gray-700 mb-4">
              Intelligently enhance database migrations with safety and performance improvements through an interactive two-phase process.
            </p>
            
            <CodeBlock
              variant="default"
              code={`# Enhance latest migration automatically
$ flow enhance

# Enhance specific migration file
$ flow enhance migrations/20240101000001_add_users.sql

# Preview changes without applying
$ flow enhance --dry-run

# Verbose output with detailed analysis
$ flow enhance --verbose`}
            />

            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-red-700 mb-2">🛡️ Safety Enhancements</h4>
                <ul className="text-sm space-y-1">
                  <li>• Transaction Wrapper</li>
                  <li>• Drop Table Safeguards</li>
                  <li>• Backup Recommendations</li>
                  <li>• Data Type Change Safety</li>
                  <li>• Cascade Delete Safety</li>
                  <li>• Column Renaming Safety</li>
                  <li>• Constraint Validations</li>
                  <li>• Migration Order Safety</li>
                  <li>• Nullable Column Safety</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-green-700 mb-2">⚡ Speed Enhancements</h4>
                <ul className="text-sm space-y-1">
                  <li>• Smart Index Analysis</li>
                  <li>• Concurrent Index Creation</li>
                  <li>• Batch Insert Optimization</li>
                  <li>• Partial Index Suggestions</li>
                  <li>• Index Effectiveness Validation</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Validate Command */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-6">
            <h3 className="text-2xl font-semibold mb-4 text-green-800 flex items-center">
              <span className="mr-2">🔍</span> flow validate
            </h3>
            <p className="text-gray-700 mb-4">
              Validate migrations for potential issues without applying enhancements. Perfect for CI/CD pipelines.
            </p>
            
            <CodeBlock
              variant="default"
              code={`# Validate latest migration
$ flow validate

# Validate specific migration
$ flow validate migrations/add_users.sql

# Validate all migrations
$ flow validate --all

# Strict mode - fail on warnings
$ flow validate --strict`}
            />
          </div>

          {/* Plan Command */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-2xl font-semibold mb-4 text-purple-800 flex items-center">
              <span className="mr-2">📋</span> flow plan
            </h3>
            <p className="text-gray-700 mb-4">
              Preview enhancement changes without applying them. See exactly what Flow will do before committing.
            </p>
            
            <CodeBlock
              variant="default"
              code={`# Plan enhancements for latest migration
$ flow plan

# Plan specific migration file
$ flow plan migrations/add_users.sql

# Detailed analysis output
$ flow plan --verbose

# Export plan to file
$ flow plan --output plan.json`}
            />
          </div>

          {/* Rollback Command */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-6">
            <h3 className="text-2xl font-semibold mb-4 text-orange-800 flex items-center">
              <span className="mr-2">↩️</span> flow rollback
            </h3>
            <p className="text-gray-700 mb-4">
              Safely rollback enhanced migrations with automatic down script generation and safety checks.
            </p>
            
            <CodeBlock
              variant="default"
              code={`# Rollback latest migration
$ flow rollback

# Rollback specific migration
$ flow rollback migrations/add_users.sql

# Generate rollback script without executing
$ flow rollback --generate-only

# Force rollback (skip confirmations)
$ flow rollback --force`}
            />
          </div>
        </div>
      </section>

      {/* Management Commands */}
      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-6 text-gray-800">⚙️ Management Commands</h2>
        
        <div className="space-y-8">
          {/* Init Command */}
          <div className="bg-gradient-to-r from-teal-50 to-cyan-50 border border-teal-200 rounded-lg p-6">
            <h3 className="text-2xl font-semibold mb-4 text-teal-800 flex items-center">
              <span className="mr-2">🚀</span> flow init
            </h3>
            <p className="text-gray-700 mb-4">
              Initialize Flow in your project with automatic ORM detection and configuration setup.
            </p>
            
            <CodeBlock
              variant="default"
              code={`# Initialize Flow in current directory
$ flow init

# Non-interactive mode with defaults
$ flow init --yes

# Initialize with custom database URL
$ flow init --db-url postgresql://user:pass@localhost:5432/mydb

# Skip ORM detection
$ flow init --no-detect`}
            />
          </div>

          {/* Config Command */}
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-2xl font-semibold mb-4 text-gray-800 flex items-center">
              <span className="mr-2">⚙️</span> flow config
            </h3>
            <p className="text-gray-700 mb-4">
              Manage Flow configuration settings and multiple environments.
            </p>
            
            <CodeBlock
              variant="default"
              code={`# View current configuration
$ flow config show

# Set database URL for environment
$ flow config set development.db_connection_string "postgresql://..."

# Enable/disable enhancements
$ flow config set enhancements.enableSpeedEnhancements false

# Add new environment
$ flow config add-env staging

# Reset to defaults
$ flow config reset`}
            />
          </div>

          {/* Status Command */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-6">
            <h3 className="text-2xl font-semibold mb-4 text-indigo-800 flex items-center">
              <span className="mr-2">📊</span> flow status
            </h3>
            <p className="text-gray-700 mb-4">
              Check enhancement status and migration statistics across your project.
            </p>
            
            <CodeBlock
              variant="default"
              code={`# Show overall project status
$ flow status

# Detailed migration analysis
$ flow status --detailed

# Check specific environment
$ flow status --env production

# Export status report
$ flow status --export status-report.json`}
            />
          </div>
        </div>
      </section>

      {/* Global Options */}
      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-6 text-gray-800">⚡ Global Options</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200 rounded-lg">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Option</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 text-sm font-mono bg-gray-50">--help, -h</td>
                <td className="px-6 py-4 text-sm text-gray-900">Show command help</td>
                <td className="px-6 py-4 text-sm font-mono">flow enhance --help</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-mono bg-gray-50">--version, -v</td>
                <td className="px-6 py-4 text-sm text-gray-900">Show version number</td>
                <td className="px-6 py-4 text-sm font-mono">flow --version</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-mono bg-gray-50">--project &lt;path&gt;</td>
                <td className="px-6 py-4 text-sm text-gray-900">Specify project path</td>
                <td className="px-6 py-4 text-sm font-mono">flow enhance --project ./backend</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-mono bg-gray-50">--no-color</td>
                <td className="px-6 py-4 text-sm text-gray-900">Disable color output</td>
                <td className="px-6 py-4 text-sm font-mono">flow status --no-color</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-mono bg-gray-50">--quiet, -q</td>
                <td className="px-6 py-4 text-sm text-gray-900">Suppress all output</td>
                <td className="px-6 py-4 text-sm font-mono">flow enhance -q</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Quick Reference */}
      <section className="mb-12">
        <h2 className="text-3xl font-semibold mb-6 text-gray-800">⚡ Quick Reference</h2>
        
        <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm">
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <div className="text-yellow-400 mb-3">🚀 Essential Workflow</div>
              <div className="space-y-1 text-sm">
                <div><span className="text-blue-400">1.</span> flow init</div>
                <div><span className="text-blue-400">2.</span> flow enhance --dry-run</div>
                <div><span className="text-blue-400">3.</span> flow enhance</div>
                <div><span className="text-blue-400">4.</span> flow status</div>
              </div>
            </div>
            
            <div>
              <div className="text-yellow-400 mb-3">🔄 CI/CD Integration</div>
              <div className="space-y-1 text-sm">
                <div><span className="text-blue-400">1.</span> flow validate --all</div>
                <div><span className="text-blue-400">2.</span> flow plan --output plan.json</div>
                <div><span className="text-blue-400">3.</span> flow enhance --force</div>
                <div><span className="text-blue-400">4.</span> flow status --export report.json</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
} 