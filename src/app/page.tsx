
'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { BalanceDisplay } from '@/components/dashboard/balance-display';
import { TradingChart } from '@/components/dashboard/trading-chart';
import { TradeControls } from '@/components/dashboard/trade-controls';
import { AiRecommendationCard } from '@/components/dashboard/ai-recommendation-card';
import type { TradingInstrument, TradingMode, TradeDuration, AiRecommendation, PaperTradingMode, ActiveAutomatedTrade, ProfitsClaimable, PriceTick, ForexCryptoCommodityInstrumentType, TradeRecord } from '@/types';
import { analyzeMarketSentiment } from '@/ai/flows/analyze-market-sentiment';
import { explainAiReasoning } from '@/ai/flows/explain-ai-reasoning';
import { generateAutomatedTradingStrategy } from '@/ai/flows/automated-trading-strategy-flow.ts';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getTicks } from '@/services/deriv';
import { v4 as uuidv4 } from 'uuid'; 
import { getInstrumentDecimalPlaces } from '@/lib/utils';
import { useAuth } from '@/contexts/auth-context';
import { addTradeToHistory } from '@/lib/trade-history-utils';


const FOREX_CRYPTO_COMMODITY_INSTRUMENTS: ForexCryptoCommodityInstrumentType[] = ['EUR/USD', 'GBP/USD', 'BTC/USD', 'XAU/USD', 'ETH/USD'];


