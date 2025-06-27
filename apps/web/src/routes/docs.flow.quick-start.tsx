import { createFileRoute } from "@tanstack/react-router";
import { CodeBlock } from "@/components/ui/code-block";

function FlowQuickStartPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-4xl font-semibold lowercase">quick start</h1>
      <p className="text-muted-foreground mb-8">
        Follow these steps to go from zero to <code>flow enhance</code> in less than two minutes.
      </p>

      <div className="space-y-10">
        {/* 1. Install CLI globally */}
        <div>
          <h2 className="mb-2 text-xl font-medium lowercase">1. install</h2>
          <p className="mb-4 text-muted-foreground">
            Install the Flow binary globally using your favourite package manager.
          </p>
          <CodeBlock
            variant="default"
            language="bash"
            code={`npm install -g @driftjs/flow  # or: bun add -g @driftjs/flow`}
          />
        </div>

        {/* 2. Initialize project */}
        <div>
          <h2 className="mb-2 text-xl font-medium lowercase">2. init</h2>
          <p className="mb-4 text-muted-foreground">
            Bootstrap your project: creates <code>flow.config.json</code> and <code>migrations/</code>.
          </p>
          <CodeBlock variant="default" language="bash" code={`flow init`} />
        </div>

        {/* 3. Add a migration */}
        <div>
          <h2 className="mb-2 text-xl font-medium lowercase">3. add migration</h2>
          <p className="mb-4 text-muted-foreground">
            Create a timestamped SQL file inside <code>migrations/</code>. Follow the
            <code>YYYYMMDDHHMMSS_description.sql</code> naming convention.
          </p>
          <CodeBlock
            variant="default"
            language="bash"
            code={`# add a timestamped SQL file (any editor)
$ touch migrations/$(date +%Y%m%d%H%M%S)_add_users.sql`} />

          {/* Prisma workflow */}
          <div className="callout callout-blue mt-6">
            <p className="m-0 text-sm">
              Using <strong>Prisma</strong>? Let it create the migration, then enhance:
            </p>
            <CodeBlock
              variant="fancy"
              language="bash"
              code={`# 1. Create a Prisma migration (SQL only)
$ npx prisma migrate dev --create-only --name add_users

# 2. Enhance & run it with Flow
$ flow plan prisma/migrations/*/migration.sql   # preview
$ flow enhance prisma/migrations/*/migration.sql # add safety & speed tweaks
$ flow apply`} />
          </div>

          {/* Now add Drizzle callout under Prisma */}
          <div className="callout callout-green mt-6">
            <p className="m-0 text-sm">
              Using <strong>Drizzle ORM</strong>? Generate the SQL migration, then enhance:
            </p>
            <CodeBlock
              variant="fancy"
              language="bash"
              code={`# 1. Generate SQL migration
$ drizzle-kit generate:pg

# 2. Enhance and run with Flow
$ flow plan drizzle/migrations/*/*.sql   # preview
$ flow enhance drizzle/migrations/*/*.sql # safety & speed tweaks
$ flow apply`} />
          </div>
        </div>

        {/* 4. Enhance & apply */}
        <div>
          <h2 className="mb-2 text-xl font-medium lowercase">4. enhance & apply</h2>
          <p className="mb-4 text-muted-foreground">
            Preview changes first, then apply with zero downtime.
          </p>
          <CodeBlock
            variant="default"
            language="bash"
            code={`# 1. Preview enhancements (safe, no files modified)
$ flow plan                           

# 2. Apply safety & performance tweaks to the migration file
$ flow enhance                        

# 3. Execute the enhanced migration against the database
$ flow apply`} />
        </div>
      </div>
    </section>
  );
}

export const Route = createFileRoute("/docs/flow/quick-start")({
  component: FlowQuickStartPage,
}); 