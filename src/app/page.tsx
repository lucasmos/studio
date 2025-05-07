'use client';

import { useState, useEffect, useCallback } from 'react';
import { BalanceDisplay } from '@/components/dashboard/balance-display';
import { TradingChart } from '@/components/dashboard/trading-chart';
import { TradeControls } from '@/components/dashboard/trade-controls';
import { AiRecommendationCard } from '@/components/dashboard/ai-recommendation-card';
import type { TradingInstrument, TradingMode, TradeDuration, AiRecommendation, PaperTradingMode } from '@/types';
import { analyzeMarketSentiment } from '@/ai/flows/analyze-market-sentiment';
import { explainAiReasoning } from '@/ai/flows/explain-ai-reasoning';
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const [balance, setBalance] = useState(10000); // Default demo balance
  const [currentInstrument, setCurrentInstrument] = useState<TradingInstrument>('EUR/USD');
  const [tradingMode, setTradingMode] = useState<TradingMode>('balanced');
  const [tradeDuration, setTradeDuration] = useState<TradeDuration>('5m');
  const [paperTradingMode, setPaperTradingMode] = useState<PaperTradingMode>('paper');
  
  const [aiRecommendation, setAiRecommendation] = useState<AiRecommendation | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const { toast } = useToast();

  const handleInstrumentChange = (instrument: TradingInstrument) => {
    setCurrentInstrument(instrument);
    setAiRecommendation(null); // Clear previous recommendation when instrument changes
  };

  const handleExecuteTrade = (action: 'CALL' | 'PUT') => {
    // Placeholder for trade execution logic
    console.log(`Executing ${action} trade for ${currentInstrument} with duration ${tradeDuration} in ${tradingMode} mode. Paper trading: ${paperTradingMode}`);
    const outcome = Math.random() > 0.5 ? "won" : "lost";
    const amount = Math.random() * 100;
    
    if (paperTradingMode === 'paper') {
      setBalance(prev => outcome === "won" ? prev + amount : prev - amount);
    }

    toast({
      title: `Trade ${paperTradingMode === 'paper' ? 'Simulated' : 'Executed'}`,
      description: `${action} ${currentInstrument} ${outcome === "won" ? "successful" : "failed"}. Amount: $${amount.toFixed(2)}`,
      variant: outcome === "won" ? "default" : "destructive",
    });
  };

  const handleGetAiRecommendation = useCallback(async () => {
    setIsAiLoading(true);
    setAiRecommendation(null);
    try {
      // Step 1: Get market sentiment analysis
      const marketSentimentParams = {
        symbol: currentInstrument,
        tradingMode: tradingMode,
      };
      const sentimentResult = await analyzeMarketSentiment(marketSentimentParams);
      
      // Step 2: (Simulated) Get additional data for reasoning if needed
      // In a real app, these would come from market data APIs
      const rsi = Math.random() * 100; // Simulated RSI
      const macd = (Math.random() - 0.5) * 0.1; // Simulated MACD
      const volatility = ['low', 'medium', 'high'][Math.floor(Math.random() * 3)]; // Simulated volatility
      
      // Step 3: Get simplified explanation
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

  return (
    <div className="container mx-auto py-2">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main content area - Left and Middle columns */}
        <div className="lg:col-span-2 space-y-6">
          <BalanceDisplay balance={balance} />
          <TradingChart 
            instrument={currentInstrument}
            onInstrumentChange={handleInstrumentChange}
          />
        </div>

        {/* Right sidebar area - Right column */}
        <div className="lg:col-span-1 space-y-6">
          <TradeControls
            tradingMode={tradingMode}
            onTradingModeChange={setTradingMode}
            tradeDuration={tradeDuration}
            onTradeDurationChange={setTradeDuration}
            paperTradingMode={paperTradingMode}
            onPaperTradingModeChange={setPaperTradingMode}
            onExecuteTrade={handleExecuteTrade}
            onGetAiRecommendation={handleGetAiRecommendation}
            isAiLoading={isAiLoading}
          />
          <AiRecommendationCard recommendation={aiRecommendation} isLoading={isAiLoading} />
        </div>
      </div>
    </div>
  );
}
