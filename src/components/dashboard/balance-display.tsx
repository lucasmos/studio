'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, UserCheck, Briefcase } from 'lucide-react'; // Added UserCheck, Briefcase
import type { PaperTradingMode } from '@/types';

interface BalanceDisplayProps {
  balance: number;
  currency?: string;
  accountType: PaperTradingMode; // 'paper' for Demo, 'live' for Real (simulated)
}

export function BalanceDisplay({ balance, currency = 'USD', accountType }: BalanceDisplayProps) {
  const [formattedBalance, setFormattedBalance] = useState<string | null>(null);

  useEffect(() => {
    setFormattedBalance(
      balance.toLocaleString(undefined, { 
        style: 'currency', 
        currency: currency, 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
      })
    );
  }, [balance, currency]);

  const AccountIcon = accountType === 'live' ? Briefcase : UserCheck;
  const accountLabel = accountType === 'live' ? 'Real Account Balance (Simulated)' : 'Demo Account Balance';

  return (
    <Card className="shadow-lg">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center">
          <AccountIcon className={`mr-2 h-5 w-5 ${accountType === 'live' ? 'text-green-500' : 'text-blue-500'}`} />
          {accountLabel}
        </CardTitle>
        <DollarSign className="h-5 w-5 text-accent" />
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-foreground">
          {formattedBalance !== null ? formattedBalance : `${currency === 'USD' ? '$' : currency}0.00 (Loading...`}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Available for trading in {accountType === 'live' ? 'simulated real' : 'demo'} mode.
        </p>
      </CardContent>
    </Card>
  );
}