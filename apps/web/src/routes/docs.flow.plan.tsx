import { createFileRoute } from '@tanstack/react-router'
import { CodeBlock } from '@/components/ui/code-block'

export const Route = createFileRoute('/docs/flow/plan')({
  component: FlowPlanDoc,
})

function FlowPlanDoc() {
  return (
    <div className="prose prose-lg max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="not-prose mb-8">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-500 to-pink-500 bg-clip-text text-transparent">
          📋 flow plan
        </h1>
        <p className="text-xl text-gray-600 dark:text-zinc-300 mt-2">
          Preview enhancement changes for a migration file without applying them. See exactly what Flow
          would modify before committing any changes.
        </p>
      </div>

      {/* Quick Start */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Quick Start</h2>

        <CodeBlock
          variant="default"
          code={`# Preview enhancements for latest migration
$ flow plan

# Preview enhancements for specific file
$ flow plan migrations/20240101000001_add_users.sql

# Generate plan for specific project
$ flow plan --project ./backend`}
        />
      </section>

      {/* Overview */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Overview</h2>
        <p>
          The <code>flow plan</code> command is your dry-run preview that shows exactly what changes Flow
          would make to your migration files. Perfect for code reviews, verification and learning what
          Flow's enhancements do.
        </p>

        <div className="callout callout-blue">
          <p className="m-0 text-sm">
            💡 Pipe the output to a markdown file and post it in your PR description for an instant
            migration review.
          </p>
        </div>
      </section>

      {/* Example Plan Session */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">Example Plan Session</h2>

        <div className="bg-gray-900 text-green-400 p-6 rounded-lg font-mono text-sm not-prose overflow-x-auto">
          <div className="text-cyan-400 mb-4 whitespace-pre">
{`╭──────────────────────────────────────╮
│                Flow                  │
│     Migration Enhancement Planner    │
╰──────────────────────────────────────╯`}
          </div>

          <div className="space-y-1">
            <span className="text-blue-400">●  ℹ️  Planning: 20240101000001_add_users.sql</span>
            <span className="text-green-400">◇  ✨ Suggesting 3 safety fixes, 2 performance boosts</span>
            <br />
            <span className="text-yellow-400">+ BEGIN;  -- wrap in transaction</span>
            <span className="text-yellow-400">+ CREATE INDEX CONCURRENTLY idx_users_email ON users(email);</span>
            <span className="text-yellow-400">~ ALTER TABLE users ADD COLUMN status VARCHAR(50) DEFAULT 'active';</span>
            <span className="text-blue-400">… (2 additional changes omitted)</span>
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
              <td>Migration file to plan for (optional, defaults to latest)</td>
            </tr>
            <tr>
              <td><code>--project &lt;path&gt;</code></td>
              <td>Path to your project directory</td>
            </tr>
            <tr>
              <td><code>--format &lt;fmt&gt;</code></td>
              <td>Output format (text, json, markdown)</td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* CI/CD Example */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-4">CI/CD Example</h2>

        <CodeBlock
          variant="fancy"
          language="yaml"
          code={`# GitHub Actions: Comment PR with Enhancement Plan
- name: Generate Enhancement Plan
  run: flow plan --format markdown > enhancement-plan.md
- name: Comment PR with Plan
  uses: actions/github-script@v6
  with:
    script: |
      const fs = require('fs');
      const plan = fs.readFileSync('enhancement-plan.md', 'utf8');
      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: \
\`## 🚀 Flow Enhancement Plan\n\n\${plan}\`});`}
        />
      </section>

      {/* Related Commands */}
      <section>
        <h2 className="text-2xl font-semibold mb-4">Related Commands</h2>
        <div className="grid md:grid-cols-3 gap-4 not-prose">
          <RelatedCard href="/docs/flow/validate" title="🔍 flow validate" desc="Validate migrations for potential issues" />
          <RelatedCard href="/docs/flow/enhance" title="🚀 flow enhance" desc="Apply safety + performance enhancements" />
          <RelatedCard href="/docs/flow/status" title="📊 flow status" desc="Check enhancement status and stats" />
        </div>
      </section>
    </div>
  )
}

function RelatedCard({ href, title, desc }: { href: string; title: string; desc: string }) {
  return (
    <a
      href={href}
      className="block rounded-lg border border-zinc-700/60 bg-zinc-800/40 p-4 hover:border-pink-500 hover:shadow-md transition-colors"
    >
      <h3 className="font-medium mb-1 text-pink-400">{title}</h3>
      <p className="text-sm text-zinc-300">{desc}</p>
    </a>
  );
} 