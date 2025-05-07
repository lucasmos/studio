import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign } from 'lucide-react';

interface BalanceDisplayProps {
  balance: number;
  currency?: string;
}

export function BalanceDisplay({ balance, currency = 'USD' }: BalanceDisplayProps) {
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
          {balance.toLocaleString(undefined, { style: 'currency', currency: currency, minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Available for trading
        </p>
      </CardContent>
    </Card>
  );
}
