'use client';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar, // Import useSidebar
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';
import { LayoutDashboard, History, Settings, LogOut, DollarSign, LogIn, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';

export function SidebarContentComponent() {
  const { authStatus, userInfo, logout } = useAuth();
  const { isMobile, setOpenMobile } = useSidebar(); // Get mobile state and setter
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = () => {
    logout();
    router.push('/'); // Redirect to home or login page after logout
  };

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2 text-sidebar-primary hover:text-sidebar-primary-foreground">
          {/* Changed className for Logo to make its rect background match sidebar background */}
          <Logo className="h-8 w-auto text-sidebar-background" />
        </Link>
      </SidebarHeader>
      <Separator className="bg-sidebar-border" />
      <SidebarContent className="p-2">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/'}
              tooltip={{ children: 'Dashboard', side: 'right' }}
              onClick={handleMenuClick}
            >
              <Link href="/">
                <LayoutDashboard />
                <span>Dashboard</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/trade-history'}
              tooltip={{ children: 'Trade History', side: 'right' }}
              onClick={handleMenuClick}
            >
              <Link href="/trade-history">
                <History />
                <span>Trade History</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/profits-claimable'}
              tooltip={{ children: 'Profits Claimable', side: 'right' }}
              onClick={handleMenuClick}
            >
              <Link href="/profits-claimable">
                <DollarSign />
                <span>Profits Claimable</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/payments'}
              tooltip={{ children: 'Payments', side: 'right' }}
              onClick={handleMenuClick}
            >
              <Link href="/payments">
                <CreditCard />
                <span>Payments</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/settings'}
              tooltip={{ children: 'Settings', side: 'right' }}
              onClick={handleMenuClick}
            >
              <Link href="/settings"> {/* Updated link to /settings */}
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <Separator className="bg-sidebar-border" />
      <SidebarFooter className="p-4">
        {authStatus === 'authenticated' && userInfo ? (
          <div className="flex flex-col gap-3 items-start group-data-[collapsible=icon]:items-center">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src="https://picsum.photos/100/100" alt={userInfo.name} data-ai-hint="profile avatar" />
                <AvatarFallback>{userInfo.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium text-sidebar-foreground">{userInfo.name}</p>
                <p className="text-xs text-sidebar-foreground/70">{userInfo.email}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:aspect-square"
              onClick={() => {
                handleLogout();
                handleMenuClick(); // Close sidebar on mobile if open
              }}
              aria-label="Logout"
            >
              <LogOut className="mr-2 group-data-[collapsible=icon]:mr-0 h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Logout</span>
            </Button>
          </div>
        ) : (
          <div className="group-data-[collapsible=icon]:hidden w-full">
            <Button 
              asChild
              variant="outline" 
              className="w-full bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
              onClick={handleMenuClick}
            >
              <Link href="/auth/deriv">
                <LogIn className="mr-2 h-4 w-4" />
                Login with Deriv
              </Link>
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