export default function DashboardPage() {
  const { 
    authStatus, 
    userInfo,
    paperBalance, 
    setPaperBalance, 
    liveBalance, 
    setLiveBalance 
  } = useAuth();
  
  const [currentInstrument, setCurrentInstrument] = useState<TradingInstrument>(FOREX_CRYPTO_COMMODITY_INSTRUMENTS[0]);
  const [tradingMode, setTradingMode] = useState<TradingMode>('balanced');
  const [tradeDuration, setTradeDuration] = useState<TradeDuration>('5m');
  const [paperTradingMode, setPaperTradingMode] = useState<PaperTradingMode>('paper'); 
  const [stakeAmount, setStakeAmount] = useState<number>(10);

  const [aiRecommendation, setAiRecommendation] = useState<AiRecommendation | null>(null);
  const [isFetchingManualRecommendation, setIsFetchingManualRecommendation] = useState(false);
  const [isPreparingAutoTrades, setIsPreparingAutoTrades] = useState(false);

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

  const currentBalance = paperTradingMode === 'paper' ? paperBalance : liveBalance;
  const setCurrentBalance = paperTradingMode === 'paper' ? setPaperBalance : setLiveBalance;


  const { toast } = useToast();

  useEffect(() => {
    const profitsKey = `forexCryptoProfitsClaimable_${paperTradingMode}`;
    const storedProfits = localStorage.getItem(profitsKey);
    if (storedProfits) {
      try {
        setProfitsClaimable(JSON.parse(storedProfits));
      } catch (error) {
        console.error("Error parsing forex/crypto profits from localStorage:", error);
        setProfitsClaimable({ totalNetProfit: 0, tradeCount: 0, winningTrades: 0, losingTrades: 0 });
      }
    } else {
      setProfitsClaimable({ totalNetProfit: 0, tradeCount: 0, winningTrades: 0, losingTrades: 0 });
    }
  }, [paperTradingMode]);

  useEffect(() => {
    const profitsKey = `forexCryptoProfitsClaimable_${paperTradingMode}`;
    localStorage.setItem(profitsKey, JSON.stringify(profitsClaimable));
  }, [profitsClaimable, paperTradingMode]);


  const handleInstrumentChange = (instrument: TradingInstrument) => {
    if (FOREX_CRYPTO_COMMODITY_INSTRUMENTS.includes(instrument as ForexCryptoCommodityInstrumentType)) {
        setCurrentInstrument(instrument as ForexCryptoCommodityInstrumentType);
    } else {
        setCurrentInstrument(FOREX_CRYPTO_COMMODITY_INSTRUMENTS[0]);
        toast({
            title: "Instrument Switch",
            description: `${instrument} is a Volatility Index. Switched to ${FOREX_CRYPTO_COMMODITY_INSTRUMENTS[0]}. Use Volatility Trading page for Volatility Indices.`,
            variant: "default",
            duration: 5000
        });
    }
    setAiRecommendation(null); 
  };

  const handleExecuteTrade = (action: 'CALL' | 'PUT') => {
    if (authStatus !== 'authenticated' && paperTradingMode === 'live') {
      toast({ title: "Login Required", description: "Please login with your Deriv account to use Real Account features.", variant: "destructive" });
      return;
    }

    if (stakeAmount > currentBalance) {
        toast({ title: `Insufficient ${paperTradingMode === 'paper' ? 'Demo' : 'Real'} Balance`, description: `Stake $${stakeAmount.toFixed(2)} exceeds available balance.`, variant: "destructive" });
        return;
    }
    if (stakeAmount <= 0) {
        toast({ title: "Invalid Stake", description: "Stake amount must be greater than zero.", variant: "destructive" });
        return;
    }

    getTicks(currentInstrument).then(ticks => {
      if (ticks.length === 0) {
        toast({ title: "Price Error", description: `Could not fetch entry price for ${currentInstrument}. Trade not placed.`, variant: "destructive" });
        return;
      }
      const entryPrice = ticks[ticks.length - 1].price;
      const decimals = getInstrumentDecimalPlaces(currentInstrument);
      const priceChange = entryPrice * 0.001; // Small simulated price movement
      
      console.log(`Executing ${action} trade for ${currentInstrument} with duration ${tradeDuration} and stake ${stakeAmount} in ${tradingMode} mode. Account: ${paperTradingMode}. Entry: ${entryPrice}`);
      
      const potentialProfit = stakeAmount * 0.85; 

      setTimeout(() => {
        const outcome = Math.random() > 0.4 ? "won" : "lost"; 
        const pnl = outcome === "won" ? potentialProfit : -stakeAmount;
        let exitPrice: number;

        if (action === 'CALL') {
          exitPrice = outcome === "won" ? entryPrice + priceChange : entryPrice - priceChange;
        } else { // PUT
          exitPrice = outcome === "won" ? entryPrice - priceChange : entryPrice + priceChange;
        }
        exitPrice = parseFloat(exitPrice.toFixed(decimals));
        
        const tradeRecord: TradeRecord = {
          id: uuidv4(),
          timestamp: Date.now(),
          instrument: currentInstrument,
          action: action,
          duration: tradeDuration,
          stake: stakeAmount,
          entryPrice: entryPrice,
          exitPrice: exitPrice,
          pnl: pnl,
          status: outcome === "won" ? "won" : "lost_duration",
          accountType: paperTradingMode,
          tradeCategory: 'forexCrypto',
        };
        addTradeToHistory(tradeRecord, userInfo);
        
        setTimeout(() => {
          setCurrentBalance(prev => parseFloat((prev + pnl).toFixed(2)));
          toast({
            title: `Trade ${paperTradingMode === 'paper' ? 'Simulated (Demo)' : 'Simulated (Real)'}`,
            description: `${action} ${currentInstrument} ${outcome === "won" ? "successful" : "failed"}. Stake: $${stakeAmount.toFixed(2)}. P/L: $${pnl.toFixed(2)}`,
            variant: outcome === "won" ? "default" : "destructive",
          });
        }, 0);
      }, 2000); 
    }).catch(error => {
        toast({ title: "Price Error", description: `Could not fetch entry price for ${currentInstrument}: ${error.message}. Trade not placed.`, variant: "destructive" });
    });
  };

  const handleGetAiRecommendation = useCallback(async () => {
    if (authStatus !== 'authenticated' && paperTradingMode === 'live') {
      toast({ title: "Login Required", description: "AI recommendations for Real Account require login.", variant: "destructive" });
      return;
    }
    if (!FOREX_CRYPTO_COMMODITY_INSTRUMENTS.includes(currentInstrument as ForexCryptoCommodityInstrumentType)) {
      toast({ title: "Invalid Instrument", description: `AI recommendations for ${currentInstrument} are not supported on this page. Use Volatility Trading page for volatility indices.`, variant: "destructive" });
      return;
    }
    setIsFetchingManualRecommendation(true);
    setAiRecommendation(null);
    try {
      const marketSentimentParams = {
        symbol: currentInstrument as ForexCryptoCommodityInstrumentType,
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
      setIsFetchingManualRecommendation(false);
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
    if (autoTradeTotalStake > currentBalance) {
        toast({ title: `Insufficient ${paperTradingMode === 'paper' ? 'Demo' : 'Real'} Balance`, description: `Total stake $${autoTradeTotalStake.toFixed(2)} exceeds ${paperTradingMode} account balance of $${currentBalance.toFixed(2)}.`, variant: "destructive" });
        return;
    }

    setIsPreparingAutoTrades(true); 
    setIsAutoTradingActive(true); 
    setActiveAutomatedTrades([]); 
    setProfitsClaimable({ totalNetProfit: 0, tradeCount: 0, winningTrades: 0, losingTrades: 0 });


    try {
      const instrumentTicksData: Record<ForexCryptoCommodityInstrumentType, PriceTick[]> = {} as Record<ForexCryptoCommodityInstrumentType, PriceTick[]>;
      
      for (const inst of FOREX_CRYPTO_COMMODITY_INSTRUMENTS) {
        try {
          instrumentTicksData[inst] = await getTicks(inst);
        } catch (err) {
          instrumentTicksData[inst] = []; 
          toast({title: `Data Error ${inst}`, description: `Could not fetch price data for ${inst}. AI may exclude it.`, variant: 'destructive', duration: 4000});
        }
      }
      
      const strategyInput = {
        totalStake: autoTradeTotalStake,
        instruments: FOREX_CRYPTO_COMMODITY_INSTRUMENTS,
        tradingMode: tradingMode,
        instrumentTicks: instrumentTicksData,
      };
      const strategyResult = await generateAutomatedTradingStrategy(strategyInput);

      if (!strategyResult || strategyResult.tradesToExecute.length === 0) {
        const reason = strategyResult?.overallReasoning || "AI determined no optimal Forex/Crypto/Commodity trades at this moment.";
        toast({ title: "AI Auto-Trade Update", description: `AI analysis complete. ${reason}`, duration: 7000 });
        setIsAutoTradingActive(false); 
        return;
      }
      
      toast({ title: "AI Auto-Trade Strategy Initiated", description: `AI proposes ${strategyResult.tradesToExecute.length} Forex/Crypto/Commodity trade(s) for ${paperTradingMode} account. ${strategyResult.overallReasoning}`, duration: 7000});

      const newTrades: ActiveAutomatedTrade[] = [];
      let currentAllocatedStake = 0;

      for (const proposal of strategyResult.tradesToExecute) {
        if (currentAllocatedStake + proposal.stake > autoTradeTotalStake) continue; 
        currentAllocatedStake += proposal.stake;

        const currentTicks = instrumentTicksData[proposal.instrument];
        if (!currentTicks || currentTicks.length === 0) {
          toast({ title: "Auto-Trade Skipped", description: `No price data for ${proposal.instrument} to initiate AI trade.`, variant: "destructive"});
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
        toast({ title: "AI Auto-Trade Update", description: "No valid Forex/Crypto/Commodity trades could be initiated based on AI proposals and current conditions.", duration: 7000 });
        setIsAutoTradingActive(false);
      }
      setActiveAutomatedTrades(newTrades);


    } catch (error) {
      toast({ title: "AI Auto-Trade Failed", description: `Could not generate or execute Forex/Crypto/Commodity strategy: ${(error as Error).message}`, variant: "destructive" });
      setIsAutoTradingActive(false);
    } finally {
      setIsPreparingAutoTrades(false); 
    }
  }, [autoTradeTotalStake, tradingMode, toast, paperTradingMode, currentBalance, authStatus, setCurrentBalance, setProfitsClaimable, userInfo]);


  const handleStopAiAutoTrade = () => {
    setIsAutoTradingActive(false); 
    tradeIntervals.current.forEach(intervalId => clearInterval(intervalId));
    tradeIntervals.current.clear();

    setActiveAutomatedTrades(prevTrades => 
      prevTrades.map(trade => {
        if (trade.status === 'active') {
          const pnl = -trade.stake; 
          
          const tradeRecord: TradeRecord = {
            id: trade.id,
            timestamp: Date.now(),
            instrument: trade.instrument,
            action: trade.action,
            duration: `${trade.durationSeconds}s`,
            stake: trade.stake,
            entryPrice: trade.entryPrice,
            exitPrice: trade.currentPrice, // Current price at time of stopping
            pnl: pnl,
            status: 'closed_manual', 
            accountType: paperTradingMode,
            tradeCategory: 'forexCrypto',
            reasoning: (trade.reasoning || "") + " Manually stopped.",
          };
          addTradeToHistory(tradeRecord, userInfo);

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
    toast({ title: "AI Auto-Trading Stopped", description: `Automated Forex/Crypto/Commodity trading session for ${paperTradingMode} account has been manually stopped.`});
  };
  
  useEffect(() => {
    if (isAutoTradingActive && activeAutomatedTrades.every(t => t.status !== 'active') && !isPreparingAutoTrades) {
        setIsAutoTradingActive(false);
    }

    if (!isAutoTradingActive || activeAutomatedTrades.length === 0) { 
      tradeIntervals.current.forEach(intervalId => clearInterval(intervalId));
      tradeIntervals.current.clear();
      return; 
    }
    
    activeAutomatedTrades.forEach(trade => {
      if (trade.status === 'active' && !tradeIntervals.current.has(trade.id)) {
        const intervalId = setInterval(() => {
          setActiveAutomatedTrades(prevTrades => {
            let allTradesConcludedThisTick = true;
            const updatedTrades = prevTrades.map(currentTrade => {
              if (currentTrade.id !== trade.id || currentTrade.status !== 'active') {
                if(currentTrade.status === 'active') allTradesConcludedThisTick = false;
                return currentTrade;
              }

              let newStatus = currentTrade.status;
              let pnl = currentTrade.pnl ?? 0;
              let newCurrentPrice = currentTrade.currentPrice ?? currentTrade.entryPrice;
              const decimalPlaces = getInstrumentDecimalPlaces(currentTrade.instrument);

              const priceChangeFactor = (Math.random() - 0.5) * (decimalPlaces <= 2 ? 0.01 : 0.00010); 
              newCurrentPrice += priceChangeFactor;
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
                
                const tradeRecord: TradeRecord = {
                  id: currentTrade.id,
                  timestamp: Date.now(),
                  instrument: currentTrade.instrument,
                  action: currentTrade.action,
                  duration: `${currentTrade.durationSeconds}s`,
                  stake: currentTrade.stake,
                  entryPrice: currentTrade.entryPrice,
                  exitPrice: newCurrentPrice,
                  pnl: pnl,
                  status: newStatus,
                  accountType: paperTradingMode,
                  tradeCategory: 'forexCrypto',
                  reasoning: currentTrade.reasoning,
                };
                addTradeToHistory(tradeRecord, userInfo);

                setTimeout(() => { 
                  setCurrentBalance(prevBal => parseFloat((prevBal + pnl).toFixed(2)));
                  setProfitsClaimable(prevProfits => ({
                    totalNetProfit: prevProfits.totalNetProfit + pnl,
                    tradeCount: prevProfits.tradeCount + 1,
                    winningTrades: newStatus === 'won' ? prevProfits.winningTrades + 1 : prevProfits.winningTrades,
                    losingTrades: (newStatus === 'lost_duration' || newStatus === 'lost_stoploss') ? prevProfits.losingTrades + 1 : prevProfits.losingTrades,
                  }));
                  
                  toast({
                    title: `Auto-Trade Ended (${paperTradingMode}): ${currentTrade.instrument}`,
                    description: `Status: ${newStatus}, P/L: $${pnl.toFixed(2)}`,
                    variant: pnl > 0 ? "default" : "destructive"
                  });
                }, 0);
              } else {
                allTradesConcludedThisTick = false; 
              }
              return { ...currentTrade, status: newStatus, pnl, currentPrice: newCurrentPrice };
            });
            
            const allTradesNowConcluded = updatedTrades.every(t => t.status !== 'active');

            if (allTradesNowConcluded && isAutoTradingActive) { 
                 setTimeout(() => { 
                    setIsAutoTradingActive(false); 
                    toast({ title: "AI Auto-Trading Session Complete", description: `All Forex/Crypto/Commodity trades for ${paperTradingMode} account concluded.`});
                }, 100); 
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
  }, [activeAutomatedTrades, isAutoTradingActive, paperTradingMode, setCurrentBalance, setProfitsClaimable, toast, isPreparingAutoTrades, userInfo]);


  return (
    <div className="container mx-auto py-2">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <BalanceDisplay balance={currentBalance} accountType={paperTradingMode} />
          <TradingChart 
            instrument={currentInstrument}
            onInstrumentChange={handleInstrumentChange}
            instrumentsToShow={FOREX_CRYPTO_COMMODITY_INSTRUMENTS}
          />
          {isAutoTradingActive && activeAutomatedTrades.length > 0 && (
            <Card className="shadow-lg">
              <CardHeader>
                <CardTitle>Active AI Trades ({paperTradingMode === 'live' ? 'Real - Simulated' : 'Demo'})</CardTitle>
                <CardDescription>Monitoring automated trades by the AI for Forex/Crypto/Commodities. Stop-Loss is 5% of entry.</CardDescription>
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
              </CardContent>
            </Card>
          )}
           {isAutoTradingActive && activeAutomatedTrades.length === 0 && !isPreparingAutoTrades && (
             <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>AI Auto-Trading ({paperTradingMode === 'live' ? 'Real - Simulated' : 'Demo'})</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-4">AI analysis complete. No suitable Forex/Crypto/Commodity trades found at this moment.</p>
                </CardContent>
             </Card>
           )}
            {isPreparingAutoTrades && (
             <Card className="shadow-lg">
                <CardHeader>
                    <CardTitle>AI Auto-Trading ({paperTradingMode === 'live' ? 'Real - Simulated' : 'Demo'})</CardTitle>
                </CardHeader>
                <CardContent>
                    <p className="text-muted-foreground text-center py-4">AI is analyzing Forex/Crypto/Commodity markets and preparing trades...</p>
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
            isFetchingManualRecommendation={isFetchingManualRecommendation} 
            isPreparingAutoTrades={isPreparingAutoTrades} 
            autoTradeTotalStake={autoTradeTotalStake}
            onAutoTradeTotalStakeChange={setAutoTradeTotalStake}
            onStartAiAutoTrade={handleStartAiAutoTrade}
            onStopAiAutoTrade={handleStopAiAutoTrade}
            isAutoTradingActive={isAutoTradingActive} 
            disableManualControls={isAutoTradingActive || isFetchingManualRecommendation || isPreparingAutoTrades} 
            currentBalance={currentBalance}
            supportedInstrumentsForManualAi={FOREX_CRYPTO_COMMODITY_INSTRUMENTS}
            currentSelectedInstrument={currentInstrument}
          />
          <AiRecommendationCard recommendation={aiRecommendation} isLoading={isFetchingManualRecommendation} />
        </div>
      </div>
    </div>
  );
}

if (typeof window !== 'undefined' && !(window as any).uuidv4) {
  (window as any).uuidv4 = uuidv4;
}
