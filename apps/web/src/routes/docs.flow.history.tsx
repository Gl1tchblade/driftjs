import { createFileRoute } from "@tanstack/react-router";
import { CodeBlock } from "@/components/ui/code-block";

function FlowHistoryPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-4 text-4xl font-semibold lowercase">history</h1>
      <p className="text-muted-foreground mb-8">
        <code>flow history</code> shows the chronological log of every migration
        execution including operator, duration, and success status. Useful for
        auditing and incident analysis.
      </p>

      <h2 className="mb-2 text-xl font-medium lowercase">tail latest</h2>
      <CodeBlock language="bash" code={`flow history --limit 20`} />
    </section>
  );
}

export const Route = createFileRoute("/docs/flow/history")({
  component: FlowHistoryPage,
}); 