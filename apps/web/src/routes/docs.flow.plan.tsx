import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/docs/flow/plan')({
  component: FlowPlanDoc,
})

function FlowPlanDoc() {
  return (
    <div className="prose prose-lg max-w-4xl mx-auto p-6">
      <div className="not-prose mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
          📋 flow plan
        </h1>
        <p className="text-xl text-gray-600 mt-2">
          Preview enhancement changes without applying them
        </p>
      </div>

      {/* Quick Start */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>
        
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-4">
          <span className="text-gray-500"># Plan enhancements for latest migration</span><br/>
          <span className="text-yellow-400">$</span> flow plan<br/><br/>
          
          <span className="text-gray-500"># Plan specific migration file</span><br/>
          <span className="text-yellow-400">$</span> flow plan migrations/add_users.sql<br/><br/>
          
          <span className="text-gray-500"># Detailed analysis output</span><br/>
          <span className="text-yellow-400">$</span> flow plan --verbose
        </div>
      </section>

      {/* Example Output */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Example Planning Output</h2>
        
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
          <div className="text-cyan-400 mb-2">📋 Enhancement Plan for: add_users_table.sql</div>
          <br/>
          <div className="text-yellow-400">🛡️ Safety Enhancements (3 found):</div>
          <div className="ml-4 space-y-1 text-sm">
            <div className="text-red-400">• Transaction Wrapper - Wrap operations in BEGIN/COMMIT</div>
            <div className="text-orange-400">• Drop Table Safeguard - Add IF EXISTS clause</div>
            <div className="text-yellow-400">• Backup Recommendation - Suggest backup before destructive ops</div>
          </div>
          <br/>
          <div className="text-green-400">⚡ Speed Enhancements (2 found):</div>
          <div className="ml-4 space-y-1 text-sm">
            <div className="text-green-400">• Concurrent Index - Make index creation non-blocking</div>
            <div className="text-blue-400">• Batch Insert - Optimize multiple INSERT statements</div>
          </div>
          <br/>
          <div className="text-white">📊 Impact Analysis:</div>
          <div className="ml-4 space-y-1 text-sm">
            <div>• Risk Reduction: <span className="text-green-400">High</span></div>
            <div>• Performance Impact: <span className="text-blue-400">Medium</span></div>
            <div>• Complexity Added: <span className="text-yellow-400">Low</span></div>
          </div>
        </div>
      </section>
    </div>
  )
} 