import { createFileRoute } from "@tanstack/react-router";
import { CodeBlock } from "@/components/ui/code-block";

function FlowCIPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <h1 className="mb-4 text-4xl font-semibold lowercase">ci/cd integration</h1>

      <p className="text-muted-foreground mb-6">
        Automate migrations as part of your deployment workflow. Flow runs great
        in CI because it is a single static binary with no external
        dependencies.
      </p>

      <h2 className="mb-2 text-xl font-medium lowercase">github actions</h2>
      <p className="text-muted-foreground mb-4">Add this step to your pipeline:</p>
      <CodeBlock
        language="yaml"
        code={`jobs:
  migrate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oven-sh/setup-bun@v1  # bun runtime for lightning-fast install
      - run: bunx @driftjs/flow apply --verbose
        env:
          FLOW_DATABASE_URL: $PROD_DATABASE_URL`}
      />

      <h2 className="mb-2 text-xl font-medium lowercase">gitlab ci</h2>
      <CodeBlock
        language="yaml"
        code={`migrate:
  image: oven/bun:latest
  script:
    - bunx @driftjs/flow apply --dry-run
  variables:
    FLOW_DATABASE_URL: $PROD_DATABASE_URL`}
      />

      <h2 className="mb-2 text-xl font-medium lowercase">recommended flow</h2>
      <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
        <li>Generate migrations locally and commit them to your repo.</li>
        <li>CI runs <code>flow apply --dry-run</code> to validate PRs.</li>
        <li>On merge to <code>main</code>, CI executes <code>flow apply</code> against
          production.</li>
      </ol>
    </section>
  );
}

export const Route = createFileRoute("/docs/flow/ci")({
  component: FlowCIPage,
}); 