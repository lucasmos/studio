
'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import type { TradingInstrument, TradeDuration } from '@/types';
import { getInstrumentDecimalPlaces } from '@/lib/utils';


interface TradeRecord {
  id: string;
  timestamp: Date;
  instrument: TradingInstrument;
  type: 'CALL' | 'PUT';
  duration: TradeDuration;
  entryPrice: number;
  exitPrice: number | null; // Null if trade is still open or not applicable
  stake: number;
  payout: number | null; // Null if trade is still open or not applicable
  status: 'Won' | 'Lost' | 'Open' | 'Cancelled';
}

// Mock data for trade history
const mockTradeHistory: TradeRecord[] = [
  {
    id: 'trade_1',
    timestamp: new Date(Date.now() - 3600000 * 1), // 1 hour ago
    instrument: 'EUR/USD',
    type: 'CALL',
    duration: '5m',
    entryPrice: 1.07500,
    exitPrice: 1.07550,
    stake: 100,
    payout: 185,
    status: 'Won',
  },
  {
    id: 'trade_2',
    timestamp: new Date(Date.now() - 3600000 * 2.5), // 2.5 hours ago
    instrument: 'GBP/USD',
    type: 'PUT',
    duration: '15m',
    entryPrice: 1.25000,
    exitPrice: 1.25100,
    stake: 50,
    payout: 0,
    status: 'Lost',
  },
  {
    id: 'trade_3',
    timestamp: new Date(Date.now() - 3600000 * 5), // 5 hours ago
    instrument: 'BTC/USD',
    type: 'CALL',
    duration: '30s',
    entryPrice: 65000.00,
    exitPrice: 65000.00, 
    stake: 200,
    payout: 0, 
    status: 'Lost', 
  },
   {
    id: 'trade_4',
    timestamp: new Date(Date.now() - 3600000 * 8), // 8 hours ago
    instrument: 'XAU/USD', // Gold example
    type: 'CALL',
    duration: '1m',
    entryPrice: 2300.50,
    exitPrice: 2305.25,
    stake: 75,
    payout: 138.75,
    status: 'Won',
  },
  {
    id: 'trade_5',
    timestamp: new Date(Date.now() - 3600000 * 24), // 24 hours ago
    instrument: 'ETH/USD', // Ethereum example
    type: 'PUT',
    duration: '30m',
    entryPrice: 3500.00,
    exitPrice: 3490.50,
    stake: 150,
    payout: 0,
    status: 'Lost',
  },
];


export default function TradeHistoryPage() {
  const [tradeHistory, setTradeHistory] = useState<TradeRecord[]>([]);

  useEffect(() => {
    // In a real application, you would fetch this data from an API
    setTradeHistory(mockTradeHistory);
  }, []);

  const formatCurrency = (amount: number | null, currency: string = 'USD') => {
    if (amount === null) return '-';
    return amount.toLocaleString(undefined, { style: 'currency', currency, minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };
  
  const formatPrice = (price: number | null, instrument: TradingInstrument) => {
    if (price === null) return '-';
    return price.toFixed(getInstrumentDecimalPlaces(instrument));
  };


  const getStatusBadgeVariant = (status: TradeRecord['status']) => {
    switch (status) {
      case 'Won':
        return 'default'; 
      case 'Lost':
        return 'destructive';
      case 'Open':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  
  const getStatusBadgeColorClass = (status: TradeRecord['status']) => {
    switch (status) {
      case 'Won':
        return 'bg-green-500 hover:bg-green-600 text-white';
      case 'Lost':
        return 'bg-red-500 hover:bg-red-600 text-white';
      case 'Open':
        return 'bg-yellow-500 hover:bg-yellow-600 text-black';
      default:
        return '';
    }
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
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Instrument</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Entry Price</TableHead>
                    <TableHead className="text-right">Exit Price</TableHead>
                    <TableHead className="text-right">Stake</TableHead>
                    <TableHead className="text-right">Payout</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tradeHistory.map((trade) => (
                    <TableRow key={trade.id}>
                      <TableCell>{trade.timestamp.toLocaleString()}</TableCell>
                      <TableCell>{trade.instrument}</TableCell>
                      <TableCell>
                        <Badge variant={trade.type === 'CALL' ? 'default' : 'destructive'} className={trade.type === 'CALL' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                          {trade.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{trade.duration}</TableCell>
                      <TableCell className="text-right">{formatPrice(trade.entryPrice, trade.instrument)}</TableCell>
                      <TableCell className="text-right">{formatPrice(trade.exitPrice, trade.instrument)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(trade.stake)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(trade.payout)}</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getStatusBadgeVariant(trade.status)} className={getStatusBadgeColorClass(trade.status)}>
                          {trade.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
