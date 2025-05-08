
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BalanceDisplay } from '@/components/dashboard/balance-display';
import { TradingChart } from '@/components/dashboard/trading-chart';
import { TradeControls } from '@/components/dashboard/trade-controls';
import { AiRecommendationCard } from '@/components/dashboard/ai-recommendation-card';
import type { TradingInstrument, TradingMode, TradeDuration, AiRecommendation, PaperTradingMode, ActiveAutomatedTrade, ProfitsClaimable, PriceTick } from '@/types';
import { analyzeMarketSentiment } from '@/ai/flows/analyze-market-sentiment';
import { explainAiReasoning } from '@/ai/flows/explain-ai-reasoning';
import { generateAutomatedTradingStrategy } from '@/ai/flows/automated-trading-strategy-flow';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getTicks } from '@/services/deriv';
import { v4 as uuidv4 } from 'uuid'; 
import { getInstrumentDecimalPlaces } from '@/lib/utils';


export default function DashboardPage() {
  const [balance, setBalance] = useState(10000); 
  const [currentInstrument, setCurrentInstrument] = useState<TradingInstrument>('EUR/USD');
  const [tradingMode, setTradingMode] = useState<TradingMode>('balanced');
  const [tradeDuration, setTradeDuration] = useState<TradeDuration>('5m');
  const [paperTradingMode, setPaperTradingMode] = useState<PaperTradingMode>('paper');
  const [stakeAmount, setStakeAmount] = useState<number>(10);

  const [aiRecommendation, setAiRecommendation] = useState<AiRecommendation | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

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

  const handleStartAiAutoTrade = useCallback(async () => {
    if (autoTradeTotalStake <= 0) {
      toast({ title: "Invalid Stake", description: "Please enter a valid total stake for AI trading.", variant: "destructive" });
      return;
    }
    setIsAiLoading(true);
    setIsAutoTradingActive(true);
    setActiveAutomatedTrades([]); 

    try {
      const instrumentsToConsider: TradingInstrument[] = ['EUR/USD', 'GBP/USD', 'BTC/USD', 'XAU/USD', 'ETH/USD']; // SOL/USD removed
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
        setIsAutoTradingActive(false); 
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
        
        let stopLossPrice;
        if (proposal.action === 'CALL') {
          stopLossPrice = entryPrice * (1 - 0.05); 
        } else { 
          stopLossPrice = entryPrice * (1 + 0.05); 
        }
        
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
    setIsAutoTradingActive(false); 
    setActiveAutomatedTrades(prevTrades => 
      prevTrades.map(trade => {
        if (trade.status === 'active') {
          const pnl = -trade.stake;
          setProfitsClaimable(prevProfits => ({
            totalNetProfit: prevProfits.totalNetProfit + pnl,
            tradeCount: prevProfits.tradeCount + 1,
            winningTrades: prevProfits.winningTrades, 
            losingTrades: prevProfits.losingTrades + 1, 
          }));
          return {
            ...trade, 
            status: 'lost_duration', 
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
    if (!isAutoTradingActive) { 
      tradeIntervals.current.forEach(intervalId => clearInterval(intervalId));
      tradeIntervals.current.clear();
      return; 
    }
    
    activeAutomatedTrades.forEach(trade => {
      if (trade.status === 'active' && !tradeIntervals.current.has(trade.id)) {
        const intervalId = setInterval(() => {
          setActiveAutomatedTrades(prevTrades => {
            const updatedTrades = prevTrades.map(currentTrade => {
              if (currentTrade.id !== trade.id || currentTrade.status !== 'active') {
                return currentTrade;
              }

              let newStatus = currentTrade.status;
              let pnl = currentTrade.pnl ?? 0;
              let newCurrentPrice = currentTrade.currentPrice ?? currentTrade.entryPrice;
              const decimalPlaces = getInstrumentDecimalPlaces(currentTrade.instrument);

              const priceChangeFactor = (Math.random() - 0.5) * (decimalPlaces === 2 ? 20 : 0.0005); // Simplified price movement
              newCurrentPrice += priceChangeFactor;
              newCurrentPrice = parseFloat(newCurrentPrice.toFixed(decimalPlaces));

              if (currentTrade.action === 'CALL' && newCurrentPrice <= currentTrade.stopLossPrice) {
                newStatus = 'lost_stoploss';
                pnl = -currentTrade.stake;
              } else if (currentTrade.action === 'PUT' && newCurrentPrice >= currentTrade.stopLossPrice) {
                newStatus = 'lost_stoploss';
                pnl = -currentTrade.stake;
              }

              if (newStatus === 'active' && Date.now() >= currentTrade.startTime + currentTrade.durationSeconds * 1000) {
                const isWin = Math.random() < 0.70; 
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
                
                setTimeout(() => { // Ensure toast is called outside of render cycle
                  toast({
                    title: `Auto-Trade Ended: ${currentTrade.instrument}`,
                    description: `Status: ${newStatus}, P/L: $${pnl.toFixed(2)}`,
                    variant: pnl > 0 ? "default" : "destructive"
                  });
                }, 0);
              }
              return { ...currentTrade, status: newStatus, pnl, currentPrice: newCurrentPrice };
            });

            const stillActiveTradesExist = updatedTrades.some(t => t.status === 'active');
            if (!stillActiveTradesExist && isAutoTradingActive) {
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
  }, [activeAutomatedTrades, isAutoTradingActive, toast, autoTradeTotalStake]);


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
                        <TableCell>{trade.entryPrice.toFixed(getInstrumentDecimalPlaces(trade.instrument))}</TableCell>
                        <TableCell>{trade.currentPrice?.toFixed(getInstrumentDecimalPlaces(trade.instrument)) ?? '-'}</TableCell>
                        <TableCell>{trade.stopLossPrice.toFixed(getInstrumentDecimalPlaces(trade.instrument))}</TableCell>
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
            isAiLoading={isAiLoading && !isAutoTradingActive} 
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

const { v4: importedUuidv4 } = require('uuid');
if (typeof window !== 'undefined' && !(window as any).uuidv4) {
  (window as any).uuidv4 = importedUuidv4;
}

