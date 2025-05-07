import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { UserCircle, Bell } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import Link from 'next/link';

export function Header() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b bg-background/80 px-4 shadow-sm backdrop-blur-md md:px-6">
      <div className="flex items-center gap-2">
        <SidebarTrigger className="md:hidden" />
        <Link href="/" className="hidden md:block">
           <Logo className="h-8 w-auto text-primary" />
        </Link>
      </div>
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell className="h-5 w-5" />
        </Button>
        <Button variant="ghost" size="icon" aria-label="User Profile">
          <UserCircle className="h-6 w-6" />
        </Button>
      </div>
    </header>
  );
}
