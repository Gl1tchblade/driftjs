import { createFileRoute } from "@tanstack/react-router";
import { CodeBlock } from "@/components/ui/code-block";

function FlowQuickStartPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-4xl font-semibold lowercase">quick start</h1>
      <p className="text-muted-foreground mb-8">
        A minimal walkthrough that gets you from zero to your first flow migration in
        under two minutes.
      </p>

      <div className="space-y-10">
        {/* 1. Initialise project */}
        <div>
          <h2 className="mb-2 text-xl font-medium lowercase">1. initialise</h2>
          <p className="mb-4 text-muted-foreground">
            Create the <code>migrations/</code> folder and a config file.
          </p>
          <CodeBlock language="bash" code={`flow init`} />
        </div>

        {/* 2. Generate migration */}
        <div>
          <h2 className="mb-2 text-xl font-medium lowercase">2. generate</h2>
          <p className="mb-4 text-muted-foreground">
            Generate a timestamped migration by passing raw SQL or letting Flow
            diff your database schema.
          </p>
          <CodeBlock language="bash" code={`flow generate "ALTER TABLE users ADD COLUMN bio text;"`} />
        </div>

        {/* 3. Apply migration */}
        <div>
          <h2 className="mb-2 text-xl font-medium lowercase">3. apply</h2>
          <p className="mb-4 text-muted-foreground">
            Apply pending migrations. Flow performs safety analysis and runs the
            changes online with zero downtime.
          </p>
          <CodeBlock language="bash" code={`flow apply`} />
        </div>
      </div>
    </section>
  );
}

export const Route = createFileRoute("/docs/flow/quick-start")({
  component: FlowQuickStartPage,
}); 