
import type { ReactNode } from 'react';
import { SidebarInset } from '@/components/ui/sidebar';
import { SidebarContentComponent } from './sidebar-content';
import { Header } from './header';
import { NewsAlertBanner } from './news-alert-banner'; // Import the new banner

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <>
      <SidebarContentComponent />
      <SidebarInset className="flex flex-col min-h-screen">
        <Header />
        <NewsAlertBanner /> {/* Add the news alert banner here */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </SidebarInset>
    </>
  );
}
