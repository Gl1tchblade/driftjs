import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import DocsLayout from "@/components/docs/docs-layout";
import { Button } from "@/components/ui/button";
import { useRouterState } from "@tanstack/react-router";

function GeneralDocsPage() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <DocsLayout>
      {pathname === "/docs" && (
        <section className="mx-auto max-w-3xl px-4 py-16">
          <h1 className="mb-4 text-4xl font-semibold lowercase">documentation</h1>
          <p className="text-muted-foreground mb-8">
            Welcome to the DriftJS documentation. Choose a product below to dive in or
            browse the general guides.
          </p>

          <div className="flex flex-col gap-4">
            <h2 className="text-2xl font-medium lowercase">products</h2>

            <Button asChild variant="outline" className="w-40 lowercase">
              <Link to={"/docs/flow" as any}>flow docs</Link>
            </Button>
          </div>
        </section>
      )}

      <Outlet />
    </DocsLayout>
  );
}

export const Route = createFileRoute("/docs")({
  component: GeneralDocsPage,
  head: () => ({
    meta: [
      { title: "Documentation — DriftJS" },
      {
        name: "description",
        content: "Browse the official DriftJS guides and API references, including Flow and upcoming tools.",
      },
      { name: "twitter:card", content: "summary" },
      { property: "og:title", content: "Documentation — DriftJS" },
      {
        property: "og:description",
        content: "Browse the official DriftJS guides and API references, including Flow and upcoming tools.",
      },
      { property: "og:type", content: "article" },
    ],
    links: [
      { rel: "canonical", href: "https://driftjs.dev/docs" },
    ],
  }),
}); 