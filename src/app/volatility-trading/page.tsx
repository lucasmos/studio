'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BalanceDisplay } from '@/components/dashboard/balance-display';
import { TradeControls } from '@/components/dashboard/trade-controls'; // Re-evaluate if needed or simplify
import type { VolatilityInstrumentType, TradingMode, PaperTradingMode, ActiveAutomatedVolatilityTrade, ProfitsClaimable, PriceTick } from '@/types';
import { generateVolatilityTradingStrategy } from '@/ai/flows/volatility-trading-strategy-flow';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getTicks } from '@/services/deriv';
import { v4 as uuidv4 } from 'uuid'; 
import { getInstrumentDecimalPlaces } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { Bot, DollarSign, Play, Square, Briefcase, UserCheck, Activity } from 'lucide-react'; 

const VOLATILITY_INSTRUMENTS: VolatilityInstrumentType[] = [
  'Volatility 10 Index',
  'Volatility 25 Index',
  'Volatility 50 Index',
  'Volatility 75 Index',
  'Volatility 100 Index',
];

export default function VolatilityTradingPage() {
  const { 
    authStatus, 
    paperBalance, 
    setPaperBalance, 
    liveBalance, 
    setLiveBalance 
  } = useAuth();
  
  const [tradingMode, setTradingMode] = useState<TradingMode>('balanced');
  const [paperTradingMode, setPaperTradingMode] = useState<PaperTradingMode>('paper'); 
  
  const [autoTradeTotalStake, setAutoTradeTotalStake] = useState<number>(100);
  const [isAutoTradingActive, setIsAutoTradingActive] = useState(false);
  const [activeAutomatedTrades, setActiveAutomatedTrades] = useState<ActiveAutomatedVolatilityTrade[]>([]);
  const [profitsClaimable, setProfitsClaimable] = useState<ProfitsClaimable>({
    totalNetProfit: 0,
    tradeCount: 0,
    winningTrades: 0,
    losingTrades: 0,
  });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const tradeIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const currentBalance = paperTradingMode === 'paper' ? paperBalance : liveBalance;
  const setCurrentBalance = paperTradingMode === 'paper' ? setPaperBalance : setLiveBalance;

  const { toast } = useToast();

  // Load and save profitsClaimable from/to localStorage
  useEffect(() => {
    const profitsKey = `volatilityProfitsClaimable_${paperTradingMode}`;
    const storedProfits = localStorage.getItem(profitsKey);
    if (storedProfits) {
      setProfitsClaimable(JSON.parse(storedProfits));
    } else {
      setProfitsClaimable({ totalNetProfit: 0, tradeCount: 0, winningTrades: 0, losingTrades: 0 });
    }
  }, [paperTradingMode]);

  useEffect(() => {
    const profitsKey = `volatilityProfitsClaimable_${paperTradingMode}`;
    localStorage.setItem(profitsKey, JSON.stringify(profitsClaimable));
  }, [profitsClaimable, paperTradingMode]);

  const handleAutoStakeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && value >= 0) {
      setAutoTradeTotalStake(value);
    } else if (event.target.value === "") {
      setAutoTradeTotalStake(0);
    }
  };

  const handleStartAiAutoTrade = useCallback(async () => {
    if (authStatus !== 'authenticated' && paperTradingMode === 'live') {
      toast({ title: "Login Required", description: "AI Auto-Trading on Real Account requires login.", variant: "destructive" });
      return;
    }
    if (autoTradeTotalStake <= 0) {
      toast({ title: "Invalid Stake", description: "Please enter a valid total stake for AI trading.", variant: "destructive" });
      return;
    }
    if (autoTradeTotalStake > currentBalance) {
        toast({ title: `Insufficient ${paperTradingMode === 'paper' ? 'Demo' : 'Real'} Balance`, description: `Total stake $${autoTradeTotalStake.toFixed(2)} exceeds available balance of $${currentBalance.toFixed(2)}.`, variant: "destructive" });
        return;
    }

    setIsAiLoading(true); 
    setIsAutoTradingActive(true);
    setActiveAutomatedTrades([]); 
    setProfitsClaimable({ totalNetProfit: 0, tradeCount: 0, winningTrades: 0, losingTrades: 0 });

    try {
      const instrumentTicksData: Record<VolatilityInstrumentType, PriceTick[]> = {} as Record<VolatilityInstrumentType, PriceTick[]>;
      
      for (const inst of VOLATILITY_INSTRUMENTS) {
        try {
          instrumentTicksData[inst] = await getTicks(inst);
        } catch (err) {
          instrumentTicksData[inst] = []; 
          toast({title: `Data Error ${inst}`, description: `Could not fetch price data for ${inst}. AI may exclude it.`, variant: 'destructive', duration: 4000});
        }
      }
      
      const strategyInput = {
        totalStake: autoTradeTotalStake,
        instruments: VOLATILITY_INSTRUMENTS,
        tradingMode: tradingMode,
        instrumentTicks: instrumentTicksData,
      };
      const strategyResult = await generateVolatilityTradingStrategy(strategyInput);

      if (!strategyResult || strategyResult.tradesToExecute.length === 0) {
        const reason = strategyResult?.overallReasoning || "AI determined no optimal trades at this moment for volatility indices.";
        toast({ title: "AI Auto-Trade Update (Volatility)", description: `AI analysis complete. ${reason}`, duration: 7000 });
        setIsAutoTradingActive(false); 
        setIsAiLoading(false);
        return;
      }
      
      toast({ title: "AI Auto-Trade Strategy Initiated (Volatility)", description: `AI proposes ${strategyResult.tradesToExecute.length} trade(s) for ${paperTradingMode} account on volatility indices. ${strategyResult.overallReasoning}`, duration: 7000});

      const newTrades: ActiveAutomatedVolatilityTrade[] = [];
      let currentAllocatedStake = 0;

      for (const proposal of strategyResult.tradesToExecute) {
        if (currentAllocatedStake + proposal.stake > autoTradeTotalStake) continue; 
        currentAllocatedStake += proposal.stake;

        const currentTicks = instrumentTicksData[proposal.instrument];
        if (!currentTicks || currentTicks.length === 0) {
          toast({ title: "Auto-Trade Skipped (Volatility)", description: `No price data for ${proposal.instrument} to initiate AI trade.`, variant: "destructive"});
          continue;
        }
        const entryPrice = currentTicks[currentTicks.length - 1].price;
        
        let stopLossPrice;
        const stopLossPercentage = 0.05; 
        if (proposal.action === 'CALL') stopLossPrice = entryPrice * (1 - stopLossPercentage);
        else stopLossPrice = entryPrice * (1 + stopLossPercentage);
        
        stopLossPrice = parseFloat(stopLossPrice.toFixed(getInstrumentDecimalPlaces(proposal.instrument)));

        const tradeId = uuidv4();
        newTrades.push({
          id: tradeId,
          instrument: proposal.instrument,
          action: proposal.action,
          stake: proposal.stake,
          durationSeconds: proposal.durationSeconds,
          reasoning: proposal.reasoning,
          entryPrice,
          stopLossPrice, 
          startTime: Date.now(),
          status: 'active',
          currentPrice: entryPrice,
        });
      }

      if (newTrades.length === 0) {
        toast({ title: "AI Auto-Trade Update (Volatility)", description: "No valid volatility trades could be initiated.", duration: 7000 });
        setIsAutoTradingActive(false);
      } else {
        setActiveAutomatedTrades(newTrades);
      }

    } catch (error) {
      toast({ title: "AI Auto-Trade Failed (Volatility)", description: `Could not execute volatility trading strategy: ${(error as Error).message}`, variant: "destructive" });
      setIsAutoTradingActive(false);
    } finally {
      setIsAiLoading(false); 
    }
  }, [autoTradeTotalStake, tradingMode, toast, paperTradingMode, currentBalance, authStatus, setCurrentBalance]);

  const handleStopAiAutoTrade = () => {
    setIsAutoTradingActive(false); 
    setActiveAutomatedTrades(prevTrades => 
      prevTrades.map(trade => {
        if (trade.status === 'active') {
          const pnl = -trade.stake; 
          setTimeout(() => {
            setCurrentBalance(prevBal => parseFloat((prevBal + pnl).toFixed(2)));
            setProfitsClaimable(prevProfits => ({
              totalNetProfit: prevProfits.totalNetProfit + pnl,
              tradeCount: prevProfits.tradeCount + 1,
              winningTrades: prevProfits.winningTrades, 
              losingTrades: prevProfits.losingTrades + 1, 
            }));
          }, 0);
          return { ...trade, status: 'lost_duration', pnl, reasoning: (trade.reasoning || "") + " Manually stopped." };
        }
        return trade;
      })
    );
    toast({ title: "AI Volatility Trading Stopped", description: `Automated trading session for ${paperTradingMode} account has been stopped.`});
  };
  
  useEffect(() => {
    if (!isAutoTradingActive || activeAutomatedTrades.length === 0) { 
      tradeIntervals.current.forEach(intervalId => clearInterval(intervalId));
      tradeIntervals.current.clear();
      if(isAutoTradingActive && activeAutomatedTrades.length === 0 && !isAiLoading){ 
          setIsAutoTradingActive(false);
      }
      return; 
    }
    
    activeAutomatedTrades.forEach(trade => {
      if (trade.status === 'active' && !tradeIntervals.current.has(trade.id)) {
        const intervalId = setInterval(() => {
          setActiveAutomatedTrades(prevTrades => {
            let allTradesConcluded = true;
            const updatedTrades = prevTrades.map(currentTrade => {
              if (currentTrade.id !== trade.id || currentTrade.status !== 'active') {
                if(currentTrade.status === 'active') allTradesConcluded = false;
                return currentTrade;
              }

              let newStatus = currentTrade.status;
              let pnl = currentTrade.pnl ?? 0;
              let newCurrentPrice = currentTrade.currentPrice ?? currentTrade.entryPrice;
              const decimalPlaces = getInstrumentDecimalPlaces(currentTrade.instrument);

              const priceChangeFactor = (Math.random() - 0.5) * (currentTrade.instrument.includes("100") ? 0.005 : 0.0005); // Simplified volatility factor
              newCurrentPrice += priceChangeFactor * newCurrentPrice; // Price changes as percentage
              newCurrentPrice = parseFloat(newCurrentPrice.toFixed(decimalPlaces));

              if (currentTrade.action === 'CALL' && newCurrentPrice <= currentTrade.stopLossPrice) {
                newStatus = 'lost_stoploss'; pnl = -currentTrade.stake;
              } else if (currentTrade.action === 'PUT' && newCurrentPrice >= currentTrade.stopLossPrice) {
                newStatus = 'lost_stoploss'; pnl = -currentTrade.stake;
              }

              if (newStatus === 'active' && Date.now() >= currentTrade.startTime + currentTrade.durationSeconds * 1000) {
                const isWin = Math.random() < 0.70; 
                if (isWin) { newStatus = 'won'; pnl = currentTrade.stake * 0.85; }
                else { newStatus = 'lost_duration'; pnl = -currentTrade.stake; }
              }
              
              if (newStatus !== 'active') {
                clearInterval(tradeIntervals.current.get(trade.id)!);
                tradeIntervals.current.delete(trade.id);
                
                setTimeout(() => {
                  setCurrentBalance(prevBal => parseFloat((prevBal + pnl).toFixed(2)));
                  setProfitsClaimable(prevProfits => ({
                    totalNetProfit: prevProfits.totalNetProfit + pnl,
                    tradeCount: prevProfits.tradeCount + 1,
                    winningTrades: newStatus === 'won' ? prevProfits.winningTrades + 1 : prevProfits.winningTrades,
                    losingTrades: (newStatus === 'lost_duration' || newStatus === 'lost_stoploss') ? prevProfits.losingTrades + 1 : prevProfits.losingTrades,
                  }));
                  
                  toast({
                    title: `Auto-Trade Ended (Volatility - ${paperTradingMode}): ${currentTrade.instrument}`,
                    description: `Status: ${newStatus}, P/L: $${pnl.toFixed(2)}`,
                    variant: pnl > 0 ? "default" : "destructive"
                  });
                }, 0);
              } else {
                allTradesConcluded = false; 
              }
              return { ...currentTrade, status: newStatus, pnl, currentPrice: newCurrentPrice };
            });

            if (allTradesConcluded && isAutoTradingActive) { 
                 setTimeout(() => { 
                    setIsAutoTradingActive(false);
                    toast({ title: "AI Volatility Trading Session Complete", description: `All volatility trades for ${paperTradingMode} account concluded.`});
                }, 100); 
            }
            return updatedTrades;
          });
        }, 1000); // Volatility indices update faster
        tradeIntervals.current.set(trade.id, intervalId);
      }
    });
    
    return () => {
      tradeIntervals.current.forEach(intervalId => clearInterval(intervalId));
      tradeIntervals.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAutomatedTrades, isAutoTradingActive, paperTradingMode, isAiLoading]); 

  return (
    <div className="container mx-auto py-2 space-y-6">
      <h1 className="text-3xl font-bold text-foreground flex items-center gap-2"><Activity className="h-8 w-8 text-primary" />AI Volatility Index Trading</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Volatility Trading Controls</CardTitle>
              <CardDescription>Configure AI-driven trading for volatility indices.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <BalanceDisplay balance={currentBalance} accountType={paperTradingMode} />
              <div>
                <Label htmlFor="vol-account-mode">Account Type</Label>
                <Select value={paperTradingMode} onValueChange={(val) => setPaperTradingMode(val as PaperTradingMode)} disabled={isAutoTradingActive || isAiLoading}>
                  <SelectTrigger id="vol-account-mode" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paper"><UserCheck className="mr-2 h-4 w-4 inline-block text-blue-500"/>Demo Account</SelectItem>
                    <SelectItem value="live"><Briefcase className="mr-2 h-4 w-4 inline-block text-green-500"/>Real Account (Simulated)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="vol-trading-mode">AI Risk Mode</Label>
                <Select value={tradingMode} onValueChange={(val) => setTradingMode(val as TradingMode)} disabled={isAutoTradingActive || isAiLoading}>
                  <SelectTrigger id="vol-trading-mode" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="vol-auto-stake">Total Stake for Session ($)</Label>
                <div className="relative mt-1">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                    id="vol-auto-stake"
                    type="number"
                    value={autoTradeTotalStake}
                    onChange={handleAutoStakeChange}
                    placeholder="e.g., 100"
                    className="w-full pl-8"
                    min="10"
                    disabled={isAutoTradingActive || isAiLoading}
                    />
                </div>
                {autoTradeTotalStake > currentBalance && !isAutoTradingActive && !isAiLoading && (
                    <p className="text-xs text-destructive mt-1">Stake exceeds available balance.</p>
                )}
              </div>
              {isAutoTradingActive ? (
                <Button
                    onClick={handleStopAiAutoTrade}
                    className="w-full bg-red-600 hover:bg-red-700 text-primary-foreground"
                    disabled={isAiLoading && !isAutoTradingActive} 
                >
                    <Square className="mr-2 h-5 w-5" />
                    Stop AI Volatility Trading
                </Button>
                ) : (
                <Button
                    onClick={handleStartAiAutoTrade}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-primary-foreground"
                    disabled={isAiLoading || autoTradeTotalStake <=0 || autoTradeTotalStake > currentBalance}
                >
                    <Bot className="mr-2 h-5 w-5" /> 
                    {isAiLoading && isAutoTradingActive ? 'Initializing AI Trades...' : 'Start AI Volatility Trading'}
                </Button>
              )}
              <p className="text-xs text-muted-foreground text-center">
                Volatility Index trading involves high risk. AI strategies are experimental. All trading is simulated.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Active AI Volatility Trades ({paperTradingMode === 'live' ? 'Real - Simulated' : 'Demo'})</CardTitle>
                <CardDescription>Monitoring automated volatility trades. Stop-Loss is 5% of entry.</CardDescription>
              </CardHeader>
              <CardContent>
                {activeAutomatedTrades.length === 0 && !isAutoTradingActive ? (
                    <p className="text-muted-foreground text-center py-4">No active AI volatility trades. Start a session to begin.</p>
                ) : activeAutomatedTrades.length === 0 && isAutoTradingActive && isAiLoading ? (
                     <p className="text-muted-foreground text-center py-4">AI is analyzing markets for volatility trades...</p>
                ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Instrument</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Stake</TableHead>
                      <TableHead>Entry</TableHead>
                      <TableHead>Current</TableHead>
                      <TableHead>Stop-Loss</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>P/L</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeAutomatedTrades.map(trade => (
                      <TableRow key={trade.id}>
                        <TableCell>{trade.instrument}</TableCell>
                        <TableCell>
                          <Badge variant={trade.action === 'CALL' ? 'default' : 'destructive'} 
                                 className={trade.action === 'CALL' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'}>
                            {trade.action}
                          </Badge>
                        </TableCell>
                        <TableCell>${trade.stake.toFixed(2)}</TableCell>
                        <TableCell>{trade.entryPrice.toFixed(getInstrumentDecimalPlaces(trade.instrument))}</TableCell>
                        <TableCell>{trade.currentPrice?.toFixed(getInstrumentDecimalPlaces(trade.instrument)) ?? '-'}</TableCell>
                        <TableCell>{trade.stopLossPrice.toFixed(getInstrumentDecimalPlaces(trade.instrument))}</TableCell>
                        <TableCell>
                           <Badge variant={trade.status === 'active' ? 'secondary' : (trade.status === 'won' ? 'default' : 'destructive')}
                                  className={trade.status === 'active' ? 'bg-blue-500 text-white' : (trade.status === 'won' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600')}>
                            {trade.status}
                           </Badge>
                        </TableCell>
                        <TableCell className={trade.pnl && trade.pnl > 0 ? 'text-green-500' : trade.pnl && trade.pnl < 0 ? 'text-red-500' : ''}>
                          {trade.pnl ? `$${trade.pnl.toFixed(2)}` : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                )}
              </CardContent>
            </Card>
        </div>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined' && !(window as any).uuidv4) {
  (window as any).uuidv4 = uuidv4;
}
