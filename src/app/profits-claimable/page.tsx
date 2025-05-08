'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Zap, CheckCircle, XCircle } from 'lucide-react';
import type { ProfitsClaimable as ProfitsClaimableType } from '@/types'; // Renamed to avoid conflict
import { useToast } from "@/hooks/use-toast";

export default function ProfitsClaimablePage() {
  const [profitsData, setProfitsData] = useState<ProfitsClaimableType>({
    totalNetProfit: 0,
    tradeCount: 0,
    winningTrades: 0,
    losingTrades: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const storedProfits = localStorage.getItem('profitsClaimable');
    if (storedProfits) {
      try {
        const parsedProfits: ProfitsClaimableType = JSON.parse(storedProfits);
        setProfitsData(parsedProfits);
      } catch (error) {
        console.error("Failed to parse profits from localStorage", error);
        toast({
          title: "Error Loading Profits",
          description: "Could not load profit data. It might be corrupted.",
          variant: "destructive",
        });
      }
    }
    setIsLoading(false);
  }, [toast]);

  const handleClaimProfits = () => {
    // In a real application, this would trigger a backend process.
    // For this simulation, we'll just show a toast and reset the display,
    // as the main balance is already updated live.
    toast({
      title: "Profits Claimed (Simulated)",
      description: `Successfully processed claim for $${profitsData.totalNetProfit.toFixed(2)}. This amount has already been reflected in your main balance.`,
    });
    
    // Resetting local storage and state for "claimable" display purposes
    const initialProfits = {
      totalNetProfit: 0,
      tradeCount: 0,
      winningTrades: 0,
      losingTrades: 0,
    };
    localStorage.setItem('profitsClaimable', JSON.stringify(initialProfits));
    setProfitsData(initialProfits);
  };
  
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-2 flex justify-center items-center h-full">
        <p>Loading profit data...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-2">
      <Card className="shadow-lg max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <div className="mx-auto bg-accent/20 rounded-full p-3 w-fit mb-4">
             <DollarSign className="h-10 w-10 text-accent" />
          </div>
          <CardTitle className="text-3xl">Claimable Profits</CardTitle>
          <CardDescription>Summary of your automated AI trading session earnings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Total Net Profit/Loss</p>
            <p className={`text-5xl font-bold ${profitsData.totalNetProfit >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {formatCurrency(profitsData.totalNetProfit)}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <Zap className="mx-auto h-8 w-8 text-muted-foreground mb-1" />
              <p className="text-2xl font-semibold">{profitsData.tradeCount}</p>
              <p className="text-sm text-muted-foreground">Total Trades</p>
            </div>
            <div>
              <CheckCircle className="mx-auto h-8 w-8 text-green-500 mb-1" />
              <p className="text-2xl font-semibold">{profitsData.winningTrades}</p>
              <p className="text-sm text-muted-foreground">Winning Trades</p>
            </div>
            <div>
              <XCircle className="mx-auto h-8 w-8 text-red-500 mb-1" />
              <p className="text-2xl font-semibold">{profitsData.losingTrades}</p>
              <p className="text-sm text-muted-foreground">Losing Trades</p>
            </div>
          </div>
          
          {profitsData.tradeCount > 0 && (
             <div className="text-center">
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-3xl font-semibold">
                    {profitsData.tradeCount > 0 ? ((profitsData.winningTrades / profitsData.tradeCount) * 100).toFixed(1) : '0.0'}%
                </p>
            </div>
          )}

          <Button 
            size="lg" 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-lg"
            onClick={handleClaimProfits}
            disabled={profitsData.totalNetProfit === 0 && profitsData.tradeCount === 0}
          >
            {profitsData.totalNetProfit === 0 && profitsData.tradeCount === 0 ? 'No Profits to Claim' : 'Claim Profits'}
          </Button>
          
          <p className="text-xs text-muted-foreground text-center">
            Note: Claiming profits is a simulated action. Your main account balance reflects trade outcomes in real-time during paper trading.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}