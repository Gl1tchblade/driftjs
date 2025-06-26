import { createFileRoute } from "@tanstack/react-router";
import { CodeBlock } from "@/components/ui/code-block";

function FlowValidatePage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-4 text-4xl font-semibold lowercase">validate</h1>
      <p className="text-muted-foreground mb-8">
        <code>flow validate</code> checks that every applied migration matches the
        checksum of the file on disk and that the migration sequence has no
        gaps. Run this in CI to guarantee consistency between code and
        production.
      </p>

      <h2 className="mb-2 text-xl font-medium lowercase">exit codes</h2>
      <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
        <li><strong>0</strong> – all good.</li>
        <li><strong>2</strong> – checksum mismatch.</li>
        <li><strong>3</strong> – missing migration file.</li>
      </ul>

      <h2 className="mb-2 text-xl font-medium lowercase">ci example</h2>
      <CodeBlock language="bash" code={`flow validate --json > validate.json`} />
    </section>
  );
}

export const Route = createFileRoute("/docs/flow/validate")({
  component: FlowValidatePage,
}); 