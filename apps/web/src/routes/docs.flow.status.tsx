import { createFileRoute } from "@tanstack/react-router";
import DocsLayout from "@/components/docs/docs-layout";
import { CodeBlock } from "@/components/ui/code-block";

export const Route = createFileRoute("/docs/flow/status")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <DocsLayout>
      <div className="prose prose-gray dark:prose-invert max-w-none">
        <h1>📊 flow status</h1>
        <p className="lead">
          Show the status of all migrations in your project.
        </p>

        <h2>Quick Start</h2>
        <CodeBlock
          variant="fancy"
          code={`# Show status of migrations
$ flow status

# Show status for a specific project
$ flow status --project ./backend`}
        />

        <h2>Overview</h2>
        <p>
          The <code>flow status</code> command provides a quick overview of your migrations directory, listing all the SQL migration files it finds.
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
              <td><code>--project &lt;path&gt;</code></td>
              <td>Path to your project directory</td>
            </tr>
          </tbody>
        </table>
      </div>
    </DocsLayout>
  );
} 