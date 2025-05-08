
'use client';

import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar, 
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/icons/logo';
import { LayoutDashboard, History, Settings, LogOut, DollarSign, LogIn, CreditCard, BarChartBig, User, AlertCircle, Activity } from 'lucide-react'; // Added Activity for Volatility
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { isFirebaseInitialized } from '@/lib/firebase/firebase'; // Import isFirebaseInitialized

export function SidebarContentComponent() {
  const { authStatus, userInfo, logout, currentAuthMethod } = useAuth();
  const { isMobile, open, setOpen, openMobile, setOpenMobile } = useSidebar(); 
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await logout(); // AuthContext logout handles Firebase/Deriv mock logout
    // Navigation will be handled by AuthContext or redirect in login pages
    // router.push('/auth/login'); // Potentially redundant if AuthContext handles it
  };

  const handleMenuClick = () => {
    if (isMobile) {
      setOpenMobile(false); // Closes the sheet overlay on mobile
    } else {
      // On desktop, if the sidebar is expanded (not just icon state),
      // collapse it to its icon state.
      if (open) {
        setOpen(false);
      }
    }
  };

  return (
    <Sidebar side="left" variant="sidebar" collapsible="icon">
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2 text-sidebar-primary hover:text-sidebar-primary-foreground">
          <Logo className="h-8 w-auto text-sidebar-primary" />
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
              isActive={pathname === '/volatility-trading'}
              tooltip={{ children: 'Volatility Trading', side: 'right' }}
              onClick={handleMenuClick}
            >
              <Link href="/volatility-trading">
                <Activity />
                <span>Volatility Trading</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={pathname === '/mt5-trading'}
              tooltip={{ children: 'MT5 Trading', side: 'right' }}
              onClick={handleMenuClick}
            >
              <Link href="/mt5-trading">
                <BarChartBig />
                <span>MT5 Trading</span>
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
              <Link href="/settings"> 
                <Settings />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
          {!isFirebaseInitialized() && (
            <SidebarMenuItem>
               <SidebarMenuButton
                isActive={false}
                tooltip={{children: "Firebase Not Configured", side: "right"}}
                className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
                disabled
               >
                <AlertCircle/>
                <span>Firebase N/A</span>
               </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarContent>
      <Separator className="bg-sidebar-border" />
      <SidebarFooter className="p-4">
        {authStatus === 'authenticated' && userInfo ? (
          <div className="flex flex-col gap-3 items-start group-data-[collapsible=icon]:items-center">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                {userInfo.photoURL ? (
                  <AvatarImage src={userInfo.photoURL} alt={userInfo.name} data-ai-hint="profile avatar" />
                ) : (
                  <AvatarImage src={`https://picsum.photos/seed/${userInfo.id}/100/100`} alt={userInfo.name} data-ai-hint="profile avatar" />
                )}
                <AvatarFallback>{userInfo.name.substring(0, 2).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium text-sidebar-foreground">{userInfo.name}</p>
                {userInfo.email && <p className="text-xs text-sidebar-foreground/70">{userInfo.email}</p>}
                <p className="text-xs text-sidebar-foreground/50 capitalize">{currentAuthMethod === 'deriv' ? 'Deriv Account' : currentAuthMethod ? `${currentAuthMethod} Account` : 'Logged In'}</p>
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:aspect-square"
              onClick={() => {
                handleLogout();
                handleMenuClick(); 
              }}
              aria-label="Logout"
            >
              <LogOut className="mr-2 group-data-[collapsible=icon]:mr-0 h-4 w-4" />
              <span className="group-data-[collapsible=icon]:hidden">Logout</span>
            </Button>
          </div>
        ) : (
          <div className="group-data-[collapsible=icon]:hidden w-full space-y-2">
            <Button 
              asChild
              variant="outline" 
              className="w-full bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-primary hover:text-sidebar-primary-foreground"
              onClick={handleMenuClick}
            >
              <Link href="/auth/login">
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Link>
            </Button>
             <Button 
              asChild
              variant="outline" 
              className="w-full bg-sidebar-background text-sidebar-foreground border-sidebar-border hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              onClick={handleMenuClick}
            >
              <Link href="/auth/signup">
                <User className="mr-2 h-4 w-4" />
                Sign Up
              </Link>
            </Button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}

