
'use client'; // Add 'use client' because usePathname is used in SidebarContentComponent

import type { ReactNode } from 'react';
import { SidebarInset } from '@/components/ui/sidebar';
import { SidebarContentComponent } from './sidebar-content';
import { Header } from './header';
import { NewsAlertBanner } from './news-alert-banner';
import { usePathname } from 'next/navigation'; // Import usePathname

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname();
  const isAuthPage = pathname.startsWith('/auth');

  if (isAuthPage) {
    // For auth pages, render children directly without the main app layout
    // The AuthLayout component (src/app/auth/layout.tsx) will handle styling for these pages
    return <>{children}</>;
  }

  return (
    <>
      <SidebarContentComponent />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        <NewsAlertBanner />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
