'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Cog } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="container mx-auto py-2">
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader className="text-center">
          <Cog className="mx-auto h-12 w-12 text-primary mb-4" />
          <CardTitle className="text-3xl">Settings</CardTitle>
          <CardDescription>
            Manage your application preferences and account settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center py-10">
            <p className="text-lg text-muted-foreground">
              Settings page is currently under construction.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              More options will be available here soon!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
