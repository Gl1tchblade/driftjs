import { createFileRoute } from "@tanstack/react-router";
import { CodeBlock } from "@/components/ui/code-block";

function FlowRollbackPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-4 text-4xl font-semibold lowercase">rollbacks</h1>

      <p className="text-muted-foreground mb-6">
        Even with rigorous safety checks mistakes happen. Flow supports
        <em>instant</em> rollbacks without restoring a snapshot — it flips
        replication-safe metadata so your application sees the previous schema
        immediately.
      </p>

      <h2 className="mb-2 text-xl font-medium lowercase">creating reversible migrations</h2>
      <p className="text-muted-foreground mb-4">
        Each migration can declare a <code>--&nbsp;rollback</code> section. Flow
        executes that section when you run <code>flow rollback</code>.
      </p>

      <CodeBlock
        language="sql"
        code={`-- 20250706101530_add_bio.sql

ALTER TABLE users ADD COLUMN bio text;

-- rollback
ALTER TABLE users DROP COLUMN bio;`}
      />

      <h2 className="mb-2 text-xl font-medium lowercase">rolling back latest migration</h2>
      <CodeBlock language="bash" code={`flow rollback`} />

      <h2 className="mb-2 text-xl font-medium lowercase">rolling back to a tag</h2>
      <p className="text-muted-foreground mb-4">
        Use <code>--to</code> to revert multiple migrations at once until the given
        file (exclusive):
      </p>
      <CodeBlock language="bash" code={`flow rollback --to 20250706101530_add_bio.sql`} />

      <h2 className="mb-2 text-xl font-medium lowercase">safety constraints</h2>
      <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
        <li>Rollbacks run <em>offline</em> changes in a background table swap just
          like forward migrations.</li>
        <li>Foreign-key dependencies are respected — Flow refuses to drop columns
          referenced by another table.</li>
        <li>Rollback scripts are linted the same way as forward scripts.</li>
      </ul>
    </section>
  );
}

export const Route = createFileRoute("/docs/flow/rollback")({
  component: FlowRollbackPage,
}); 