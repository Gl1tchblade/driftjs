import { createFileRoute } from "@tanstack/react-router";
import { CodeBlock } from "@/components/ui/code-block";

function FlowStatusPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-4 text-4xl font-semibold lowercase">status</h1>
      <p className="text-muted-foreground mb-8">
        <code>flow status</code> prints a concise overview of the current state of
        migrations on your target database: which migrations have been applied,
        which are pending and whether there is drift between code and database.
      </p>

      <h2 className="mb-2 text-xl font-medium lowercase">basic usage</h2>
      <CodeBlock language="bash" code={`flow status`} />

      <h2 className="mb-2 text-xl font-medium lowercase">output fields</h2>
      <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
        <li>
          <strong>Version</strong> – timestamp of the migration file.
        </li>
        <li>
          <strong>Name</strong> – descriptive part of the file name.
        </li>
        <li>
          <strong>Applied at</strong> – UTC date when it was executed.
        </li>
        <li>
          <strong>Checksum</strong> – SHA-256 of the file; if this differs from the DB
          record Flow reports drift.
        </li>
      </ul>

      <h2 className="mb-2 text-xl font-medium lowercase">json mode</h2>
      <CodeBlock language="bash" code={`flow status --json > report.json`} />
      <p className="text-muted-foreground">
        Machine-friendly output for CI pipelines.
      </p>
    </section>
  );
}

export const Route = createFileRoute("/docs/flow/status")({
  component: FlowStatusPage,
}); 