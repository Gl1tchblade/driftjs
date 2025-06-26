import { createFileRoute } from "@tanstack/react-router";
import { CodeBlock } from "@/components/ui/code-block";

function FlowGeneratePage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-4 text-4xl font-semibold lowercase">generate migrations</h1>
      <p className="text-muted-foreground mb-6">
        Learn how Flow creates safe, timestamped migration files. There are two
        primary modes: <strong>raw</strong> SQL and <strong>schema diff</strong>.
      </p>

      {/* Raw SQL */}
      <div className="mb-12">
        <h2 className="mb-2 text-xl font-medium lowercase">raw sql mode</h2>
        <p className="text-muted-foreground mb-4">
          Pass the SQL you want to run directly. Flow wraps it with transactional
          guards and automatically names the migration file:
        </p>
        <CodeBlock
          language="bash"
          code={`flow generate "ALTER TABLE users ADD COLUMN bio text;"`}
        />
      </div>

      {/* Schema diff */}
      <div className="mb-12">
        <h2 className="mb-2 text-xl font-medium lowercase">schema diff mode</h2>
        <p className="text-muted-foreground mb-4">
          Alternatively, point Flow to your existing development database and let it
          diff against production (or another reference) to generate migration SQL
          automatically:
        </p>
        <CodeBlock
          language="bash"
          code={`flow generate --from dev_db_url --to prod_db_url`}
        />
      </div>

      {/* Naming conventions */}
      <div>
        <h2 className="mb-2 text-xl font-medium lowercase">file naming</h2>
        <p className="text-muted-foreground">
          Every generated file follows the pattern <code>YYYYMMDDHHMMSS_name.sql</code>
          which keeps your migrations sorted chronologically even during merges.
        </p>
      </div>
    </section>
  );
}

export const Route = createFileRoute("/docs/flow/generate")({
  component: FlowGeneratePage,
}); 