import type { ReactNode } from 'react'
import MinimalNavigation from '@/components/minimal-navigation'
import MinimalFooter from '@/components/landing/minimal-footer'

interface PageLayoutProps {
  children: ReactNode
}

export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MinimalNavigation />
      <main className="flex-grow">{children}</main>
      <MinimalFooter />
    </div>
  )
} 