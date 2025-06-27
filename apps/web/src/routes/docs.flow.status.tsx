import { createFileRoute } from "@tanstack/react-router";
import { CodeBlock } from "@/components/ui/code-block";

export const Route = createFileRoute("/docs/flow/status")({
  component: FlowStatusDoc,
});

function FlowStatusDoc() {
  return (
    <div className="prose prose-lg max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="not-prose mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-lime-400 to-emerald-500 bg-clip-text text-transparent">
          📊 flow status
        </h1>
        <p className="text-xl text-gray-600 dark:text-zinc-300 mt-2">
          Show the status of all migrations in your project – which are pending, applied or need
          attention.
        </p>
      </div>

      {/* Quick Start */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>
        <CodeBlock
          variant="default"
          code={`# Show status of migrations
$ flow status

# Show status for a specific project
$ flow status --project ./backend`}
        />
      </section>

      {/* Overview */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Overview</h2>
        <p>
          The <code>flow status</code> command scans your migrations directory and prints a concise
          table with each file's execution state, checksum and enhancement version. Great for
          detecting drift between environments.
        </p>
      </section>

      {/* Example Output */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Example Output</h2>
        <CodeBlock
          variant="fancy"
          language="bash"
          code={`$ flow status
┌─────────────────────────────────────────┬─────────┬───────────────┬────────────┐
│ File                                    │ Applied │ Checksum      │ Enhanced?  │
├─────────────────────────────────────────┼─────────┼───────────────┼────────────┤
│ 20240101000001_add_users.sql            │ ✅      │ 9f2c7c1b      │ v1.3       │
│ 20240102000002_add_products.sql         │ ✅      │ a12b4d8e      │ —          │
│ 20240103000003_add_orders.sql           │ ❌      │ —            │ —          │
└─────────────────────────────────────────┴─────────┴───────────────┴────────────┘`}
        />
      </section>

      {/* Command Options */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Command Options</h2>
        <table>
          <thead>
            <tr>
              <th>Option</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>--project &lt;path&gt;</code></td>
              <td>Path to your project directory</td>
            </tr>
            <tr>
              <td><code>--format &lt;fmt&gt;</code></td>
              <td>Output format (table, json, markdown)</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Related Commands */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Related Commands</h2>
        <div className="grid md:grid-cols-3 gap-4 not-prose">
          <RelatedCard href="/docs/flow/validate" title="🔍 flow validate" desc="Validate migrations for potential issues" />
          <RelatedCard href="/docs/flow/plan" title="📋 flow plan" desc="Preview enhancements without applying" />
          <RelatedCard href="/docs/flow/enhance" title="🚀 flow enhance" desc="Apply safety + performance fixes" />
        </div>
      </section>
    </div>
  );
}

function RelatedCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <a
      href={href}
      className="block rounded-lg border border-zinc-700/60 bg-zinc-800/40 p-4 hover:border-lime-400 hover:shadow-md transition-colors"
    >
      <h3 className="font-medium mb-1 text-lime-300">{title}</h3>
      <p className="text-sm text-zinc-300">{desc}</p>
    </a>
  );
} 