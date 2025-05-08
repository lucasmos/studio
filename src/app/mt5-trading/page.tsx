'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Construction } from 'lucide-react';

export default function MT5TradingPage() {
  return (
    <div className="container mx-auto py-2">
      <Card className="max-w-2xl mx-auto shadow-xl">
        <CardHeader className="text-center">
          <Construction className="mx-auto h-16 w-16 text-primary mb-4" />
          <CardTitle className="text-3xl">MT5 Trading</CardTitle>
          <CardDescription>
            Advanced MetaTrader 5 trading capabilities are
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center py-10">
          <p className="text-2xl font-semibold text-accent">Coming Soon!</p>
          <p className="text-muted-foreground mt-2">
            We are working hard to bring you a seamless MT5 trading experience. Stay tuned for updates.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
