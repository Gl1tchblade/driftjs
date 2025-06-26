import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'

// A stripped-down navigation bar that matches the minimalist aesthetic.
export default function MinimalNavigation() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="sticky top-0 z-40 w-full border-b border-border/50 bg-background/80 backdrop-blur-sm">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        {/* logo */}
        <Link to="/" className="font-semibold lowercase tracking-tight text-foreground">
          driftjs
        </Link>

        {/* nav links */}
        <div className="relative hidden items-center gap-6 sm:flex">
          {/* Products dropdown */}
          <div
            onMouseEnter={() => setOpen(true)}
            onMouseLeave={() => setOpen(false)}
            className="flex items-center"
          >
            <a href="#products" className="text-sm lowercase text-muted-foreground transition-colors hover:text-foreground">
              products
            </a>

            <AnimatePresence>
              {open && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.96 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-border/50 bg-background/95 p-4 shadow-xl backdrop-blur"
                >
                  {[
                    { name: 'flow', desc: 'sql migrations with zero downtime', href: '/flow', internal: true },
                    { name: 'sync', desc: 'keep schemas in sync', href: '#', internal: false },
                    { name: 'monitor', desc: 'watch prod drift in real-time', href: '#', internal: false },
                  ].map((p) => (
                    p.internal ? (
                      <Link
                        key={p.name}
                        to={p.href}
                        className="block rounded-md px-3 py-3 transition-colors hover:bg-accent/40"
                      >
                        <div className="font-medium lowercase">{p.name}</div>
                        <div className="text-xs text-muted-foreground lowercase">{p.desc}</div>
                      </Link>
                    ) : (
                      <a
                        key={p.name}
                        href={p.href}
                        className="block cursor-not-allowed rounded-md px-3 py-3 opacity-60"
                      >
                        <div className="font-medium lowercase">{p.name}</div>
                        <div className="text-xs text-muted-foreground lowercase">{p.desc}</div>
                      </a>
                    )
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <Link
            to={"/docs" as any}
            className="text-sm lowercase text-muted-foreground transition-colors hover:text-foreground"
          >
            docs
          </Link>
          <span className="cursor-not-allowed text-sm lowercase text-muted-foreground/70">pricing</span>
        </div>

        {/* cta */}
        <Button variant="outline" size="sm" className="lowercase">
          sign in
        </Button>
      </div>
    </nav>
  )
} 