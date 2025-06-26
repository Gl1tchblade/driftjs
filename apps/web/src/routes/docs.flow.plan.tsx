import { createFileRoute } from "@tanstack/react-router";
import { CodeBlock } from "@/components/ui/code-block";

function FlowPlanPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-4 text-4xl font-semibold lowercase">plan</h1>
      <p className="text-muted-foreground mb-8">
        <code>flow plan</code> simulates the execution of pending migrations and
        outputs the exact SQL that will run, the order, and the safety-check
        verdict for each statement.
      </p>

      <h2 className="mb-2 text-xl font-medium lowercase">dry-run workflow</h2>
      <CodeBlock language="bash" code={`flow plan | less`} />

      <h2 className="mb-2 text-xl font-medium lowercase">example excerpt</h2>
      <CodeBlock language="sql" code={`-- 20250706101530_add_bio.sql (safe)
ALTER TABLE users ADD COLUMN bio text;

-- 20250707094500_create_posts.sql (unsafe)
ALTER TABLE posts DROP COLUMN title;  -- rejected, column in use`} />

      <p className="text-muted-foreground">
        `safe` / `unsafe` markers help you quickly spot problematic migrations
        during review.
      </p>
    </section>
  );
}

export const Route = createFileRoute("/docs/flow/plan")({
  component: FlowPlanPage,
}); 