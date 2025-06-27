import { createFileRoute } from "@tanstack/react-router";
import DocsLayout from "@/components/docs/docs-layout"

export const Route = createFileRoute("/docs/flow/validate")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <DocsLayout>
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <h1>🔍 flow validate</h1>
        <p className="lead">
          Validate database migrations for potential safety issues and problems before applying enhancements or running migrations.
        </p>

        <h2>Quick Start</h2>
        <pre>
          <code>
{`# Validate latest migration automatically
flow validate

# Validate specific migration file  
flow validate migrations/20240101000001_add_users.sql

# Validate in specific project directory
flow validate --project ./backend`}
          </code>
        </pre>

        <h2>Overview</h2>
        <p>
          The <code>flow validate</code> command performs a comprehensive safety analysis on your migration files without making any changes. It's perfect for CI/CD pipelines, pre-commit hooks, and general development workflows to catch issues early.
        </p>

        <h2>What It Validates</h2>
        <h3>🛡️ Safety Issues</h3>
        <ul>
            <li>Unsafe NOT NULL column additions</li>
            <li>DROP operations without backup recommendations</li>
            <li>Long-locking operations</li>
            <li>Risky CASCADE DELETE operations</li>
            <li>Unsafe data type changes</li>
            <li>Constraint violations</li>
        </ul>

        <h3>⚡ Performance Opportunities</h3>
        <ul>
            <li>Missing beneficial indexes</li>
            <li>Operations that could be made concurrent</li>
            <li>Large operations that could be batched</li>
        </ul>

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

        <h2>Integration Example (CI/CD)</h2>
        <pre>
          <code>
{`# GitHub Actions Workflow
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
          </code>
        </pre>
      </div>
    </DocsLayout>
  );
} 