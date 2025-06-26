import { Link, useRouterState } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";

interface NavGroup {
  label: string;
  children: { label: string; href: string }[];
}

const flowNav: NavGroup[] = [
  {
    label: "getting started",
    children: [
      { label: "overview", href: "/docs/flow" },
      { label: "installation", href: "/docs/flow/installation" },
      { label: "quick start", href: "/docs/flow/quick-start" },
    ],
  },
  {
    label: "features",
    children: [
      { label: "enhancements", href: "/docs/flow/enhancements" },
      { label: "safety patterns", href: "/docs/flow/safety" },
      { label: "performance", href: "/docs/flow/performance" },
      { label: "monitoring", href: "/docs/flow/monitoring" },
    ],
  },
  {
    label: "commands",
    children: [
      { label: "generate", href: "/docs/flow/generate" },
      { label: "apply", href: "/docs/flow/apply" },
      { label: "status", href: "/docs/flow/status" },
      { label: "plan", href: "/docs/flow/plan" },
      { label: "validate", href: "/docs/flow/validate" },
      { label: "history", href: "/docs/flow/history" },
      { label: "rollback", href: "/docs/flow/rollback" },
      { label: "ci/cd", href: "/docs/flow/ci" },
    ],
  },
];

export default function DocsSidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  // Determine which nav to show based on current path. For now only flow.
  const navItems = pathname.startsWith("/docs/flow") ? flowNav : [];

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-border/40 bg-background/90 px-4 py-8">
      {/* Brand */}
      <Link
        to={"/" as any}
        className="mb-8 text-2xl font-semibold lowercase text-sky-400 transition-colors hover:text-sky-300"
      >
        driftjs
      </Link>

      {navItems.length ? (
        <nav className="space-y-2">
          {navItems.map((group) => (
            <Group key={group.label} group={group} current={pathname} />
          ))}
        </nav>
      ) : (
        <div className="text-sm text-muted-foreground">Select a product to start.</div>
      )}
    </aside>
  );
}

// Inner component for group
function Group({ group, current }: { group: NavGroup; current: string }) {
  const storageKey = "docsSidebarOpen";

  const initiallyOpen = (() => {
    const persisted = typeof window !== "undefined" ? localStorage.getItem(storageKey) : null;
    if (persisted) {
      try {
        const arr = JSON.parse(persisted) as string[];
        if (arr.includes(group.label)) return true;
      } catch {}
    }
    return group.children.some((c) => current.startsWith(c.href));
  })();

  const [open, setOpen] = useState(initiallyOpen);

  // persist when open changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored: string[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const next = open
        ? Array.from(new Set([...stored, group.label]))
        : stored.filter((l) => l !== group.label);
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {}
  }, [open, group.label]);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between px-2 py-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground/60 hover:text-foreground"
      >
        <span>{group.label}</span>
        <span className="text-muted-foreground">{open ? "–" : "+"}</span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="overflow-hidden"
          >
            <div className="mt-1 space-y-1 pl-3">
              {group.children.map((child) => {
                const active = current === child.href;
                return (
                  <Link
                    key={child.href}
                    to={child.href as any}
                    className={`block rounded-md px-2 py-1 text-sm capitalize transition-colors hover:bg-accent/40 ${
                      active ? "bg-accent/40 text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    {child.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
} 