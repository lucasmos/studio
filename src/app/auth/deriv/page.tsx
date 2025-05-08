'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import type { UserInfo } from '@/types';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';

export default function DerivLoginPage() {
  const { login } = useAuth(); // Use login from AuthContext
  const router = useRouter();

  const handleMockLogin = () => {
    // Simulate a successful Deriv OAuth login
    const mockUser: UserInfo = {
      id: 'deriv-user-' + Math.random().toString(36).substring(2, 8), // More unique ID
      name: 'Demo Deriv Trader',
      email: 'demo.trader@example.com',
      authMethod: 'deriv', // Set authMethod to 'deriv'
      derivDemoAccountId: 'VRTC' + Math.floor(100000 + Math.random() * 900000), 
      derivRealAccountId: 'CR' + Math.floor(100000 + Math.random() * 900000),
      derivDemoBalance: 10000,
      derivRealBalance: 500, // Example real balance
    };
    login(mockUser, 'deriv'); // Pass 'deriv' as the method
    // router.push('/'); // AuthContext login will handle navigation
  };

  return (
    // AuthLayout will provide the centering and max-width
    <Card className="w-full shadow-xl"> 
      <CardHeader className="text-center">
        <LogIn className="mx-auto h-12 w-12 text-primary mb-4" />
        <CardTitle className="text-3xl">Login with Deriv</CardTitle>
        <CardDescription>Securely connect your Deriv account to DerivAI Lite.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground text-center">
          You would be redirected to Deriv to authorize this application.
          This is a <span className="font-semibold">simulated login</span> for demonstration purposes.
        </p>
        <Button
          onClick={handleMockLogin}
          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-lg py-6"
        >
          <LogIn className="mr-2 h-5 w-5" />
          Proceed to Deriv (Simulated)
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          DerivAI Lite will not store your Deriv credentials.
        </p>
        <p className="text-center text-sm">
          <Link href="/auth/login" className="font-medium text-primary hover:underline">
            Back to other login options
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
