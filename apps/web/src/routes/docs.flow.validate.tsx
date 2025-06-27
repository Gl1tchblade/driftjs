import { createFileRoute } from "@tanstack/react-router";
import { CodeBlock } from "@/components/ui/code-block";

export const Route = createFileRoute("/docs/flow/validate")({
  component: FlowValidateDoc,
});

function FlowValidateDoc() {
  return (
    <div className="prose prose-lg max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="not-prose mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-sky-500 to-indigo-400 bg-clip-text text-transparent">
          🔍 flow validate
        </h1>
        <p className="text-xl text-gray-600 dark:text-zinc-300 mt-2">
          Validate database migrations for potential safety issues and performance problems before applying enhancements or running migrations.
        </p>
      </div>

      {/* Quick Start */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>

        <CodeBlock
          variant="default"
          code={`# Validate latest migration automatically
$ flow validate

# Validate specific migration file
$ flow validate migrations/20240101000001_add_users.sql

# Validate in specific project directory
$ flow validate --project ./backend`
          }
        />
      </section>

      {/* Overview */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Overview</h2>
        <p>
          The <code>flow validate</code> command performs a comprehensive analysis on your migration
          files without making any changes. It is perfect for CI/CD pipelines, pre-commit hooks and
          general development workflows to catch issues early.
        </p>

        <div className="callout callout-blue">
          <p className="m-0 text-sm">
            <strong>Tip:</strong> Combine <code>flow validate</code> with <code>flow plan</code> in your CI to
            both <em>detect</em> and <em>explain</em> proposed changes automatically.
          </p>
        </div>
      </section>

      {/* What It Validates */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">What It Validates</h2>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="callout callout-red">
            <h3 className="font-medium mb-2">🛡️ Safety Issues</h3>
            <ul className="space-y-1 text-sm">
              <li>Unsafe <code>NOT NULL</code> column additions</li>
              <li>DROP operations without backup recommendations</li>
              <li>Long-locking operations</li>
              <li>Risky <code>CASCADE DELETE</code> operations</li>
              <li>Unsafe data-type changes</li>
              <li>Constraint violations</li>
            </ul>
          </div>

          <div className="callout callout-yellow">
            <h3 className="font-medium mb-2">⚡ Performance Opportunities</h3>
            <ul className="space-y-1 text-sm">
              <li>Missing beneficial indexes</li>
              <li>Operations that could be made concurrent</li>
              <li>Large operations that could be batched</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Example Validation Session */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Example Validation Session</h2>

        <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm not-prose overflow-x-auto">
          <div className="text-cyan-400 mb-4 whitespace-pre">
{`╭──────────────────────────────────────╮
│                Flow                  │
│  Migration Validation & Linting Tool │
╰──────────────────────────────────────╯`}
          </div>

          <div className="space-y-1">
            <span className="text-blue-400">●  ℹ️  Validating: 20240101000001_add_users.sql</span>
            <span className="text-orange-400">▲  ⚠️  Found 2 safety warnings, 1 performance hint</span>
            <span className="text-green-400">◇  ✅ Validation completed in 312ms</span>
            <br />
            <span className="text-yellow-400">⚠️  [Line 23] Long-running ALTER TABLE detected</span>
            <span className="text-yellow-400">⚠️  [Line 56] Dropping table without backup</span>
            <span className="text-blue-400">🛈  [Line 78] Consider creating index on &quot;email&quot;</span>
          </div>
        </div>
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
              <td><code>[file]</code></td>
              <td>Specific migration file to validate (optional, defaults to latest)</td>
            </tr>
            <tr>
              <td><code>--project &lt;path&gt;</code></td>
              <td>Path to your project directory</td>
            </tr>
            <tr>
              <td><code>--all</code></td>
              <td>Validate all migration files</td>
            </tr>
            <tr>
              <td><code>--json</code></td>
              <td>Output results in JSON format for scripting</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* Integration Example */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Integration Example (CI/CD)</h2>

        <CodeBlock
          variant="fancy"
          language="yaml"
          code={`# GitHub Actions Workflow
name: Validate Migrations
on: [push, pull_request]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Install Flow CLI
        run: npm install -g @driftjs/flow
      - name: Validate Migrations
        run: flow validate --all`}
        />
      </section>

      {/* Best Practices */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Best Practices</h2>

        <div className="space-y-4">
          <div className="callout callout-blue">
            <h3 className="font-medium mb-2">🔄 Development Workflow</h3>
            <ol className="list-decimal list-inside text-sm space-y-1">
              <li>Write or update your migration file</li>
              <li>Run <code>flow validate</code> locally</li>
              <li>Address any warnings or suggestions</li>
              <li>Commit with confidence &amp; open PR</li>
              <li>CI runs <code>flow validate --all</code></li>
              <li>Merge once the pipeline is green</li>
            </ol>
          </div>

          <div className="callout callout-green">
            <h3 className="font-medium mb-2">✅ Safety Guidelines</h3>
            <ul className="list-disc list-inside text-sm space-y-1">
              <li>Create database backups before destructive operations</li>
              <li>Test migrations in staging environments first</li>
              <li>Review all safety warnings before proceeding</li>
              <li>Use <code>--json</code> output for automated gating</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Related Commands */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Related Commands</h2>

        <div className="grid md:grid-cols-3 gap-4 not-prose">
          <RelatedCard href="/docs/flow/enhance" title="🚀 flow enhance" desc="Intelligently enhance migrations with safety and performance improvements" />
          <RelatedCard href="/docs/flow/plan" title="📋 flow plan" desc="Preview enhancement changes without applying them" />
          <RelatedCard href="/docs/flow/status" title="📊 flow status" desc="Check enhancement status and migration statistics" />
        </div>
      </section>
    </div>
  );
}

function RelatedCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <a
      href={href}
      className="block rounded-lg border border-zinc-700/60 bg-zinc-800/40 p-4 hover:border-sky-500 hover:shadow-md transition-colors"
    >
      <h3 className="font-medium mb-1 text-sky-400">{title}</h3>
      <p className="text-sm text-zinc-300">{desc}</p>
    </a>
  );
} 