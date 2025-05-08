'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Zap, CheckCircle, XCircle, Info } from 'lucide-react';
import type { ProfitsClaimable as ProfitsClaimableType, PaperTradingMode } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function ProfitsClaimablePage() {
  const [demoProfitsData, setDemoProfitsData] = useState<ProfitsClaimableType>({
    totalNetProfit: 0, tradeCount: 0, winningTrades: 0, losingTrades: 0,
  });
  const [realProfitsData, setRealProfitsData] = useState<ProfitsClaimableType>({
    totalNetProfit: 0, tradeCount: 0, winningTrades: 0, losingTrades: 0,
  });
  const [activeTab, setActiveTab] = useState<PaperTradingMode>('paper'); // 'paper' for Demo, 'live' for Real
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadProfits = (mode: PaperTradingMode) => {
      const storedProfits = localStorage.getItem(`profitsClaimable_${mode}`);
      if (storedProfits) {
        try {
          const parsedProfits: ProfitsClaimableType = JSON.parse(storedProfits);
          if (mode === 'paper') setDemoProfitsData(parsedProfits);
          else setRealProfitsData(parsedProfits);
        } catch (error) {
          console.error(`Failed to parse ${mode} profits from localStorage`, error);
          toast({
            title: `Error Loading ${mode === 'paper' ? 'Demo' : 'Real'} Profits`,
            description: "Could not load profit data. It might be corrupted.",
            variant: "destructive",
          });
        }
      }
    };
    loadProfits('paper');
    loadProfits('live');
    setIsLoading(false);
  }, [toast]);

  const handleClaimProfits = (mode: PaperTradingMode) => {
    const profitsToClaim = mode === 'paper' ? demoProfitsData : realProfitsData;
    
    toast({
      title: `${mode === 'paper' ? 'Demo' : 'Real'} Profits Claimed (Simulated)`,
      description: `Successfully processed claim for $${profitsToClaim.totalNetProfit.toFixed(2)}. This amount has already been reflected in your ${mode === 'paper' ? 'demo' : 'simulated real'} balance.`,
    });
    
    const initialProfits = { totalNetProfit: 0, tradeCount: 0, winningTrades: 0, losingTrades: 0 };
    localStorage.setItem(`profitsClaimable_${mode}`, JSON.stringify(initialProfits));
    if (mode === 'paper') setDemoProfitsData(initialProfits);
    else setRealProfitsData(initialProfits);
  };
  
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  };

  const renderProfitsContent = (profitsData: ProfitsClaimableType, mode: PaperTradingMode) => (
    <>
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Total Net Profit/Loss ({mode === 'paper' ? 'Demo' : 'Real - Simulated'})</p>
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
        onClick={() => handleClaimProfits(mode)}
        disabled={profitsData.totalNetProfit === 0 && profitsData.tradeCount === 0}
      >
        {profitsData.totalNetProfit === 0 && profitsData.tradeCount === 0 ? 'No Profits to Claim' : `Claim ${mode === 'paper' ? 'Demo' : 'Real'} Profits`}
      </Button>
      
      <p className="text-xs text-muted-foreground text-center">
        Note: Claiming profits is a simulated action. Your account balance reflects trade outcomes in real-time.
      </p>
    </>
  );

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
          <CardDescription>Summary of your automated AI trading session earnings for Demo and Real (Simulated) accounts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as PaperTradingMode)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paper">Demo Account</TabsTrigger>
              <TabsTrigger value="live">Real Account (Simulated)</TabsTrigger>
            </TabsList>
            <TabsContent value="paper" className="mt-6 space-y-6">
              {renderProfitsContent(demoProfitsData, 'paper')}
            </TabsContent>
            <TabsContent value="live" className="mt-6 space-y-6">
              {renderProfitsContent(realProfitsData, 'live')}
               <div className="flex items-center gap-2 p-3 bg-yellow-100 border border-yellow-300 rounded-md text-yellow-700 text-sm">
                <Info className="h-5 w-5" />
                <span>Real account activity is simulated. No real funds are involved.</span>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}