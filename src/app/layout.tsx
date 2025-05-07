import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AppLayout } from '@/components/layout/app-layout';
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'DerivAI Lite',
  description: 'AI Powered Trading Platform',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <SidebarProvider defaultOpen={true}>
          <AppLayout>
            {children}
          </AppLayout>
        </SidebarProvider>
        <Toaster />
      </body>
    </html>
  );
}
