import { createFileRoute } from '@tanstack/react-router'
import DocsLayout from '@/components/docs/docs-layout'

export const Route = createFileRoute('/docs/flow/plan')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <DocsLayout>
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <h1>📋 flow plan</h1>
        <p className="lead">
          Preview enhancement changes for a migration file without applying them. See exactly what Flow would modify before committing to any changes.
        </p>

        <h2>Quick Start</h2>
        <pre>
          <code>
{`# Preview enhancements for latest migration
flow plan

# Preview enhancements for specific file
flow plan migrations/20240101000001_add_users.sql

# Generate plan for specific project
flow plan --project ./backend`}
          </code>
        </pre>

        <h2>Overview</h2>
        <p>
          The <code>flow plan</code> command is your "dry-run preview" that shows exactly what changes Flow would make to your migration files. It's perfect for code reviews, verification, and learning what Flow's enhancements do.
        </p>

        <h2>Command Options</h2>
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
              <td><code>--format &lt;format&gt;</code></td>
              <td>Output format (text, json, markdown)</td>
            </tr>
          </tbody>
        </table>

        <h2>Integration Example (CI/CD)</h2>
        <p>
          You can use <code>flow plan</code> in your CI/CD pipeline to automatically comment on pull requests with a summary of proposed changes.
        </p>
        <pre>
          <code>
{`# GitHub Actions: Comment PR with Enhancement Plan
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
        body: \`## 🚀 Flow Enhancement Plan\n\n\${plan}\`
      });`}
          </code>
        </pre>
      </div>
    </DocsLayout>
  )
} 