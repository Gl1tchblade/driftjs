import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/docs/flow/config')({
  component: FlowConfigDoc,
})

function FlowConfigDoc() {
  return (
    <div className="prose prose-lg max-w-4xl mx-auto p-6">
      <div className="not-prose mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
          ⚙️ flow config
        </h1>
        <p className="text-xl text-gray-600 mt-2">
          Configure Flow settings and manage multiple environments
        </p>
      </div>

      {/* Configuration File */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Configuration File Structure</h2>
        
        <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
          <span className="text-gray-500">// flow.config.json</span><br/>
          <span className="text-blue-400">{'{'}</span><br/>
          <span className="ml-2 text-yellow-400">"version":</span> <span className="text-green-400">"0.1.0"</span>,<br/>
          <span className="ml-2 text-yellow-400">"defaultEnvironment":</span> <span className="text-green-400">"development"</span>,<br/>
          <span className="ml-2 text-yellow-400">"orm":</span> <span className="text-green-400">"drizzle"</span>,<br/>
          <span className="ml-2 text-yellow-400">"environments":</span> <span className="text-blue-400">{'{'}</span><br/>
          <span className="ml-4 text-yellow-400">"development":</span> <span className="text-blue-400">{'{'}</span><br/>
          <span className="ml-6 text-yellow-400">"db_connection_string":</span> <span className="text-green-400">"postgresql://localhost:5432/dev"</span>,<br/>
          <span className="ml-6 text-yellow-400">"migrationsPath":</span> <span className="text-green-400">"./migrations"</span><br/>
          <span className="ml-4 text-blue-400">{'}'}</span>,<br/>
          <span className="ml-4 text-yellow-400">"production":</span> <span className="text-blue-400">{'{'}</span><br/>
          <span className="ml-6 text-yellow-400">"db_connection_string":</span> <span className="text-green-400">"$DATABASE_URL"</span>,<br/>
          <span className="ml-6 text-yellow-400">"migrationsPath":</span> <span className="text-green-400">"./migrations"</span><br/>
          <span className="ml-4 text-blue-400">{'}'}</span><br/>
          <span className="ml-2 text-blue-400">{'}'}</span>,<br/>
          <span className="ml-2 text-yellow-400">"safety":</span> <span className="text-blue-400">{'{'}</span><br/>
          <span className="ml-4 text-yellow-400">"maxTableSizeMB":</span> <span className="text-cyan-400">1024</span>,<br/>
          <span className="ml-4 text-yellow-400">"maxLockTimeMs":</span> <span className="text-cyan-400">300000</span><br/>
          <span className="ml-2 text-blue-400">{'}'}</span>,<br/>
          <span className="ml-2 text-yellow-400">"enhancements":</span> <span className="text-blue-400">{'{'}</span><br/>
          <span className="ml-4 text-yellow-400">"enableSafetyEnhancements":</span> <span className="text-cyan-400">true</span>,<br/>
          <span className="ml-4 text-yellow-400">"enableSpeedEnhancements":</span> <span className="text-cyan-400">true</span>,<br/>
          <span className="ml-4 text-yellow-400">"disabledEnhancements":</span> <span className="text-blue-400">[]</span><br/>
          <span className="ml-2 text-blue-400">{'}'}</span><br/>
          <span className="text-blue-400">{'}'}</span>
        </div>
      </section>

      {/* Commands */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Configuration Commands</h2>
        
        <div className="space-y-4">
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm">
            <span className="text-gray-500"># View current configuration</span><br/>
            <span className="text-yellow-400">$</span> flow config show<br/><br/>
            
            <span className="text-gray-500"># Set database URL for environment</span><br/>
            <span className="text-yellow-400">$</span> flow config set development.db_connection_string "postgresql://..."<br/><br/>
            
            <span className="text-gray-500"># Enable/disable enhancements</span><br/>
            <span className="text-yellow-400">$</span> flow config set enhancements.enableSpeedEnhancements false<br/><br/>
            
            <span className="text-gray-500"># Add new environment</span><br/>
            <span className="text-yellow-400">$</span> flow config add-env staging
          </div>
        </div>
      </section>
    </div>
  )
} 