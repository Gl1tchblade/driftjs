import { createFileRoute } from '@tanstack/react-router'
import { CodeBlock } from '@/components/ui/code-block'

export const Route = createFileRoute('/docs/flow/config')({
  component: FlowConfigDoc,
})

function FlowConfigDoc() {
  return (
    <div className="prose prose-lg max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="not-prose mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-500 to-gray-400 bg-clip-text text-transparent">
          ⚙️ flow config
        </h1>
        <p className="text-xl text-gray-600 dark:text-zinc-300 mt-2">
          Manage Flow configuration files and environment variables.
        </p>
      </div>

      {/* Quick Start */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>
        <CodeBlock
          variant="default"
          code={`# Show current configuration
$ flow config show

# Set database URL for development
$ flow config set development.db_url "postgres://user:pass@localhost/db"

# Switch to production environment
$ flow config use production`}
        />
      </section>

      {/* Overview */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Overview</h2>
        <p>
          Flow stores its settings in a simple <code>flow.config.json</code> file at your project root.
          Each top-level key is an <em>environment</em> (development, staging, production, …). You can
          override any value via <code>FLOW_*</code> environment variables which take precedence at runtime.
        </p>
        <div className="callout callout-blue">
          <p className="m-0 text-sm">
            Hint: commit <code>flow.config.json</code> to version control <strong>without</strong> passwords &amp;
            use environment variables for secrets in CI/CD.
          </p>
        </div>
      </section>

      {/* Common Keys */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Common Configuration Keys</h2>
        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>db_url</code></td>
              <td>Postgres connection string used for migrations</td>
            </tr>
            <tr>
              <td><code>migrations_dir</code></td>
              <td>Directory of <code>.sql</code> files (default <code>migrations/</code>)</td>
            </tr>
            <tr>
              <td><code>enhancements.auto_apply</code></td>
              <td>Automatically run <code>flow enhance</code> after generation (<code>true/false</code>)</td>
            </tr>
            <tr>
              <td><code>schema</code></td>
              <td>Target schema name (default <code>public</code>)</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Related */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Related Commands</h2>
        <div className="grid md:grid-cols-3 gap-4 not-prose">
          <RelatedCard href="/docs/flow/init" title="🚀 flow init" desc="Bootstrap Flow & create config" />
          <RelatedCard href="/docs/flow/status" title="📊 flow status" desc="View migration + config info" />
          <RelatedCard href="/docs/flow/enhance" title="🚀 flow enhance" desc="Apply safety/perf improvements" />
        </div>
      </section>
    </div>
  )
}

function RelatedCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <a
      href={href}
      className="block rounded-lg border border-zinc-700/60 bg-zinc-800/40 p-4 hover:border-gray-400 hover:shadow-md transition-colors"
    >
      <h3 className="font-medium mb-1 text-gray-300">{title}</h3>
      <p className="text-sm text-zinc-300">{desc}</p>
    </a>
  )
} 