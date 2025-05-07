'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

interface BalanceDisplayProps {
  balance: number;
  currency?: string;
}

export function BalanceDisplay({ balance, currency = 'USD' }: BalanceDisplayProps) {
  const [formattedBalance, setFormattedBalance] = useState<string | null>(null);

  useEffect(() => {
    // This will only run on the client, after initial hydration
    setFormattedBalance(
      balance.toLocaleString(undefined, { 
        style: 'currency', 
        currency: currency, 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })
    );
  }, [balance, currency]);

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Account Balance
        </CardTitle>
        <DollarSign className="h-5 w-5 text-accent" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">
          {formattedBalance !== null ? formattedBalance : `${currency === 'USD' ? '$' : currency}0.00`} 
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Available for trading
        </p>
      </CardContent>
    </Card>
  );
}
