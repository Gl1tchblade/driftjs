import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/docs/flow/rollback')({
  component: FlowRollbackDoc,
})

function FlowRollbackDoc() {
  return (
    <div className="prose prose-lg max-w-4xl mx-auto p-6">
      <div className="not-prose mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
          ↩️ flow rollback
        </h1>
        <p className="text-xl text-gray-600 mt-2">
          Safely rollback enhanced migrations with automatic down script generation
        </p>
      </div>

      {/* Quick Start */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>
        
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-4">
          <span className="text-gray-500"># Rollback latest migration</span><br/>
          <span className="text-yellow-400">$</span> flow rollback<br/><br/>
          
          <span className="text-gray-500"># Rollback specific migration</span><br/>
          <span className="text-yellow-400">$</span> flow rollback migrations/add_users.sql<br/><br/>
          
          <span className="text-gray-500"># Generate rollback script without executing</span><br/>
          <span className="text-yellow-400">$</span> flow rollback --generate-only
        </div>
      </section>

      {/* How it Works */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">How Rollback Works</h2>
        
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-800 mb-2">1. Analysis</h3>
            <p className="text-sm text-blue-700">
              Analyzes the enhanced migration to understand what changes were made
            </p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <h3 className="font-medium text-green-800 mb-2">2. Generation</h3>
            <p className="text-sm text-green-700">
              Generates appropriate DOWN script to reverse the changes safely
            </p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-medium text-orange-800 mb-2">3. Execution</h3>
            <p className="text-sm text-orange-700">
              Executes the rollback with safety checks and confirmations
            </p>
          </div>
        </div>
      </section>

      {/* Example Rollback */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Example Rollback Session</h2>
        
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
          <div className="text-yellow-400">$</div> flow rollback<br/><br/>
          
          <div className="text-cyan-400">↩️ Flow Rollback Process</div><br/>
          
          <div className="space-y-1 text-sm">
            <div className="text-blue-400">●  Analyzing migration: 20240101000001_add_users.sql</div>
            <div className="text-green-400">●  ✅ Enhanced migration detected</div>
            <div className="text-yellow-400">●  Generating rollback script...</div>
            <br/>
            <div className="text-orange-400">⚠️  This will reverse the following changes:</div>
            <div className="ml-4 text-sm">
              <div>• Drop table: users</div>
              <div>• Remove index: idx_users_email</div>
              <div>• Revert schema changes</div>
            </div>
            <br/>
            <div className="text-red-400">◇  Proceed with rollback? (y/N)</div>
            <div className="text-green-400">◇  ✅ Rollback completed successfully</div>
          </div>
        </div>
      </section>
    </div>
  )
} 