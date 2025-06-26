import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/docs/flow/init')({
  component: FlowInitDoc,
})

function FlowInitDoc() {
  return (
    <div className="prose prose-lg max-w-4xl mx-auto p-6">
      <div className="not-prose mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
          🚀 flow init
        </h1>
        <p className="text-xl text-gray-600 mt-2">
          Initialize Flow in your project with automatic ORM detection
        </p>
      </div>

      {/* Quick Start */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>
        
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm mb-4">
          <span className="text-gray-500"># Initialize Flow in current directory</span><br/>
          <span className="text-yellow-400">$</span> flow init<br/><br/>
          
          <span className="text-gray-500"># Non-interactive mode with defaults</span><br/>
          <span className="text-yellow-400">$</span> flow init --yes<br/><br/>
          
          <span className="text-gray-500"># Initialize with custom database URL</span><br/>
          <span className="text-yellow-400">$</span> flow init --db-url postgresql://user:pass@localhost:5432/mydb
        </div>
      </section>

      {/* What it does */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">What Flow Init Does</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-3 text-blue-700">🔍 Auto-Detection</h3>
            <ul className="space-y-2 text-sm">
              <li>• Detects Prisma, Drizzle, or TypeORM</li>
              <li>• Finds database connection strings</li>
              <li>• Locates migration directories</li>
              <li>• Identifies project structure</li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-3 text-green-700">⚙️ Configuration</h3>
            <ul className="space-y-2 text-sm">
              <li>• Creates flow.config.json</li>
              <li>• Sets up environment configs</li>
              <li>• Configures safety settings</li>
              <li>• Adds npm scripts</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Generated Config */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Generated Configuration</h2>
        
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
          <span className="text-gray-500">// flow.config.json</span><br/>
          <span className="text-blue-400">{'{'}</span><br/>
          <span className="ml-2 text-yellow-400">"version":</span> <span className="text-green-400">"0.1.0"</span>,<br/>
          <span className="ml-2 text-yellow-400">"defaultEnvironment":</span> <span className="text-green-400">"development"</span>,<br/>
          <span className="ml-2 text-yellow-400">"orm":</span> <span className="text-green-400">"drizzle"</span>,<br/>
          <span className="ml-2 text-yellow-400">"environments":</span> <span className="text-blue-400">{'{'}</span><br/>
          <span className="ml-4 text-yellow-400">"development":</span> <span className="text-blue-400">{'{'}</span><br/>
          <span className="ml-6 text-yellow-400">"db_connection_string":</span> <span className="text-green-400">"postgresql://..."</span>,<br/>
          <span className="ml-6 text-yellow-400">"migrationsPath":</span> <span className="text-green-400">"./drizzle/migrations"</span><br/>
          <span className="ml-4 text-blue-400">{'}'}</span><br/>
          <span className="ml-2 text-blue-400">{'}'}</span>,<br/>
          <span className="ml-2 text-yellow-400">"safety":</span> <span className="text-blue-400">{'{'}</span><br/>
          <span className="ml-4 text-yellow-400">"maxTableSizeMB":</span> <span className="text-cyan-400">1024</span>,<br/>
          <span className="ml-4 text-yellow-400">"maxLockTimeMs":</span> <span className="text-cyan-400">300000</span><br/>
          <span className="ml-2 text-blue-400">{'}'}</span><br/>
          <span className="text-blue-400">{'}'}</span>
        </div>
      </section>
    </div>
  )
} 