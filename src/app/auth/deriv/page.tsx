'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/auth-context';
import type { UserInfo } from '@/types';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';

export default function DerivLoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const handleMockLogin = () => {
    // Simulate a successful Deriv OAuth login
    const mockUser: UserInfo = {
      id: 'deriv-user-123',
      name: 'Demo Trader',
      email: 'demo.trader@example.com',
      derivAccountId: 'VRTC1234567', // Example demo account ID
    };
    login(mockUser);
    router.push('/'); // Redirect to dashboard after login
  };

  return (
    <div className="container mx-auto py-8 flex justify-center items-center min-h-[calc(100vh-10rem)]">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <LogIn className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-3xl">Login with Deriv</CardTitle>
          <CardDescription>Securely connect your Deriv account to DerivAI Lite.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-muted-foreground text-center">
            You will be redirected to Deriv to authorize this application.
            This is a simulated login for demonstration purposes.
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
        </CardContent>
      </Card>
    </div>
  );
}