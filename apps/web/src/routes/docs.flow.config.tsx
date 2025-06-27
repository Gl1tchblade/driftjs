import { createFileRoute } from '@tanstack/react-router'
import DocsLayout from '@/components/docs/docs-layout'

export const Route = createFileRoute('/docs/flow/config')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <DocsLayout>
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <h1>⚙️ flow config</h1>
        <p className="lead">
          Manage your Flow configuration.
        </p>

        <h2>Quick Start</h2>
        <pre>
          <code>
{`# Show current configuration
flow config`}
          </code>
        </pre>

        <h2>Overview</h2>
        <p>
          The <code>flow config</code> command displays the currently loaded <code>flow.config.json</code> file, including all environment settings.
        </p>
      </div>
    </DocsLayout>
  )
} 