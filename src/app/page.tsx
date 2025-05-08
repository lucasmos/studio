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
import { useAuth } from '@/contexts/auth-context';


export default function DashboardPage() {
  const { authStatus, userInfo } = useAuth();
  const [balance, setBalance] = useState(10000); // Demo balance
  const [realBalance, setRealBalance] = useState(500); // Simulated Real balance
  const [currentInstrument, setCurrentInstrument] = useState<TradingInstrument>('EUR/USD');
  const [tradingMode, setTradingMode] = useState<TradingMode>('balanced');
  const [tradeDuration, setTradeDuration] = useState<TradeDuration>('5m');
  const [paperTradingMode, setPaperTradingMode] = useState<PaperTradingMode>('paper'); // 'paper' (Demo), 'live' (Real Simulated)
  const [stakeAmount, setStakeAmount] = useState<number>(10);

  const [aiRecommendation, setAiRecommendation] = useState<AiRecommendation | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false); // General AI loading for manual recs or auto-trade init

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

  const currentBalance = paperTradingMode === 'paper' ? balance : realBalance;
  const setCurrentBalance = paperTradingMode === 'paper' ? setBalance : setRealBalance;


  const { toast } = useToast();

  useEffect(() => {
    const storedProfits = localStorage.getItem(`profitsClaimable_${paperTradingMode}`);
    if (storedProfits) {
      setProfitsClaimable(JSON.parse(storedProfits));
    } else {
      setProfitsClaimable({ totalNetProfit: 0, tradeCount: 0, winningTrades: 0, losingTrades: 0 });
    }
  }, [paperTradingMode]);

  useEffect(() => {
    localStorage.setItem(`profitsClaimable_${paperTradingMode}`, JSON.stringify(profitsClaimable));
  }, [profitsClaimable, paperTradingMode]);


  const handleInstrumentChange = (instrument: TradingInstrument) => {
    setCurrentInstrument(instrument);
    setAiRecommendation(null); // Clear previous recommendation
  };

  const handleExecuteTrade = (action: 'CALL' | 'PUT') => {
    if (authStatus !== 'authenticated' && paperTradingMode === 'live') {
      toast({ title: "Login Required", description: "Please login with your Deriv account to use Real Account features.", variant: "destructive" });
      return;
    }

    const tradeId = uuidv4();
    const entryPrice = (Math.random() * 10 + 1.05).toFixed(getInstrumentDecimalPlaces(currentInstrument)); // Simulated
    console.log(`Executing ${action} trade for ${currentInstrument} with duration ${tradeDuration} and stake ${stakeAmount} in ${tradingMode} mode. Account: ${paperTradingMode}`);
    
    const potentialProfit = stakeAmount * 0.85; // Simplified 85% payout

    // Simulate trade outcome after a delay
    setTimeout(() => {
      const outcome = Math.random() > 0.4 ? "won" : "lost"; // 60% win rate for manual trades
      
      setCurrentBalance(prev => outcome === "won" ? prev + potentialProfit : prev - stakeAmount);

      toast({
        title: `Trade ${paperTradingMode === 'paper' ? 'Simulated (Demo)' : 'Simulated (Real)'}`,
        description: `${action} ${currentInstrument} ${outcome === "won" ? "successful" : "failed"}. Stake: $${stakeAmount.toFixed(2)}. ${outcome === "won" ? `Profit: $${potentialProfit.toFixed(2)}` : `Loss: $${stakeAmount.toFixed(2)}`}`,
        variant: outcome === "won" ? "default" : "destructive",
      });
    }, 2000); // Simulate trade processing time
  };

  const handleGetAiRecommendation = useCallback(async () => {
    if (authStatus !== 'authenticated' && paperTradingMode === 'live') {
      toast({ title: "Login Required", description: "AI recommendations for Real Account require login.", variant: "destructive" });
      return;
    }
    setIsAiLoading(true);
    setAiRecommendation(null);
    try {
      const marketSentimentParams = {
        symbol: currentInstrument,
        tradingMode: tradingMode,
      };
      const sentimentResult = await analyzeMarketSentiment(marketSentimentParams);
      
      // Simulate fetching/calculating RSI, MACD, Volatility for explanation
      // In a real scenario, these would come from deriv-api or other indicators
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
  }, [currentInstrument, tradingMode, toast, authStatus, paperTradingMode]);

  const handleStartAiAutoTrade = useCallback(async () => {
    if (authStatus !== 'authenticated' && paperTradingMode === 'live') {
      toast({ title: "Login Required", description: "AI Auto-Trading on Real Account requires login.", variant: "destructive" });
      return;
    }
    if (autoTradeTotalStake <= 0) {
      toast({ title: "Invalid Stake", description: "Please enter a valid total stake for AI trading.", variant: "destructive" });
      return;
    }
    if (paperTradingMode === 'live' && autoTradeTotalStake > realBalance) {
        toast({ title: "Insufficient Real Balance", description: `Total stake $${autoTradeTotalStake.toFixed(2)} exceeds real account balance of $${realBalance.toFixed(2)}.`, variant: "destructive" });
        return;
    }
    if (paperTradingMode === 'paper' && autoTradeTotalStake > balance) {
        toast({ title: "Insufficient Demo Balance", description: `Total stake $${autoTradeTotalStake.toFixed(2)} exceeds demo account balance of $${balance.toFixed(2)}.`, variant: "destructive" });
        return;
    }

    console.log(`[AI Auto-Trade] Starting session. Mode: ${paperTradingMode}, Total Stake: ${autoTradeTotalStake}, Trading Style: ${tradingMode}`);
    setIsAiLoading(true); // Indicates AI strategy generation is in progress
    setIsAutoTradingActive(true);
    setActiveAutomatedTrades([]); 
    // Reset profits for the new session (specific to current account type)
    setProfitsClaimable({ totalNetProfit: 0, tradeCount: 0, winningTrades: 0, losingTrades: 0 });


    try {
      const instrumentsToConsider: TradingInstrument[] = ['EUR/USD', 'GBP/USD', 'BTC/USD', 'XAU/USD', 'ETH/USD'];
      const instrumentTicksData: Record<TradingInstrument, PriceTick[]> = {} as Record<TradingInstrument, PriceTick[]>
      
      console.log("[AI Auto-Trade] Fetching initial tick data for instruments:", instrumentsToConsider);
      for (const inst of instrumentsToConsider) {
        try {
          instrumentTicksData[inst] = await getTicks(inst);
          console.log(`[AI Auto-Trade] Fetched ${instrumentTicksData[inst].length} ticks for ${inst}`);
        } catch (err) {
          console.error(`[AI Auto-Trade] Failed to fetch ticks for ${inst} during initial data gathering:`, err);
          instrumentTicksData[inst] = []; // Store empty array on failure to allow AI to proceed with other data
          toast({title: `Data Error ${inst}`, description: `Could not fetch price data for ${inst}. AI may exclude it.`, variant: 'destructive', duration: 4000});
        }
      }
      
      const strategyInput = {
        totalStake: autoTradeTotalStake,
        instruments: instrumentsToConsider,
        tradingMode: tradingMode,
        instrumentTicks: instrumentTicksData,
      };
      console.log("[AI Auto-Trade] Generating AI strategy with input:", strategyInput);
      const strategyResult = await generateAutomatedTradingStrategy(strategyInput);
      console.log("[AI Auto-Trade] Received strategy from AI:", strategyResult);


      if (!strategyResult || strategyResult.tradesToExecute.length === 0) {
        const reason = strategyResult?.overallReasoning || "AI determined no optimal trades at this moment.";
        console.warn("[AI Auto-Trade] AI decided not to place trades or returned empty strategy. Reason:", reason);
        toast({ title: "AI Auto-Trade Update", description: `AI analysis complete. ${reason}`, duration: 7000 });
        setIsAutoTradingActive(false); 
        setIsAiLoading(false);
        return;
      }
      
      toast({ title: "AI Auto-Trade Strategy Initiated", description: `AI proposes ${strategyResult.tradesToExecute.length} trade(s) for ${paperTradingMode} account. ${strategyResult.overallReasoning}`, duration: 7000});

      const newTrades: ActiveAutomatedTrade[] = [];
      let currentAllocatedStake = 0;

      console.log("[AI Auto-Trade] Processing AI trade proposals...");
      for (const proposal of strategyResult.tradesToExecute) {
        console.log(`[AI Auto-Trade] Processing proposal: ${proposal.instrument} ${proposal.action} Stake: ${proposal.stake} Duration: ${proposal.durationSeconds}s`);

        if (currentAllocatedStake + proposal.stake > autoTradeTotalStake) {
          console.warn(`[AI Auto-Trade] Skipping trade proposal for ${proposal.instrument} (Stake: ${proposal.stake}). Current allocated: ${currentAllocatedStake}, Proposal exceeds total session stake of ${autoTradeTotalStake}. This can happen if AI over-allocated and frontend scaling was insufficient.`);
          continue; 
        }
        currentAllocatedStake += proposal.stake;

        const currentTicks = instrumentTicksData[proposal.instrument];
        if (!currentTicks || currentTicks.length === 0) {
          console.warn(`[AI Auto-Trade] No tick data for ${proposal.instrument} to determine entry price. Skipping trade proposal. AI might have proposed this based on other factors or stale data if getTicks failed for it initially but strategy included it.`);
          toast({ title: "Auto-Trade Skipped", description: `No price data for ${proposal.instrument} to initiate AI trade.`, variant: "destructive"});
          continue;
        }
        const entryPrice = currentTicks[currentTicks.length - 1].price;
        console.log(`[AI Auto-Trade] Entry price for ${proposal.instrument} determined as ${entryPrice} from pre-fetched ticks.`);
        
        let stopLossPrice;
        const stopLossPercentage = 0.05; // 5% Stop Loss
        if (proposal.action === 'CALL') {
          stopLossPrice = entryPrice * (1 - stopLossPercentage);
        } else { // PUT
          stopLossPrice = entryPrice * (1 + stopLossPercentage);
        }
        
        stopLossPrice = parseFloat(stopLossPrice.toFixed(getInstrumentDecimalPlaces(proposal.instrument)));
        console.log(`[AI Auto-Trade] Calculated Stop-Loss for ${proposal.instrument} ${proposal.action}: ${stopLossPrice} (Entry: ${entryPrice})`);


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
        console.log(`[AI Auto-Trade] Added trade ${tradeId} for ${proposal.instrument} to execution queue.`);
      }

      if (newTrades.length === 0) {
        console.warn("[AI Auto-Trade] No valid trades could be initiated after filtering AI proposals.");
        toast({ title: "AI Auto-Trade Update", description: "No valid trades could be initiated based on AI proposals and current conditions. Check console for details.", duration: 7000 });
        setIsAutoTradingActive(false);
      } else {
        console.log(`[AI Auto-Trade] Initiating ${newTrades.length} automated trades.`, newTrades);
        setActiveAutomatedTrades(newTrades);
      }

    } catch (error) {
      console.error("[AI Auto-Trade] Error starting AI auto-trade session:", error);
      toast({ title: "AI Auto-Trade Failed", description: `Could not generate or execute trading strategy: ${(error as Error).message}`, variant: "destructive" });
      setIsAutoTradingActive(false);
    } finally {
      console.log("[AI Auto-Trade] Finalizing auto-trade start attempt.");
      setIsAiLoading(false); // AI strategy generation/processing finished
    }
  }, [autoTradeTotalStake, tradingMode, toast, paperTradingMode, balance, realBalance, authStatus, setCurrentBalance]);

  const handleStopAiAutoTrade = () => {
    console.log("[AI Auto-Trade] User initiated stop.");
    setIsAutoTradingActive(false); // This will trigger useEffect to clear intervals
    // Close any remaining active trades as 'lost_duration' due to manual stop
    setActiveAutomatedTrades(prevTrades => 
      prevTrades.map(trade => {
        if (trade.status === 'active') {
          console.log(`[AI Auto-Trade] Closing active trade ${trade.id} (${trade.instrument}) due to manual stop.`);
          const pnl = -trade.stake; // Assume loss of full stake on manual stop
          setCurrentBalance(prevBal => prevBal + pnl); // Update the correct balance
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
    toast({ title: "AI Auto-Trading Stopped", description: `Automated trading session for ${paperTradingMode} account has been manually stopped.`});
  };
  
  useEffect(() => {
    if (!isAutoTradingActive || activeAutomatedTrades.length === 0) { 
      // console.log("[AI Auto-Trade Effect] Not active or no trades, clearing all intervals.");
      tradeIntervals.current.forEach(intervalId => clearInterval(intervalId));
      tradeIntervals.current.clear();
      // If there were active trades that might not have been resolved (e.g. browser refresh),
      // this ensures the button resets if activeAutomatedTrades becomes empty.
      if(isAutoTradingActive && activeAutomatedTrades.length === 0 && !isAiLoading){ // Added !isAiLoading to prevent premature stop during init
          // console.log("[AI Auto-Trade Effect] Session was active but no trades remain and not loading, setting isAutoTradingActive to false.");
          setIsAutoTradingActive(false);
      }
      return; 
    }
    
    // console.log("[AI Auto-Trade Effect] Setting up intervals for active trades:", activeAutomatedTrades.filter(t => t.status === 'active').map(t => t.id));
    activeAutomatedTrades.forEach(trade => {
      if (trade.status === 'active' && !tradeIntervals.current.has(trade.id)) {
        // console.log(`[AI Auto-Trade Effect] Setting up interval for trade ${trade.id} (${trade.instrument})`);
        const intervalId = setInterval(() => {
          setActiveAutomatedTrades(prevTrades => {
            let allTradesConcluded = true;
            const updatedTrades = prevTrades.map(currentTrade => {
              if (currentTrade.id !== trade.id || currentTrade.status !== 'active') {
                if(currentTrade.status === 'active') allTradesConcluded = false;
                return currentTrade;
              }

              // console.log(`[AI Auto-Trade Tick] Updating trade ${currentTrade.id} (${currentTrade.instrument})`);
              let newStatus = currentTrade.status;
              let pnl = currentTrade.pnl ?? 0;
              let newCurrentPrice = currentTrade.currentPrice ?? currentTrade.entryPrice;
              const decimalPlaces = getInstrumentDecimalPlaces(currentTrade.instrument);

              // Simplified price movement simulation
              const priceChangeFactor = (Math.random() - 0.5) * (decimalPlaces <= 2 ? 0.01 : 0.00010); // Adjusted volatility
              newCurrentPrice += priceChangeFactor;
              newCurrentPrice = parseFloat(newCurrentPrice.toFixed(decimalPlaces));

              // Check Stop Loss
              if (currentTrade.action === 'CALL' && newCurrentPrice <= currentTrade.stopLossPrice) {
                newStatus = 'lost_stoploss';
                pnl = -currentTrade.stake;
                // console.log(`[AI Auto-Trade Result] Trade ${currentTrade.id} (${currentTrade.instrument}) LOST by STOP-LOSS. Price: ${newCurrentPrice}, SL: ${currentTrade.stopLossPrice}`);
              } else if (currentTrade.action === 'PUT' && newCurrentPrice >= currentTrade.stopLossPrice) {
                newStatus = 'lost_stoploss';
                pnl = -currentTrade.stake;
                // console.log(`[AI Auto-Trade Result] Trade ${currentTrade.id} (${currentTrade.instrument}) LOST by STOP-LOSS. Price: ${newCurrentPrice}, SL: ${currentTrade.stopLossPrice}`);
              }

              // Check Duration
              if (newStatus === 'active' && Date.now() >= currentTrade.startTime + currentTrade.durationSeconds * 1000) {
                // AI's 70% win rate target simulation
                const isWin = Math.random() < 0.70; 
                if (isWin) {
                  newStatus = 'won';
                  pnl = currentTrade.stake * 0.85; // Simplified 85% payout
                  // console.log(`[AI Auto-Trade Result] Trade ${currentTrade.id} (${currentTrade.instrument}) WON by DURATION. Final Price: ${newCurrentPrice}`);
                } else {
                  newStatus = 'lost_duration';
                  pnl = -currentTrade.stake;
                  // console.log(`[AI Auto-Trade Result] Trade ${currentTrade.id} (${currentTrade.instrument}) LOST by DURATION. Final Price: ${newCurrentPrice}`);
                }
              }
              
              if (newStatus !== 'active') {
                // console.log(`[AI Auto-Trade Effect] Clearing interval for concluded trade ${trade.id} (${trade.instrument}). Status: ${newStatus}`);
                clearInterval(tradeIntervals.current.get(trade.id)!);
                tradeIntervals.current.delete(trade.id);
                
                setCurrentBalance(prevBal => prevBal + pnl);
                setProfitsClaimable(prevProfits => ({
                  totalNetProfit: prevProfits.totalNetProfit + pnl,
                  tradeCount: prevProfits.tradeCount + 1,
                  winningTrades: newStatus === 'won' ? prevProfits.winningTrades + 1 : prevProfits.winningTrades,
                  losingTrades: (newStatus === 'lost_duration' || newStatus === 'lost_stoploss') ? prevProfits.losingTrades + 1 : prevProfits.losingTrades,
                }));
                
                // Ensure toast is called outside of render cycle slightly deferred
                setTimeout(() => {
                  toast({
                    title: `Auto-Trade Ended (${paperTradingMode}): ${currentTrade.instrument}`,
                    description: `Status: ${newStatus}, P/L: $${pnl.toFixed(2)}`,
                    variant: pnl > 0 ? "default" : "destructive"
                  });
                }, 0);
              } else {
                allTradesConcluded = false; // At least one trade is still active
              }
              return { ...currentTrade, status: newStatus, pnl, currentPrice: newCurrentPrice };
            });

            // If all trades have concluded, stop the auto-trading session
            if (allTradesConcluded && isAutoTradingActive) { // Check isAutoTradingActive again, might have been stopped manually
                 // console.log("[AI Auto-Trade Effect] All trades concluded, stopping auto-trading session.");
                 setTimeout(() => { // Delay to ensure all state updates from this tick propagate before setting isAutoTradingActive to false
                    setIsAutoTradingActive(false);
                    toast({ title: "AI Auto-Trading Session Complete", description: `All trades for ${paperTradingMode} account concluded.`});
                }, 100); 
            }
            return updatedTrades;
          });
        }, 2000); // Check trade status every 2 seconds
        tradeIntervals.current.set(trade.id, intervalId);
      }
    });
    
    // Cleanup intervals when component unmounts or dependencies change that stop trading
    return () => {
      // console.log("[AI Auto-Trade Effect Cleanup] Clearing all intervals on unmount or dependency change.");
      tradeIntervals.current.forEach(intervalId => clearInterval(intervalId));
      tradeIntervals.current.clear();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAutomatedTrades, isAutoTradingActive, paperTradingMode, setCurrentBalance, isAiLoading]); // Added isAiLoading, autoTradeTotalStake removed as it is read at start


  return (
    <div className="container mx-auto py-2">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <BalanceDisplay balance={currentBalance} accountType={paperTradingMode} />
          <TradingChart 
            instrument={currentInstrument}
            onInstrumentChange={handleInstrumentChange}
          />
          {isAutoTradingActive && activeAutomatedTrades.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Active AI Trades ({paperTradingMode === 'live' ? 'Real - Simulated' : 'Demo'})</CardTitle>
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
            isAiLoading={isAiLoading && !isAutoTradingActive} // General AI loading state
            autoTradeTotalStake={autoTradeTotalStake}
            onAutoTradeTotalStakeChange={setAutoTradeTotalStake}
            onStartAiAutoTrade={handleStartAiAutoTrade}
            onStopAiAutoTrade={handleStopAiAutoTrade}
            isAutoTradingActive={isAutoTradingActive} // Specifically for auto-trading session
            disableManualControls={isAutoTradingActive || isAiLoading} // Also disable manual if any AI is loading
          />
          <AiRecommendationCard recommendation={aiRecommendation} isLoading={isAiLoading && !isAutoTradingActive} />
        </div>
      </div>
    </div>
  );
}

// Ensure uuidv4 is available on client-side only if not already on window
if (typeof window !== 'undefined' && !(window as any).uuidv4) {
  (window as any).uuidv4 = uuidv4;
}