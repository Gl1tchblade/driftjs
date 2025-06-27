import { createFileRoute } from "@tanstack/react-router";
import { CodeBlock } from "@/components/ui/code-block";
import { CodeBlockSwitcher } from "@/components/ui/code-block-switcher";

function FlowInstallationPage() {
  return (
    <section className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-4 text-4xl font-semibold lowercase">install flow cli</h1>
      <p className="text-muted-foreground mb-8">
        Install the Flow CLI using your preferred package manager or runner.
      </p>

      <CodeBlockSwitcher
        id="flow-install"
        variant="fancy"
        variants={[
          { label: "npm", code: "npm install -g @driftjs/flow\nflow --help" },
          { label: "pnpm", code: "pnpm add -g @driftjs/flow\nflow --help" },
          { label: "bun", code: "bun add -g @driftjs/flow\nflow --help" },
        ]}
      />
    </section>
  );
}

export const Route = createFileRoute("/docs/flow/installation")({
  component: FlowInstallationPage,
}); 