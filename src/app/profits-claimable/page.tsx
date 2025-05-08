'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DollarSign, Zap, CheckCircle, XCircle, Info, Activity, TrendingUp } from 'lucide-react';
import type { ProfitsClaimable as ProfitsClaimableType, PaperTradingMode } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type ProfitCategory = 'forexCrypto' | 'volatility';

export default function ProfitsClaimablePage() {
  const [demoForexCryptoProfits, setDemoForexCryptoProfits] = useState<ProfitsClaimableType>({
    totalNetProfit: 0, tradeCount: 0, winningTrades: 0, losingTrades: 0,
  });
  const [realForexCryptoProfits, setRealForexCryptoProfits] = useState<ProfitsClaimableType>({
    totalNetProfit: 0, tradeCount: 0, winningTrades: 0, losingTrades: 0,
  });
  const [demoVolatilityProfits, setDemoVolatilityProfits] = useState<ProfitsClaimableType>({
    totalNetProfit: 0, tradeCount: 0, winningTrades: 0, losingTrades: 0,
  });
  const [realVolatilityProfits, setRealVolatilityProfits] = useState<ProfitsClaimableType>({
    totalNetProfit: 0, tradeCount: 0, winningTrades: 0, losingTrades: 0,
  });

  const [activeAccountType, setActiveAccountType] = useState<PaperTradingMode>('paper');
  const [activeProfitCategory, setActiveProfitCategory] = useState<ProfitCategory>('forexCrypto');
  
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const loadProfits = (mode: PaperTradingMode, category: ProfitCategory) => {
      const profitsKey = category === 'forexCrypto' 
        ? `forexCryptoProfitsClaimable_${mode}` 
        : `volatilityProfitsClaimable_${mode}`;
      const storedProfits = localStorage.getItem(profitsKey);
      
      if (storedProfits) {
        try {
          const parsedProfits: ProfitsClaimableType = JSON.parse(storedProfits);
          if (mode === 'paper') {
            if (category === 'forexCrypto') setDemoForexCryptoProfits(parsedProfits);
            else setDemoVolatilityProfits(parsedProfits);
          } else { // live
            if (category === 'forexCrypto') setRealForexCryptoProfits(parsedProfits);
            else setRealVolatilityProfits(parsedProfits);
          }
        } catch (error) {
          console.error(`Failed to parse ${category} ${mode} profits from localStorage`, error);
          toast({
            title: `Error Loading ${mode === 'paper' ? 'Demo' : 'Real'} ${category === 'forexCrypto' ? 'Forex/Crypto' : 'Volatility'} Profits`,
            description: "Could not load profit data. It might be corrupted.",
            variant: "destructive",
          });
        }
      }
    };
    loadProfits('paper', 'forexCrypto');
    loadProfits('live', 'forexCrypto');
    loadProfits('paper', 'volatility');
    loadProfits('live', 'volatility');
    setIsLoading(false);
  }, [toast]);

  const handleClaimProfits = (mode: PaperTradingMode, category: ProfitCategory) => {
    let profitsToClaim: ProfitsClaimableType;
    let setProfitsState: React.Dispatch<React.SetStateAction<ProfitsClaimableType>>;
    let storageKey: string;

    if (mode === 'paper') {
        if (category === 'forexCrypto') {
            profitsToClaim = demoForexCryptoProfits;
            setProfitsState = setDemoForexCryptoProfits;
            storageKey = `forexCryptoProfitsClaimable_paper`;
        } else {
            profitsToClaim = demoVolatilityProfits;
            setProfitsState = setDemoVolatilityProfits;
            storageKey = `volatilityProfitsClaimable_paper`;
        }
    } else { // live
         if (category === 'forexCrypto') {
            profitsToClaim = realForexCryptoProfits;
            setProfitsState = setRealForexCryptoProfits;
            storageKey = `forexCryptoProfitsClaimable_live`;
        } else {
            profitsToClaim = realVolatilityProfits;
            setProfitsState = setRealVolatilityProfits;
            storageKey = `volatilityProfitsClaimable_live`;
        }
    }
    
    toast({
      title: `${mode === 'paper' ? 'Demo' : 'Real'} ${category === 'forexCrypto' ? 'Forex/Crypto' : 'Volatility'} Profits Claimed (Simulated)`,
      description: `Successfully processed claim for $${profitsToClaim.totalNetProfit.toFixed(2)}. This amount has already been reflected in your ${mode === 'paper' ? 'demo' : 'simulated real'} balance.`,
    });
    
    const initialProfits = { totalNetProfit: 0, tradeCount: 0, winningTrades: 0, losingTrades: 0 };
    localStorage.setItem(storageKey, JSON.stringify(initialProfits));
    setProfitsState(initialProfits);
  };
  
  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(undefined, { style: 'currency', currency: 'USD' });
  };

  const renderProfitsContent = (profitsData: ProfitsClaimableType, mode: PaperTradingMode, category: ProfitCategory) => (
    <div className="space-y-6">
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
        onClick={() => handleClaimProfits(mode, category)}
        disabled={profitsData.totalNetProfit === 0 && profitsData.tradeCount === 0}
      >
        {profitsData.totalNetProfit === 0 && profitsData.tradeCount === 0 ? 'No Profits to Claim' : `Claim Profits`}
      </Button>
      
      <p className="text-xs text-muted-foreground text-center">
        Note: Claiming profits is a simulated action. Your account balance reflects trade outcomes in real-time.
      </p>
    </div>
  );

  if (isLoading) {
    return (
      <div className="container mx-auto py-2 flex justify-center items-center h-full">
        <p>Loading profit data...</p>
      </div>
    );
  }
  
  const currentProfitsData = activeAccountType === 'paper' 
    ? (activeProfitCategory === 'forexCrypto' ? demoForexCryptoProfits : demoVolatilityProfits)
    : (activeProfitCategory === 'forexCrypto' ? realForexCryptoProfits : realVolatilityProfits);


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
          <Tabs value={activeAccountType} onValueChange={(value) => setActiveAccountType(value as PaperTradingMode)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paper">Demo Accounts</TabsTrigger>
              <TabsTrigger value="live">Real Accounts (Simulated)</TabsTrigger>
            </TabsList>
             <TabsContent value={activeAccountType} className="mt-4">
                <Tabs value={activeProfitCategory} onValueChange={(value) => setActiveProfitCategory(value as ProfitCategory)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="forexCrypto"><TrendingUp className="mr-2 h-4 w-4"/> Forex/Crypto/Commodity</TabsTrigger>
                        <TabsTrigger value="volatility"><Activity className="mr-2 h-4 w-4"/> Volatility Indices</TabsTrigger>
                    </TabsList>
                    <TabsContent value="forexCrypto" className="mt-6">
                        {renderProfitsContent(activeAccountType === 'paper' ? demoForexCryptoProfits : realForexCryptoProfits, activeAccountType, 'forexCrypto')}
                    </TabsContent>
                    <TabsContent value="volatility" className="mt-6">
                        {renderProfitsContent(activeAccountType === 'paper' ? demoVolatilityProfits : realVolatilityProfits, activeAccountType, 'volatility')}
                    </TabsContent>
                </Tabs>
                {activeAccountType === 'live' && (
                  <div className="mt-4 flex items-center gap-2 p-3 bg-yellow-100 border border-yellow-300 rounded-md text-yellow-700 text-sm">
                    <Info className="h-5 w-5 flex-shrink-0" />
                    <span>Real account activity is simulated. No real funds are involved.</span>
                  </div>
                )}
             </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
