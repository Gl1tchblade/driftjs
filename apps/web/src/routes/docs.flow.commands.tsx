import { createFileRoute } from '@tanstack/react-router'

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
            
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-4">
              <span className="text-gray-500"># Enhance latest migration automatically</span><br/>
              <span className="text-yellow-400">$</span> flow enhance<br/><br/>
              
              <span className="text-gray-500"># Enhance specific migration file</span><br/>
              <span className="text-yellow-400">$</span> flow enhance migrations/20240101000001_add_users.sql<br/><br/>
              
              <span className="text-gray-500"># Preview changes without applying</span><br/>
              <span className="text-yellow-400">$</span> flow enhance --dry-run<br/><br/>
              
              <span className="text-gray-500"># Verbose output with detailed analysis</span><br/>
              <span className="text-yellow-400">$</span> flow enhance --verbose
            </div>

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
            
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-4">
              <span className="text-gray-500"># Validate latest migration</span><br/>
              <span className="text-yellow-400">$</span> flow validate<br/><br/>
              
              <span className="text-gray-500"># Validate specific migration</span><br/>
              <span className="text-yellow-400">$</span> flow validate migrations/add_users.sql<br/><br/>
              
              <span className="text-gray-500"># Validate all migrations</span><br/>
              <span className="text-yellow-400">$</span> flow validate --all<br/><br/>
              
              <span className="text-gray-500"># Strict mode - fail on warnings</span><br/>
              <span className="text-yellow-400">$</span> flow validate --strict
            </div>
          </div>

          {/* Plan Command */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
            <h3 className="text-2xl font-semibold mb-4 text-purple-800 flex items-center">
              <span className="mr-2">📋</span> flow plan
            </h3>
            <p className="text-gray-700 mb-4">
              Preview enhancement changes without applying them. See exactly what Flow will do before committing.
            </p>
            
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-4">
              <span className="text-gray-500"># Plan enhancements for latest migration</span><br/>
              <span className="text-yellow-400">$</span> flow plan<br/><br/>
              
              <span className="text-gray-500"># Plan specific migration file</span><br/>
              <span className="text-yellow-400">$</span> flow plan migrations/add_users.sql<br/><br/>
              
              <span className="text-gray-500"># Detailed analysis output</span><br/>
              <span className="text-yellow-400">$</span> flow plan --verbose<br/><br/>
              
              <span className="text-gray-500"># Export plan to file</span><br/>
              <span className="text-yellow-400">$</span> flow plan --output plan.json
            </div>
          </div>

          {/* Rollback Command */}
          <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-6">
            <h3 className="text-2xl font-semibold mb-4 text-orange-800 flex items-center">
              <span className="mr-2">↩️</span> flow rollback
            </h3>
            <p className="text-gray-700 mb-4">
              Safely rollback enhanced migrations with automatic down script generation and safety checks.
            </p>
            
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-4">
              <span className="text-gray-500"># Rollback latest migration</span><br/>
              <span className="text-yellow-400">$</span> flow rollback<br/><br/>
              
              <span className="text-gray-500"># Rollback specific migration</span><br/>
              <span className="text-yellow-400">$</span> flow rollback migrations/add_users.sql<br/><br/>
              
              <span className="text-gray-500"># Generate rollback script without executing</span><br/>
              <span className="text-yellow-400">$</span> flow rollback --generate-only<br/><br/>
              
              <span className="text-gray-500"># Force rollback (skip confirmations)</span><br/>
              <span className="text-yellow-400">$</span> flow rollback --force
            </div>
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
            
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-4">
              <span className="text-gray-500"># Initialize Flow in current directory</span><br/>
              <span className="text-yellow-400">$</span> flow init<br/><br/>
              
              <span className="text-gray-500"># Non-interactive mode with defaults</span><br/>
              <span className="text-yellow-400">$</span> flow init --yes<br/><br/>
              
              <span className="text-gray-500"># Initialize with custom database URL</span><br/>
              <span className="text-yellow-400">$</span> flow init --db-url postgresql://user:pass@localhost:5432/mydb<br/><br/>
              
              <span className="text-gray-500"># Skip ORM detection</span><br/>
              <span className="text-yellow-400">$</span> flow init --no-detect
            </div>
          </div>

          {/* Config Command */}
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-200 rounded-lg p-6">
            <h3 className="text-2xl font-semibold mb-4 text-gray-800 flex items-center">
              <span className="mr-2">⚙️</span> flow config
            </h3>
            <p className="text-gray-700 mb-4">
              Manage Flow configuration settings and multiple environments.
            </p>
            
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-4">
              <span className="text-gray-500"># View current configuration</span><br/>
              <span className="text-yellow-400">$</span> flow config show<br/><br/>
              
              <span className="text-gray-500"># Set database URL for environment</span><br/>
              <span className="text-yellow-400">$</span> flow config set development.db_connection_string "postgresql://..."<br/><br/>
              
              <span className="text-gray-500"># Enable/disable enhancements</span><br/>
              <span className="text-yellow-400">$</span> flow config set enhancements.enableSpeedEnhancements false<br/><br/>
              
              <span className="text-gray-500"># Add new environment</span><br/>
              <span className="text-yellow-400">$</span> flow config add-env staging<br/><br/>
              
              <span className="text-gray-500"># Reset to defaults</span><br/>
              <span className="text-yellow-400">$</span> flow config reset
            </div>
          </div>

          {/* Status Command */}
          <div className="bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200 rounded-lg p-6">
            <h3 className="text-2xl font-semibold mb-4 text-indigo-800 flex items-center">
              <span className="mr-2">📊</span> flow status
            </h3>
            <p className="text-gray-700 mb-4">
              Check enhancement status and migration statistics across your project.
            </p>
            
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-4">
              <span className="text-gray-500"># Show overall project status</span><br/>
              <span className="text-yellow-400">$</span> flow status<br/><br/>
              
              <span className="text-gray-500"># Detailed migration analysis</span><br/>
              <span className="text-yellow-400">$</span> flow status --detailed<br/><br/>
              
              <span className="text-gray-500"># Check specific environment</span><br/>
              <span className="text-yellow-400">$</span> flow status --env production<br/><br/>
              
              <span className="text-gray-500"># Export status report</span><br/>
              <span className="text-yellow-400">$</span> flow status --export status-report.json
            </div>
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
                <td className="px-6 py-4 text-sm font-mono bg-gray-50">--version, -V</td>
                <td className="px-6 py-4 text-sm text-gray-900">Show Flow CLI version</td>
                <td className="px-6 py-4 text-sm font-mono">flow --version</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-mono bg-gray-50">--verbose, -v</td>
                <td className="px-6 py-4 text-sm text-gray-900">Enable detailed logging</td>
                <td className="px-6 py-4 text-sm font-mono">flow enhance -v</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-mono bg-gray-50">--config, -c</td>
                <td className="px-6 py-4 text-sm text-gray-900">Specify config file path</td>
                <td className="px-6 py-4 text-sm font-mono">flow enhance -c ./custom.config.json</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-mono bg-gray-50">--env, -e</td>
                <td className="px-6 py-4 text-sm text-gray-900">Target environment</td>
                <td className="px-6 py-4 text-sm font-mono">flow enhance --env production</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-mono bg-gray-50">--dry-run</td>
                <td className="px-6 py-4 text-sm text-gray-900">Preview changes without applying</td>
                <td className="px-6 py-4 text-sm font-mono">flow enhance --dry-run</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-mono bg-gray-50">--force</td>
                <td className="px-6 py-4 text-sm text-gray-900">Skip confirmations (dangerous)</td>
                <td className="px-6 py-4 text-sm font-mono">flow rollback --force</td>
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