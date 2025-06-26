import { Link } from '@tanstack/react-router'
import PageLayout from '@/components/page-layout'

export default function NotFound() {
  return (
    <PageLayout>
      <div className="flex flex-col items-center justify-center gap-6 px-4 py-40 text-center">
        <h1 className="text-5xl font-semibold lowercase text-foreground">page not found</h1>
        <p className="text-muted-foreground max-w-md">sorry, we couldn't find that page. it may have moved or no longer exists.</p>
        <Link
          to="/"
          className="rounded-md border border-border px-6 py-3 text-sm lowercase transition-colors hover:bg-accent/40"
        >
          go home
        </Link>
      </div>
    </PageLayout>
  )
} 