import type { ReactNode } from 'react'
import MinimalNavigation from '@/components/minimal-navigation'
import MinimalFooter from '@/components/landing/minimal-footer'

interface PageLayoutProps {
  children: ReactNode
}

export default function PageLayout({ children }: PageLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <MinimalNavigation />
      {children}
      <MinimalFooter />
    </div>
  )
} 