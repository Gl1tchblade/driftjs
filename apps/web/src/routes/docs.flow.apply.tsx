import { createFileRoute } from "@tanstack/react-router";
import { CodeBlock } from "@/components/ui/code-block";

function FlowApplyPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-4 text-4xl font-semibold lowercase">apply migrations</h1>

      <p className="text-muted-foreground mb-8">
        <code>flow apply</code> executes all pending migration files against the
        target database. Before touching data it <em>analyzes</em> every statement
        to ensure the operation can run online — if a migration fails the checks
        Flow aborts <strong>before</strong> any change is committed.
      </p>

      <h2 className="mb-2 text-xl font-medium lowercase">basic usage</h2>
      <CodeBlock language="bash" code={`flow apply`} />

      <p className="text-muted-foreground mb-6">
        By default Flow reads <code>FLOW_DATABASE_URL</code> from the environment or
        the <code>database</code> field in <code>flow.json</code>.
      </p>

      <h2 className="mb-2 text-xl font-medium lowercase">safety analysis</h2>
      <p className="text-muted-foreground mb-4">
        Prior to execution every statement goes through these checks:
      </p>
      <ul className="mb-8 list-disc space-y-2 pl-5 text-muted-foreground">
        <li>Locks &gt; 1&nbsp;sec on tables with &gt;10k rows are rejected.</li>
        <li>Column/type changes that require full table rebuild are re-written to
          online variants (copy table, swap).</li>
        <li>Foreign-key drops on referenced tables are blocked.</li>
      </ul>

      <h2 className="mb-2 text-xl font-medium lowercase">dry-run / plan mode</h2>
      <CodeBlock language="bash" code={`flow apply --dry-run`} />
      <p className="text-muted-foreground mb-8">
        Generates the full execution plan, prints advisory locks and estimated
        runtime without executing any SQL.
      </p>

      <h2 className="mb-2 text-xl font-medium lowercase">verbose logging</h2>
      <CodeBlock language="bash" code={`flow apply --verbose`} />
      <p className="text-muted-foreground mb-8">
        Streams the progress of each migration step including lock wait times,
        statement retries and replication lag monitoring.
      </p>

      <h2 className="mb-2 text-xl font-medium lowercase">applying a single migration</h2>
      <p className="text-muted-foreground mb-4">
        Pass the file name to apply only one migration (useful during
        development):
      </p>
      <CodeBlock language="bash" code={`flow apply 20250706101530_add_users.sql`} />

      <h2 className="mb-2 text-xl font-medium lowercase">environment overrides</h2>
      <CodeBlock
        language="bash"
        code={`FLOW_DATABASE_URL="postgres://ci@localhost/test" flow apply`}
      />
      <p className="text-muted-foreground">
        This is handy in CI pipelines when the URL differs per environment.
      </p>
    </section>
  );
}

export const Route = createFileRoute("/docs/flow/apply")({
  component: FlowApplyPage,
}); 