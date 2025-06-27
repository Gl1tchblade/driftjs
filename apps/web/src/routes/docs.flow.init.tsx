import { createFileRoute } from '@tanstack/react-router'
import { CodeBlock } from '@/components/ui/code-block'

export const Route = createFileRoute('/docs/flow/init')({
  component: FlowInitDoc,
})

function FlowInitDoc() {
  return (
    <div className="prose prose-lg max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="not-prose mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-500 to-fuchsia-500 bg-clip-text text-transparent">
          🚀 flow init
        </h1>
        <p className="text-xl text-gray-600 dark:text-zinc-300 mt-2">
          Bootstrap your project with Flow – creates <code>flow.config.json</code> and detects your ORM &amp; migrations folder.
        </p>
      </div>

      {/* Quick Start */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>
        <CodeBlock
          variant="default"
          code={`# Initialize Flow interactively
$ flow init`}
        />
      </section>

      {/* Overview */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Overview</h2>
        <p>
          <code>flow init</code> walks you through an interactive wizard to gather connection details
          and folder paths. When finished it writes a <code>flow.config.json</code> file you can commit
          to version control.
        </p>
      </section>

      {/* Interactive Prompts */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Interactive Prompts</h2>
        <table>
          <thead>
            <tr>
              <th>Prompt</th>
              <th>Example</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Environment name</td>
              <td><code>development</code></td>
            </tr>
            <tr>
              <td>Database connection string</td>
              <td><code>postgres://user:pass@localhost:5432/mydb</code></td>
            </tr>
            <tr>
              <td>Migrations folder</td>
              <td><code>migrations/</code></td>
            </tr>
            <tr>
              <td>ORM detected</td>
              <td>Prisma / Drizzle / Raw SQL</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Non-interactive mode */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Non-interactive Mode</h2>
        <CodeBlock
          variant="default"
          language="bash"
          code={`# Skip prompts and accept defaults
$ flow init --yes

# Provide everything upfront (CI environments)
$ flow init \
    --env production \
    --db-url $DATABASE_URL \
    --migrations-dir migrations`} />
      </section>

      {/* Related Commands */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Next Steps</h2>
        <div className="grid md:grid-cols-3 gap-4 not-prose">
          <RelatedCard href="/docs/flow/quick-start" title="🚀 Quick Start" desc="Go from init → enhance in 2 mins" />
          <RelatedCard href="/docs/flow/validate" title="🔍 flow validate" desc="Validate your first migration" />
          <RelatedCard href="/docs/flow/enhance" title="⚡ flow enhance" desc="Apply safety + performance tweaks" />
        </div>
      </section>
    </div>
  )
}

function RelatedCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <a
      href={href}
      className="block rounded-lg border border-zinc-700/60 bg-zinc-800/40 p-4 hover:border-fuchsia-400 hover:shadow-md transition-colors"
    >
      <h3 className="font-medium mb-1 text-fuchsia-300">{title}</h3>
      <p className="text-sm text-zinc-300">{desc}</p>
    </a>
  )
} 