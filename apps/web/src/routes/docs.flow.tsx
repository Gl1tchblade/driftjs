import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useRouterState } from "@tanstack/react-router";

function FlowDocsPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <>
      {pathname === "/docs/flow" && (
        <section className="mx-auto max-w-3xl px-4 py-16">
          <h1 className="mb-4 text-4xl font-semibold lowercase">
            <span className="gradient-text-static lowercase">flow</span> docs
          </h1>
          <div className="text-muted-foreground mb-6 space-y-3">
            <p>
              <strong>Flow</strong> is a <strong>VERY NEW</strong> and shouldn't be used in important production environments.
            </p>
            
            <p>
              It's a migration engine that lets you evolve your relational schema safely — without taking production offline.
            </p>

            <p>
              It performs <em>online</em> ALTERs, runs <em>static analysis</em> before execution,
              and offers <em>instant rollbacks</em> when something goes wrong.
            </p>
          </div>

          <h2 className="mb-2 text-xl font-medium lowercase">key capabilities</h2>
          <ul className="mb-10 list-disc space-y-2 pl-5 text-muted-foreground">
            <li>
              Zero-downtime: Algorithms inspired by _pt-osc_ &amp; _gh-ost_ run changes in
              the background while the app keeps serving traffic.
            </li>
            <li>
              Automated safety checks: Flow blocks destructive statements that would
              lock tables or break existing queries.
            </li>
            <li>
              One-file-per-change migrations with deterministic timestamps — perfect
              for Git workflows &amp; code review.
            </li>
            <li>
              Drop-in CLI written in Bun — no dependencies, <code>&lt;4&nbsp;MB</code> single
              binary.
            </li>
          </ul>

          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-medium lowercase">getting started</h2>

            <div className="flex flex-col gap-3">
              <Button asChild variant="outline" className="w-56 lowercase">
                <Link to={"/docs/flow/installation" as any}>installation →</Link>
              </Button>
              <Button asChild variant="outline" className="w-56 lowercase">
                <Link to={"/docs/flow/quick-start" as any}>quick start →</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      <Outlet />
    </>
  );
}

export const Route = createFileRoute("/docs/flow")({
  component: FlowDocsPage,
  head: () => ({
    meta: [
      { title: "Flow Documentation — DriftJS" },
      {
        name: "description",
        content: "Comprehensive documentation for Flow CLI — automate zero-downtime database migrations with DriftJS.",
      },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Flow Documentation — DriftJS" },
      {
        property: "og:description",
        content: "Comprehensive documentation for Flow CLI — automate zero-downtime database migrations with DriftJS.",
      },
      { property: "og:type", content: "article" },
    ],
    links: [
      { rel: "canonical", href: "https://driftjs.dev/docs/flow" },
    ],
  }),
}); 