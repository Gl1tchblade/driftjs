import { createFileRoute } from '@tanstack/react-router'
import DocsLayout from '@/components/docs/docs-layout'
import { CodeBlock } from '@/components/ui/code-block'

export const Route = createFileRoute('/docs/flow/init')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <DocsLayout>
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <h1>🚀 flow init</h1>
        <p className="lead">
          Initialize Flow in your project by creating a `flow.config.json` file.
        </p>

        <h2>Quick Start</h2>
        <CodeBlock
          variant="fancy"
          code={`# Initialize Flow interactively
$ flow init`}
        />

        <h2>Overview</h2>
        <p>
          The <code>flow init</code> command sets up your project to use Flow. It runs an interactive setup process to determine your database connection string, migrations folder, and ORM, then generates a <code>flow.config.json</code> file.
        </p>

        <h2>Interactive Setup</h2>
        <p>
          The interactive setup will ask you for:
        </p>
        <ul>
          <li><strong>Environment name:</strong> (e.g., development, production)</li>
          <li><strong>Database connection string:</strong> Flow will try to automatically detect this from your <code>.env</code> files.</li>
          <li><strong>Path to migrations folder:</strong> Flow will try to detect your migrations folder.</li>
        </ul>
      </div>
    </DocsLayout>
  )
} 