'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BalanceDisplay } from '@/components/dashboard/balance-display';
import { TradingChart } from '@/components/dashboard/trading-chart';
import { TradeControls } from '@/components/dashboard/trade-controls';
import { AiRecommendationCard } from '@/components/dashboard/ai-recommendation-card';
import type { TradingInstrument, TradingMode, TradeDuration, AiRecommendation, PaperTradingMode, ActiveAutomatedTrade, ProfitsClaimable, AutomatedTradeProposal, PriceTick } from '@/types';
import { analyzeMarketSentiment } from '@/ai/flows/analyze-market-sentiment';
import { explainAiReasoning } from '@/ai/flows/explain-ai-reasoning';
import { generateAutomatedTradingStrategy } from '@/ai/flows/automated-trading-strategy-flow';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getTicks } from '@/services/deriv';
import { v4 as uuidv4 } from 'uuid'; // For generating unique IDs for trades

// Helper function to determine pip size for stop-loss calculation
const getPipSize = (instrument: TradingInstrument): number => {
  if (instrument === 'BTC/USD') {
    return 1; // For BTC/USD, 1 point = $1 movement typically
  }
  return 0.0001; // For forex pairs like EUR/USD, GBP/USD
};


export default function DashboardPage() {
  const [balance, setBalance] = useState(10000); // Default demo balance
  const [currentInstrument, setCurrentInstrument] = useState<TradingInstrument>('EUR/USD');
  const [tradingMode, setTradingMode] = useState<TradingMode>('balanced');
  const [tradeDuration, setTradeDuration] = useState<TradeDuration>('5m');
  const [paperTradingMode, setPaperTradingMode] = useState<PaperTradingMode>('paper');
  const [stakeAmount, setStakeAmount] = useState<number>(10);

  const [aiRecommendation, setAiRecommendation] = useState<AiRecommendation | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  // State for Automated AI Trading
  const [autoTradeTotalStake, setAutoTradeTotalStake] = useState<number>(100);
  const [isAutoTradingActive, setIsAutoTradingActive] = useState(false);
  const [activeAutomatedTrades, setActiveAutomatedTrades] = useState<ActiveAutomatedTrade[]>([]);
  // Persist profits claimable in localStorage or manage via context/global state for real app
  const [profitsClaimable, setProfitsClaimable] = useState<ProfitsClaimable>({
    totalNetProfit: 0,
    tradeCount: 0,
    winningTrades: 0,
    losingTrades: 0,
  });
  const tradeIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());


  const { toast } = useToast();

  // Load profits from localStorage on mount
  useEffect(() => {
    const storedProfits = localStorage.getItem('profitsClaimable');
    if (storedProfits) {
      setProfitsClaimable(JSON.parse(storedProfits));
    }
  }, []);

  // Save profits to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('profitsClaimable', JSON.stringify(profitsClaimable));
  }, [profitsClaimable]);


  const handleInstrumentChange = (instrument: TradingInstrument) => {
    setCurrentInstrument(instrument);
    setAiRecommendation(null);
  };

  const handleExecuteTrade = (action: 'CALL' | 'PUT') => {
    console.log(`Executing ${action} trade for ${currentInstrument} with duration ${tradeDuration} and stake ${stakeAmount} in ${tradingMode} mode. Paper trading: ${paperTradingMode}`);
    const outcome = Math.random() > 0.5 ? "won" : "lost";
    const potentialProfit = stakeAmount * 0.85;

    if (paperTradingMode === 'paper') {
      setBalance(prev => outcome === "won" ? prev + potentialProfit : prev - stakeAmount);
    }

    toast({
      title: `Trade ${paperTradingMode === 'paper' ? 'Simulated' : 'Executed'}`,
      description: `${action} ${currentInstrument} ${outcome === "won" ? "successful" : "failed"}. Stake: $${stakeAmount.toFixed(2)}. ${outcome === "won" ? `Profit: $${potentialProfit.toFixed(2)}` : `Loss: $${stakeAmount.toFixed(2)}`}`,
      variant: outcome === "won" ? "default" : "destructive",
    });
  };

  const handleGetAiRecommendation = useCallback(async () => {
    setIsAiLoading(true);
    setAiRecommendation(null);
    try {
      const marketSentimentParams = {
        symbol: currentInstrument,
        tradingMode: tradingMode,
      };
      const sentimentResult = await analyzeMarketSentiment(marketSentimentParams);
      
      const rsi = Math.random() * 100;
      const macd = (Math.random() - 0.5) * 0.1;
      const volatility = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)];
      
      const explanationParams = {
        rsi: rsi,
        macd: macd,
        volatility: volatility,
        recommendationType: sentimentResult.tradeRecommendation,
      };
      const explanationResult = await explainAiReasoning(explanationParams);

      setAiRecommendation({
        tradeRecommendation: sentimentResult.tradeRecommendation,
        confidenceScore: sentimentResult.confidenceScore,
        optimalDuration: sentimentResult.optimalDuration,
        reasoning: explanationResult.explanation,
      });

      toast({
        title: "AI Analysis Complete",
        description: `Recommendation for ${currentInstrument} received.`,
      });

    } catch (error) {
      console.error("Error getting AI recommendation:", error);
      toast({
        title: "AI Analysis Failed",
        description: "Could not retrieve AI recommendation. Please try again.",
        variant: "destructive",
      });
      setAiRecommendation(null);
    } finally {
      setIsAiLoading(false);
    }
  }, [currentInstrument, tradingMode, toast]);

  // Automated Trading Logic
  const handleStartAiAutoTrade = useCallback(async () => {
    if (autoTradeTotalStake <= 0) {
      toast({ title: "Invalid Stake", description: "Please enter a valid total stake for AI trading.", variant: "destructive" });
      return;
    }
    setIsAiLoading(true);
    setIsAutoTradingActive(true);
    setActiveAutomatedTrades([]); // Clear previous trades

    try {
      const instrumentsToConsider: TradingInstrument[] = ['EUR/USD', 'GBP/USD', 'BTC/USD'];
      const instrumentTicksData: Record<TradingInstrument, PriceTick[]> = {} as Record<TradingInstrument, PriceTick[]>;
      
      for (const inst of instrumentsToConsider) {
        instrumentTicksData[inst] = await getTicks(inst);
      }
      
      const strategyInput = {
        totalStake: autoTradeTotalStake,
        instruments: instrumentsToConsider,
        tradingMode: tradingMode,
        instrumentTicks: instrumentTicksData,
      };
      const strategyResult = await generateAutomatedTradingStrategy(strategyInput);

      if (strategyResult.tradesToExecute.length === 0) {
        toast({ title: "AI Auto-Trade", description: "AI decided not to place trades at this time. " + strategyResult.overallReasoning, duration: 5000 });
        setIsAutoTradingActive(false);
        setIsAiLoading(false);
        return;
      }
      
      toast({ title: "AI Auto-Trade Strategy", description: `AI proposes ${strategyResult.tradesToExecute.length} trade(s). ${strategyResult.overallReasoning}`, duration: 7000});

      const newTrades: ActiveAutomatedTrade[] = [];
      for (const proposal of strategyResult.tradesToExecute) {
        const currentTicks = instrumentTicksData[proposal.instrument];
        if (!currentTicks || currentTicks.length === 0) {
          console.warn(`No tick data for ${proposal.instrument} to determine entry price. Skipping trade.`);
          continue;
        }
        const entryPrice = currentTicks[currentTicks.length - 1].price;
        const pipSize = getPipSize(proposal.instrument);
        let stopLossPrice;
        if (proposal.action === 'CALL') {
          stopLossPrice = entryPrice - (proposal.suggestedStopLossPips * pipSize);
        } else { // PUT
          stopLossPrice = entryPrice + (proposal.suggestedStopLossPips * pipSize);
        }

        const tradeId = uuidv4();
        newTrades.push({
          ...proposal,
          id: tradeId,
          entryPrice,
          stopLossPrice,
          startTime: Date.now(),
          status: 'active',
          currentPrice: entryPrice, // Initial current price
        });
      }
      setActiveAutomatedTrades(newTrades);

    } catch (error) {
      console.error("Error starting AI auto-trade:", error);
      toast({ title: "AI Auto-Trade Failed", description: "Could not generate trading strategy.", variant: "destructive" });
      setIsAutoTradingActive(false);
    } finally {
      setIsAiLoading(false);
    }
  }, [autoTradeTotalStake, tradingMode, toast]);

  const handleStopAiAutoTrade = () => {
    setIsAutoTradingActive(false);
    tradeIntervals.current.forEach(intervalId => clearInterval(intervalId));
    tradeIntervals.current.clear();
    // Optionally, close any "active" trades as "cancelled" or "closed by user"
    setActiveAutomatedTrades(prevTrades => 
      prevTrades.map(trade => trade.status === 'active' ? {...trade, status: 'lost_duration', pnl: -trade.stake, reasoning: (trade.reasoning || "") + " Closed by user." } : trade)
    );
    toast({ title: "AI Auto-Trading Stopped", description: "Automated trading session has been manually stopped."});
  };
  
  // Effect to simulate active trades
  useEffect(() => {
    if (!isAutoTradingActive || activeAutomatedTrades.length === 0) {
      tradeIntervals.current.forEach(intervalId => clearInterval(intervalId));
      tradeIntervals.current.clear();
      return;
    }

    activeAutomatedTrades.forEach(trade => {
      if (trade.status === 'active' && !tradeIntervals.current.has(trade.id)) {
        // Set up interval for this trade simulation
        const intervalId = setInterval(() => {
          setActiveAutomatedTrades(prevTrades =>
            prevTrades.map(currentTrade => {
              if (currentTrade.id !== trade.id || currentTrade.status !== 'active') {
                return currentTrade;
              }

              let newStatus = currentTrade.status;
              let pnl = currentTrade.pnl ?? 0;
              let newCurrentPrice = currentTrade.currentPrice ?? currentTrade.entryPrice;

              // Simulate price movement (very basic)
              const priceChangeFactor = currentTrade.instrument === 'BTC/USD' ? (Math.random() - 0.5) * 20 : (Math.random() - 0.5) * 0.0005;
              newCurrentPrice += priceChangeFactor;
              newCurrentPrice = parseFloat(newCurrentPrice.toFixed(currentTrade.instrument === 'BTC/USD' ? 2 : 4));


              // Check stop-loss
              if (currentTrade.action === 'CALL' && newCurrentPrice <= currentTrade.stopLossPrice) {
                newStatus = 'lost_stoploss';
                pnl = -currentTrade.stake;
              } else if (currentTrade.action === 'PUT' && newCurrentPrice >= currentTrade.stopLossPrice) {
                newStatus = 'lost_stoploss';
                pnl = -currentTrade.stake;
              }

              // Check duration
              if (newStatus === 'active' && Date.now() >= currentTrade.startTime + currentTrade.durationSeconds * 1000) {
                // Simplified outcome for duration expiry: 55% chance of win for demo
                const isWin = Math.random() < 0.55; 
                if (isWin) {
                  newStatus = 'won';
                  pnl = currentTrade.stake * 0.85; // Assume 85% payout
                } else {
                  newStatus = 'lost_duration';
                  pnl = -currentTrade.stake;
                }
              }
              
              if (newStatus !== 'active') {
                clearInterval(tradeIntervals.current.get(trade.id)!);
                tradeIntervals.current.delete(trade.id);
                
                setBalance(prevBalance => prevBalance + pnl);
                setProfitsClaimable(prevProfits => ({
                  totalNetProfit: prevProfits.totalNetProfit + pnl,
                  tradeCount: prevProfits.tradeCount + 1,
                  winningTrades: newStatus === 'won' ? prevProfits.winningTrades + 1 : prevProfits.winningTrades,
                  losingTrades: (newStatus === 'lost_duration' || newStatus === 'lost_stoploss') ? prevProfits.losingTrades + 1 : prevProfits.losingTrades,
                }));
                toast({
                  title: `Auto-Trade Ended: ${currentTrade.instrument}`,
                  description: `Status: ${newStatus}, P/L: $${pnl.toFixed(2)}`,
                  variant: pnl > 0 ? "default" : "destructive"
                });
              }
              return { ...currentTrade, status: newStatus, pnl, currentPrice: newCurrentPrice };
            })
          );
        }, 2000); // Simulate update every 2 seconds
        tradeIntervals.current.set(trade.id, intervalId);
      }
    });
    
    // Cleanup intervals when component unmounts or auto-trading stops
    return () => {
      tradeIntervals.current.forEach(intervalId => clearInterval(intervalId));
      tradeIntervals.current.clear();
    };
  }, [activeAutomatedTrades, isAutoTradingActive, toast]);


  return (
    <div className="container mx-auto py-2">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <BalanceDisplay balance={balance} />
          <TradingChart 
            instrument={currentInstrument}
            onInstrumentChange={handleInstrumentChange}
          />
          {isAutoTradingActive && activeAutomatedTrades.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Active AI Trades</CardTitle>
                <CardDescription>Monitoring automated trades by the AI.</CardDescription>
              </CardHeader>
              <CardContent>
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
                        <TableCell>{trade.entryPrice.toFixed(getPipSize(trade.instrument) === 1 ? 2: 4)}</TableCell>
                        <TableCell>{trade.currentPrice?.toFixed(getPipSize(trade.instrument) === 1 ? 2: 4) ?? '-'}</TableCell>
                        <TableCell>{trade.stopLossPrice.toFixed(getPipSize(trade.instrument) === 1 ? 2: 4)}</TableCell>
                        <TableCell>
                           <Badge variant={trade.status === 'active' ? 'secondary' : (trade.status === 'won' ? 'default' : 'destructive')}
                                  className={trade.status === 'active' ? '' : (trade.status === 'won' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600')}>
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
              </CardContent>
            </Card>
          )}
        </div>

        <div className="lg:col-span-1 space-y-6">
          <TradeControls
            tradingMode={tradingMode}
            onTradingModeChange={setTradingMode}
            tradeDuration={tradeDuration}
            onTradeDurationChange={setTradeDuration}
            paperTradingMode={paperTradingMode}
            onPaperTradingModeChange={setPaperTradingMode}
            stakeAmount={stakeAmount}
            onStakeAmountChange={setStakeAmount}
            onExecuteTrade={handleExecuteTrade}
            onGetAiRecommendation={handleGetAiRecommendation}
            isAiLoading={isAiLoading}
            autoTradeTotalStake={autoTradeTotalStake}
            onAutoTradeTotalStakeChange={setAutoTradeTotalStake}
            onStartAiAutoTrade={handleStartAiAutoTrade}
            onStopAiAutoTrade={handleStopAiAutoTrade}
            isAutoTradingActive={isAutoTradingActive}
            disableManualControls={isAutoTradingActive}
          />
          <AiRecommendationCard recommendation={aiRecommendation} isLoading={isAiLoading && !isAutoTradingActive} />
        </div>
      </div>
    </div>
  );
}

// Helper to get uuid, since it's not available by default in browser client components without explicit import
const { v4: importedUuidv4 } = require('uuid');
if (typeof window !== 'undefined' && !(window as any).uuidv4) {
  (window as any).uuidv4 = importedUuidv4;
}