import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/docs/flow/enhance')({
  component: FlowEnhanceDoc,
})

function FlowEnhanceDoc() {
  return (
    <div className="prose prose-lg max-w-4xl mx-auto p-6">
      <div className="not-prose mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
          🚀 flow enhance
        </h1>
        <p className="text-xl text-gray-600 mt-2">
          Intelligently enhance database migrations with safety and performance improvements
        </p>
      </div>

      {/* Quick Start */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>
        
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-4">
          <span className="text-gray-500"># Enhance latest migration automatically</span><br/>
          <span className="text-yellow-400">$</span> flow enhance<br/><br/>
          
          <span className="text-gray-500"># Enhance specific migration file</span><br/>
          <span className="text-yellow-400">$</span> flow enhance migrations/20240101000001_add_users.sql<br/><br/>
          
          <span className="text-gray-500"># Preview changes without applying</span><br/>
          <span className="text-yellow-400">$</span> flow enhance --dry-run
        </div>
      </section>

      {/* Two-Phase Process */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Two-Phase Enhancement Process</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-red-800 mb-2">🛡️ Phase 1: Safety</h3>
            <ul className="text-sm text-red-700 space-y-1">
              <li>• Transaction Wrapper</li>
              <li>• Drop Table Safeguards</li>
              <li>• Backup Recommendations</li>
              <li>• Data Type Change Safety</li>
              <li>• Cascade Delete Safety</li>
              <li>• Migration Order Safety</li>
            </ul>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-green-800 mb-2">⚡ Phase 2: Speed</h3>
            <ul className="text-sm text-green-700 space-y-1">
              <li>• Smart Index Analysis</li>
              <li>• Concurrent Index Creation</li>
              <li>• Batch Insert Optimization</li>
              <li>• Partial Index Suggestions</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Example Session */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Example Enhancement Session</h2>
        
        <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm">
          <div className="text-cyan-400 mb-4">
            ╭───────────────────────────────────────╮<br/>
            │                Flow                   │<br/>
            │  Database Migration Enhancement Tool  │<br/>
            ╰───────────────────────────────────────╯
          </div>
          
          <div className="space-y-1">
            <div className="text-blue-400">●  ℹ️  Operating on: 20240101000001_add_users.sql</div>
            <div className="text-green-400">◇  ✅ Migration file loaded successfully</div>
            
            <div className="text-yellow-400 my-2">●  ━━━ Phase 1: Safety Enhancements ━━━</div>
            <div className="text-orange-400">▲  ⚠️  Found 3 safety issues</div>
            <div className="text-green-400">◇  Apply safety enhancements? Yes</div>
            <div className="text-green-400">◇  ✅ Safety enhancements applied</div>
            
            <div className="text-yellow-400 my-2">●  ━━━ Phase 2: Speed Enhancements ━━━</div>
            <div className="text-blue-400">◇  ℹ️  Analyzing indexes...</div>
            <div className="text-green-400">◇  ✅ Found 2 beneficial optimizations</div>
            <div className="text-green-400">◇  Apply speed enhancements? Yes</div>
            
            <div className="text-green-400 mt-3">
              ◆  ✅ Enhancement completed! 🎉
            </div>
          </div>
        </div>
      </section>

      {/* Overview */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Overview</h2>
        <p>
          The <code>flow enhance</code> command is the heart of Flow CLI. It automatically analyzes your database migrations 
          and applies intelligent safety and performance enhancements through an interactive two-phase process.
        </p>
        
        <div className="bg-blue-50 border-l-4 border-blue-400 p-4 my-4">
          <div className="flex">
            <div className="ml-3">
              <p className="text-sm text-blue-700">
                <strong>Smart Analysis:</strong> Flow now includes intelligent index analysis that only suggests 
                indexes when they're actually beneficial, preventing database bloat and unnecessary complexity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Command Options */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Command Options</h2>
        
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Option</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Example</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 text-sm font-mono bg-gray-50">[file]</td>
                <td className="px-6 py-4 text-sm text-gray-900">Path to migration file (optional)</td>
                <td className="px-6 py-4 text-sm font-mono">migrations/add_index.sql</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-mono bg-gray-50">--project, -p</td>
                <td className="px-6 py-4 text-sm text-gray-900">Specify project directory</td>
                <td className="px-6 py-4 text-sm font-mono">./backend</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-mono bg-gray-50">--dry-run</td>
                <td className="px-6 py-4 text-sm text-gray-900">Preview changes without applying</td>
                <td className="px-6 py-4 text-sm font-mono">--dry-run</td>
              </tr>
              <tr>
                <td className="px-6 py-4 text-sm font-mono bg-gray-50">--verbose, -v</td>
                <td className="px-6 py-4 text-sm text-gray-900">Enable detailed logging</td>
                <td className="px-6 py-4 text-sm font-mono">-v</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Smart Index Analysis */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">🧠 Smart Index Analysis</h2>
        
        <p className="mb-4">
          Flow's intelligent index analysis only suggests indexes when they're actually beneficial, 
          preventing database bloat and unnecessary complexity.
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3 text-green-700">✅ Suggests Indexes For:</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Foreign key columns (<code>user_id</code>, <code>*Id</code>)
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Common query columns (<code>email</code>, <code>username</code>, <code>status</code>)
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Unique constraint indexes
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                Timestamp columns (<code>created_at</code>, <code>updated_at</code>)
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3 text-red-700">❌ Warns Against:</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                Complex composite indexes (>3 columns)
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                Text/blob column indexes
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                Redundant or unnecessary indexes
              </li>
              <li className="flex items-center">
                <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                Indexes that won't improve query performance
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Before/After Examples */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Before & After Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Index Enhancement Example</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-red-700 mb-2">❌ Before Enhancement</h4>
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <pre className="text-sm"><code>{`-- Blocking index creation
CREATE INDEX idx_user_email 
ON users (email);

-- No transaction safety
ALTER TABLE users 
ADD COLUMN status VARCHAR(50);`}</code></pre>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-green-700 mb-2">✅ After Enhancement</h4>
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <pre className="text-sm"><code>{`-- Flow Enhancement: Transaction Wrapper
BEGIN;

-- Non-blocking concurrent index
CREATE INDEX CONCURRENTLY idx_user_email 
ON users (email);

-- Safe column addition
ALTER TABLE users 
ADD COLUMN status VARCHAR(50) DEFAULT 'active';

COMMIT;`}</code></pre>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">Safety Enhancement Example</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium text-red-700 mb-2">❌ Before Enhancement</h4>
                <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                  <pre className="text-sm"><code>{`-- Dangerous operation
DROP TABLE old_users;

-- No backup recommendation
TRUNCATE user_sessions;`}</code></pre>
                </div>
              </div>
              
              <div>
                <h4 className="text-sm font-medium text-green-700 mb-2">✅ After Enhancement</h4>
                <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                  <pre className="text-sm"><code>{`-- Flow Enhancement: Backup Safety
-- WARNING: Backup database before proceeding
-- This operation cannot be undone

-- Safe table drop with confirmation
DROP TABLE IF EXISTS old_users;

-- Flow Enhancement: Backup Recommendation  
-- Create backup before truncating data
TRUNCATE user_sessions;`}</code></pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Integration Examples */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Integration Examples</h2>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">CI/CD Integration</h3>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              <span className="text-gray-500"># GitHub Actions workflow</span><br/>
              <span className="text-blue-400">name:</span> Database Migration Enhancement<br/>
              <span className="text-blue-400">on:</span> [push, pull_request]<br/>
              <br/>
              <span className="text-blue-400">jobs:</span><br/>
              <span className="ml-2 text-blue-400">enhance-migrations:</span><br/>
              <span className="ml-4 text-blue-400">runs-on:</span> ubuntu-latest<br/>
              <span className="ml-4 text-blue-400">steps:</span><br/>
              <span className="ml-6">- <span className="text-blue-400">uses:</span> actions/checkout@v3</span><br/>
              <span className="ml-6">- <span className="text-blue-400">name:</span> Install Flow CLI</span><br/>
              <span className="ml-8 text-blue-400">run:</span> npm install -g @driftjs/flow<br/>
              <span className="ml-6">- <span className="text-blue-400">name:</span> Enhance Migrations</span><br/>
              <span className="ml-8 text-blue-400">run:</span> flow enhance --dry-run
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">Package.json Scripts</h3>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              <span className="text-gray-500">// package.json</span><br/>
              <span className="text-blue-400">"scripts":</span> {'{'}<br/>
              <span className="ml-2 text-yellow-400">"db:enhance":</span> <span className="text-green-400">"flow enhance"</span>,<br/>
              <span className="ml-2 text-yellow-400">"db:enhance:dry":</span> <span className="text-green-400">"flow enhance --dry-run"</span>,<br/>
              <span className="ml-2 text-yellow-400">"db:validate":</span> <span className="text-green-400">"flow validate"</span>,<br/>
              <span className="ml-2 text-yellow-400">"db:status":</span> <span className="text-green-400">"flow status"</span><br/>
              {'}'}
            </div>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3">Pre-commit Hook</h3>
            <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
              <span className="text-gray-500"># .husky/pre-commit</span><br/>
              <span className="text-yellow-400">#!/usr/bin/env sh</span><br/>
              <span className="text-blue-400">. "$(dirname -- "$0")/_/husky.sh"</span><br/>
              <br/>
              <span className="text-gray-500"># Validate migrations before commit</span><br/>
              <span className="text-green-400">flow validate --all</span><br/>
              <span className="text-green-400">flow enhance --dry-run</span>
            </div>
          </div>
        </div>
      </section>

      {/* Best Practices */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Best Practices</h2>
        
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">🔄 Development Workflow</h3>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Write your migration file</li>
              <li>Run <code>flow enhance --dry-run</code> to preview changes</li>
              <li>Review the suggested enhancements</li>
              <li>Run <code>flow enhance</code> to apply improvements</li>
              <li>Test the enhanced migration in staging</li>
              <li>Deploy to production with confidence</li>
            </ol>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-800 mb-2">✅ Safety Guidelines</h3>
            <ul className="text-sm text-green-700 space-y-1 list-disc list-inside">
              <li>Always create database backups before destructive operations</li>
              <li>Test enhanced migrations in staging environments first</li>
              <li>Review all safety warnings before proceeding</li>
              <li>Use <code>--dry-run</code> mode to preview changes</li>
              <li>Consider maintenance windows for blocking operations</li>
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-medium text-yellow-800 mb-2">⚡ Performance Tips</h3>
            <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
              <li>Let Flow's smart analysis guide index decisions</li>
              <li>Use concurrent operations for large tables</li>
              <li>Batch similar operations together</li>
              <li>Consider partial indexes for large datasets</li>
              <li>Monitor index usage after deployment</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Related Commands */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Related Commands</h2>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium mb-2">
              <a href="/docs/flow/validate" className="text-blue-600 hover:text-blue-800">
                🔍 flow validate
              </a>
            </h3>
            <p className="text-sm text-gray-600">
              Validate migrations for potential issues without applying enhancements
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium mb-2">
              <a href="/docs/flow/plan" className="text-blue-600 hover:text-blue-800">
                📋 flow plan
              </a>
            </h3>
            <p className="text-sm text-gray-600">
              Preview enhancement changes without applying them
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <h3 className="font-medium mb-2">
              <a href="/docs/flow/status" className="text-blue-600 hover:text-blue-800">
                📊 flow status
              </a>
            </h3>
            <p className="text-sm text-gray-600">
              Check enhancement status and migration statistics
            </p>
          </div>
        </div>
      </section>
    </div>
  )
} 