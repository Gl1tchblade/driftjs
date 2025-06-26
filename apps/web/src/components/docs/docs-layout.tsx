import type { ReactNode } from "react";
import DocsSidebar from "./sidebar";

interface DocsLayoutProps {
  children: ReactNode;
}

export default function DocsLayout({ children }: DocsLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <DocsSidebar />
      <main className="flex-1 overflow-y-auto px-6 py-10">{children}</main>
    </div>
  );
} 