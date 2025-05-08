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

// Helper function to determine pip size for display formatting
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
  const [profitsClaimable, setProfitsClaimable] = useState<ProfitsClaimable>({
    totalNetProfit: 0,
    tradeCount: 0,
    winningTrades: 0,
    losingTrades: 0,
  });
  const tradeIntervals = useRef<Map<string, NodeJS.Timeout>>(new Map());


  const { toast } = useToast();

  useEffect(() => {
    const storedProfits = localStorage.getItem('profitsClaimable');
    if (storedProfits) {
      setProfitsClaimable(JSON.parse(storedProfits));
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('profitsClaimable', JSON.stringify(profitsClaimable));
  }, [profitsClaimable]);


  const handleInstrumentChange = (instrument: TradingInstrument) => {
    setCurrentInstrument(instrument);
    setAiRecommendation(null);
  };

  const handleExecuteTrade = (action: 'CALL' | 'PUT') => {
    console.log(`Executing ${action} trade for ${currentInstrument} with duration ${tradeDuration} and stake ${stakeAmount} in ${tradingMode} mode. Paper trading: ${paperTradingMode}`);
    const outcome = Math.random() > 0.5 ? "won" : "lost"; // 50/50 for manual trades for now
    const potentialProfit = stakeAmount * 0.85; // Assume 85% payout

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
      
      // Mocked technical indicators for reasoning. In a real app, these would come from analysis.
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
    setActiveAutomatedTrades([]); 

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
        toast({ title: "AI Auto-Trade", description: "AI decided not to place trades at this time. " + strategyResult.overallReasoning, duration: 7000 });
        setIsAutoTradingActive(false); // AI didn't start any trades
        setIsAiLoading(false);
        return;
      }
      
      toast({ title: "AI Auto-Trade Strategy Initiated", description: `AI proposes ${strategyResult.tradesToExecute.length} trade(s). ${strategyResult.overallReasoning}`, duration: 7000});

      const newTrades: ActiveAutomatedTrade[] = [];
      let currentAllocatedStake = 0;

      for (const proposal of strategyResult.tradesToExecute) {
        if (currentAllocatedStake + proposal.stake > autoTradeTotalStake) {
          console.warn(`Skipping trade proposal for ${proposal.instrument} due to exceeding total stake limit after AI scaling.`);
          continue; 
        }
        currentAllocatedStake += proposal.stake;

        const currentTicks = instrumentTicksData[proposal.instrument];
        if (!currentTicks || currentTicks.length === 0) {
          console.warn(`No tick data for ${proposal.instrument} to determine entry price. Skipping trade.`);
          toast({ title: "Auto-Trade Skipped", description: `No price data for ${proposal.instrument}.`, variant: "destructive"});
          continue;
        }
        const entryPrice = currentTicks[currentTicks.length - 1].price;
        
        // Calculate 5% stop-loss price
        let stopLossPrice;
        if (proposal.action === 'CALL') {
          stopLossPrice = entryPrice * (1 - 0.05); // 5% below entry
        } else { // PUT
          stopLossPrice = entryPrice * (1 + 0.05); // 5% above entry
        }
        // Ensure stopLossPrice has appropriate precision
        stopLossPrice = parseFloat(stopLossPrice.toFixed(proposal.instrument === 'BTC/USD' ? 2 : 4));


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
        toast({ title: "AI Auto-Trade", description: "No valid trades could be initiated based on AI proposals and current conditions.", duration: 5000 });
        setIsAutoTradingActive(false);
      } else {
        setActiveAutomatedTrades(newTrades);
      }

    } catch (error) {
      console.error("Error starting AI auto-trade:", error);
      toast({ title: "AI Auto-Trade Failed", description: `Could not generate or execute trading strategy: ${(error as Error).message}`, variant: "destructive" });
      setIsAutoTradingActive(false);
    } finally {
      setIsAiLoading(false);
    }
  }, [autoTradeTotalStake, tradingMode, toast]);

  const handleStopAiAutoTrade = () => {
    setIsAutoTradingActive(false); // This will trigger cleanup in the useEffect below
    // Update status of any truly active trades to 'lost_duration' or a new 'cancelled_by_user' status
    // to reflect they didn't complete naturally. The PNL should be -stake for these.
    setActiveAutomatedTrades(prevTrades => 
      prevTrades.map(trade => {
        if (trade.status === 'active') {
          const pnl = -trade.stake;
          // Update profits claimable immediately for cancelled trades
          setProfitsClaimable(prevProfits => ({
            totalNetProfit: prevProfits.totalNetProfit + pnl,
            tradeCount: prevProfits.tradeCount + 1,
            winningTrades: prevProfits.winningTrades, // Not a win
            losingTrades: prevProfits.losingTrades + 1, 
          }));
          return {
            ...trade, 
            status: 'lost_duration', // Or a new 'cancelled_by_user' status
            pnl, 
            reasoning: (trade.reasoning || "") + " Manually stopped by user." 
          };
        }
        return trade;
      })
    );
    toast({ title: "AI Auto-Trading Stopped", description: "Automated trading session has been manually stopped."});
  };
  
  useEffect(() => {
    if (!isAutoTradingActive) { // If auto trading is globally stopped
      tradeIntervals.current.forEach(intervalId => clearInterval(intervalId));
      tradeIntervals.current.clear();
      return; // Exit early, no need to process trades
    }

    if (activeAutomatedTrades.length === 0 && isAutoTradingActive) {
        // This case handles if AI proposes trades but none are valid to start,
        // or if all trades finished and handleStartAiAutoTrade didn't reset isAutoTradingActive
        // because it completed without error but yielded no trades to monitor.
        // However, the primary check for all trades finishing is now inside the interval logic.
    }
    
    activeAutomatedTrades.forEach(trade => {
      if (trade.status === 'active' && !tradeIntervals.current.has(trade.id)) {
        const intervalId = setInterval(() => {
          setActiveAutomatedTrades(prevTrades => {
            let allTradesConcluded = true;
            const updatedTrades = prevTrades.map(currentTrade => {
              if (currentTrade.id !== trade.id || currentTrade.status !== 'active') {
                if(currentTrade.status === 'active') allTradesConcluded = false; // Check other trades
                return currentTrade;
              }

              allTradesConcluded = false; // This trade is active, so not all concluded yet

              let newStatus = currentTrade.status;
              let pnl = currentTrade.pnl ?? 0;
              let newCurrentPrice = currentTrade.currentPrice ?? currentTrade.entryPrice;

              const priceChangeFactor = currentTrade.instrument === 'BTC/USD' ? (Math.random() - 0.5) * 20 : (Math.random() - 0.5) * 0.0005;
              newCurrentPrice += priceChangeFactor;
              newCurrentPrice = parseFloat(newCurrentPrice.toFixed(currentTrade.instrument === 'BTC/USD' ? 2 : 4));

              if (currentTrade.action === 'CALL' && newCurrentPrice <= currentTrade.stopLossPrice) {
                newStatus = 'lost_stoploss';
                pnl = -currentTrade.stake;
              } else if (currentTrade.action === 'PUT' && newCurrentPrice >= currentTrade.stopLossPrice) {
                newStatus = 'lost_stoploss';
                pnl = -currentTrade.stake;
              }

              if (newStatus === 'active' && Date.now() >= currentTrade.startTime + currentTrade.durationSeconds * 1000) {
                const isWin = Math.random() < 0.70; // Target 70% win rate for simulation
                if (isWin) {
                  newStatus = 'won';
                  pnl = currentTrade.stake * 0.85; 
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
                
                setTimeout(() => {
                  toast({
                    title: `Auto-Trade Ended: ${currentTrade.instrument}`,
                    description: `Status: ${newStatus}, P/L: $${pnl.toFixed(2)}`,
                    variant: pnl > 0 ? "default" : "destructive"
                  });
                }, 0);
              }
              return { ...currentTrade, status: newStatus, pnl, currentPrice: newCurrentPrice };
            });

            // After updating, check if all trades are now concluded
            const stillActiveTradesExist = updatedTrades.some(t => t.status === 'active');
            if (!stillActiveTradesExist && isAutoTradingActive) { // only if auto trading was meant to be active
                // All trades concluded, stop the auto-trading session state
                // This needs to be wrapped in a `setIsAutoTradingActive` call
                // but that would cause a re-render loop here.
                // A better way is to set a flag or use a ref to signal this outside.
                // Or, call `handleStopAiAutoTrade` but without the manual stop toast.
                // For now, deferring the state change.
                // This should be setIsAutoTradingActive(false)
                console.log("All automated trades have concluded.");
                 // This will trigger the cleanup in the next render cycle of this useEffect
                 // or the main `isAutoTradingActive` condition at the top.
                 // To ensure it happens now:
                 setTimeout(() => setIsAutoTradingActive(false), 0);
            }


            return updatedTrades;
          });
        }, 2000); 
        tradeIntervals.current.set(trade.id, intervalId);
      }
    });
    
    return () => {
      tradeIntervals.current.forEach(intervalId => clearInterval(intervalId));
      tradeIntervals.current.clear();
    };
  }, [activeAutomatedTrades, isAutoTradingActive, toast, autoTradeTotalStake]); // Added autoTradeTotalStake as a dep.


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
                <CardDescription>Monitoring automated trades by the AI. Stop-Loss is 5% of entry.</CardDescription>
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
                      <TableHead>Stop-Loss (5%)</TableHead>
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
            isAiLoading={isAiLoading && !isAutoTradingActive} // Only show manual AI loading if not auto-trading
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
