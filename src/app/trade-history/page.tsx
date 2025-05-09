
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import type { TradeRecord, TradeRecordStatus } from '@/types';
import { getInstrumentDecimalPlaces } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { getTradeHistory } from '@/lib/trade-history-utils';
import { ScrollArea } from '@/components/ui/scroll-area';


export default function TradeHistoryPage() {
  const { userInfo } = useAuth();
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    const history = getTradeHistory(userInfo);
    setTradeHistory(history);
    setIsLoading(false);
  }, [userInfo]);

  const formatCurrency = (amount: number | null, currency: string = 'USD') => {
    if (amount === null || amount === undefined) return '-';
    return amount.toLocaleString(undefined, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  const formatPrice = (price: number | null, instrument: TradeRecord['instrument']) => {
    if (price === null || price === undefined) return '-';
    return price.toFixed(getInstrumentDecimalPlaces(instrument));
  };

  const getStatusBadgeVariant = (status: TradeRecordStatus) => {
    switch (status) {
      case 'won':
        return 'default'; 
      case 'lost_duration':
      case 'lost_stoploss':
        return 'destructive';
      case 'closed_manual':
      case 'cancelled':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  
  const getStatusBadgeColorClass = (status: TradeRecordStatus) => {
    switch (status) {
      case 'won':
        return 'bg-green-500 hover:bg-green-600 text-white';
      case 'lost_duration':
      case 'lost_stoploss':
        return 'bg-red-500 hover:bg-red-600 text-white';
      case 'closed_manual':
      case 'cancelled':
        return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
        <div className="container mx-auto py-2">
            <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>Trade History</CardTitle>
                    <CardDescription>Reviewing your past trading activity...</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground">Loading trade history...</p>
                </CardContent>
            </Card>
        </div>
    );
  }

  return (
    <div className="container mx-auto py-2">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Trade History</CardTitle>
          <CardDescription>Review your past trading activity.</CardDescription>
        </CardHeader>
        <CardContent>
          {tradeHistory.length === 0 ? (
            <p className="text-muted-foreground">No trade history available.</p>
          ) : (
            <ScrollArea className="h-[600px] w-full"> {/* Added ScrollArea */}
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Instrument</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Entry Price</TableHead>
                    <TableHead className="text-right">Exit Price</TableHead>
                    <TableHead className="text-right">Stake</TableHead>
                    <TableHead className="text-right">P/L</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tradeHistory.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell>{new Date(trade.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{trade.instrument}</TableCell>
                      <TableCell className="capitalize">{trade.tradeCategory}</TableCell>
                      <TableCell className="capitalize">{trade.accountType}</TableCell>
                      <TableCell>
                        <Badge 
                            variant={trade.action === 'CALL' || trade.action === 'BUY' ? 'default' : 'destructive'} 
                            className={trade.action === 'CALL' || trade.action === 'BUY' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {trade.action}
                        </Badge>
                      </TableCell>
                      <TableCell>{trade.duration || '-'}</TableCell>
                      <TableCell className="text-right">{formatPrice(trade.entryPrice, trade.instrument)}</TableCell>
                      <TableCell className="text-right">{formatPrice(trade.exitPrice, trade.instrument)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(trade.stake)}</TableCell>
                      <TableCell className={`text-right font-semibold ${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatCurrency(trade.pnl)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getStatusBadgeVariant(trade.status)} className={getStatusBadgeColorClass(trade.status)}>
                          {trade.status.replace('_', ' ')}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
