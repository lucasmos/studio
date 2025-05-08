
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { useToast } from '@/hooks/use-toast';
import type { TradingInstrument, TradingMode, PaperTradingMode, PriceTick, MT5TradeOrder, MT5TradeDirection, MT5HoldingPeriod, MT5InstrumentAnalysis, MT5TradeStatus, ClosedMT5Trade } from '@/types';
import { getTicks } from '@/services/deriv';
import { analyzeMt5Instrument } from '@/ai/flows/analyze-mt5-instrument-flow';
import { getInstrumentDecimalPlaces } from '@/lib/utils';
import { v4 as uuidv4 } from 'uuid';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, TrendingDown, Lightbulb, Settings2, Info, AlertTriangle, CheckCircle, XCircle, MinusCircle, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const HOLDING_PERIODS: MT5HoldingPeriod[] = ['1H', '4H', '1D', '1W'];
const INSTRUMENTS: TradingInstrument[] = ['EUR/USD', 'GBP/USD', 'BTC/USD', 'XAU/USD', 'ETH/USD'];

export default function MT5TradingPage() {
  const { authStatus, paperBalance, setPaperBalance, liveBalance, setLiveBalance } = useAuth();
  const { toast } = useToast();

  const [selectedInstrument, setSelectedInstrument] = useState<TradingInstrument>('EUR/USD');
  const [investmentAmount, setInvestmentAmount] = useState<string>('100');
  const [tradingMode, setTradingMode] = useState<TradingMode>('balanced');
  const [paperTradingMode, setPaperTradingMode] = useState<PaperTradingMode>('paper');
  const [selectedHoldingPeriod, setSelectedHoldingPeriod] = useState<MT5HoldingPeriod>('4H');
  
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceLoading, setPriceLoading] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<MT5InstrumentAnalysis | null>(null);
  const [aiAnalysisLoading, setAiAnalysisLoading] = useState(false);

  const [activeTrades, setActiveTrades] = useState<MT5TradeOrder[]>([]);
  const [pendingTrades, setPendingTrades] = useState<MT5TradeOrder[]>([]); // For future use (e.g. limit orders)
  const [closedTrades, setClosedTrades] = useState<ClosedMT5Trade[]>([]);

  const currentBalance = paperTradingMode === 'paper' ? paperBalance : liveBalance;
  const setCurrentBalance = paperTradingMode === 'paper' ? setPaperBalance : setLiveBalance;

  const fetchPriceAndAnalysis = useCallback(async (instrument: TradingInstrument) => {
    setPriceLoading(true);
    setAiAnalysisLoading(true);
    setAiAnalysis(null);
    setCurrentPrice(null);

    try {
      const ticks = await getTicks(instrument);
      if (ticks.length > 0) {
        const latestPrice = ticks[ticks.length - 1].price;
        setCurrentPrice(latestPrice);

        // Fetch AI Analysis
        const analysisInput = {
          instrument: instrument,
          currentPrice: latestPrice,
          investmentAmount: parseFloat(investmentAmount) || 100,
          tradingMode: tradingMode,
          recentTicks: ticks.slice(-20), // last 20 ticks
          // marketSentimentSummary: "Optional: Could fetch news summary here"
        };
        const analysisResult = await analyzeMt5Instrument(analysisInput);
        setAiAnalysis(analysisResult);
        
      } else {
        toast({ title: "Price Error", description: `Could not fetch current price for ${instrument}.`, variant: "destructive" });
      }
    } catch (error) {
      console.error("Error fetching price or AI analysis:", error);
      toast({ title: "Error", description: `Failed to load data for ${instrument}: ${(error as Error).message}`, variant: "destructive" });
    } finally {
      setPriceLoading(false);
      setAiAnalysisLoading(false);
    }
  }, [investmentAmount, tradingMode, toast]);

  useEffect(() => {
    fetchPriceAndAnalysis(selectedInstrument);
  }, [selectedInstrument, fetchPriceAndAnalysis]);

  const holdingPeriodToSeconds = (period: MT5HoldingPeriod): number => {
    switch (period) {
      case '1H': return 60 * 60;
      case '4H': return 4 * 60 * 60;
      case '1D': return 24 * 60 * 60;
      case '1W': return 7 * 24 * 60 * 60;
      default: return 4 * 60 * 60; // Default to 4H
    }
  };

  const handlePlaceTrade = (direction: MT5TradeDirection) => {
    if (authStatus !== 'authenticated' && paperTradingMode === 'live') {
      toast({ title: "Login Required", description: "Please login to trade on a real (simulated) account.", variant: "destructive" });
      return;
    }
    if (!currentPrice || !aiAnalysis || aiAnalysis.suggestedTakeProfit === 0 || aiAnalysis.suggestedStopLoss === 0) {
      toast({ title: "Analysis Incomplete", description: "AI analysis is required with valid TP/SL to place a trade.", variant: "destructive" });
      return;
    }
    const investment = parseFloat(investmentAmount);
    if (isNaN(investment) || investment <= 0) {
      toast({ title: "Invalid Investment", description: "Please enter a valid investment amount.", variant: "destructive" });
      return;
    }
    if (investment > currentBalance) {
      toast({ title: `Insufficient ${paperTradingMode === 'paper' ? 'Demo' : 'Real'} Balance`, description: `Investment $${investment.toFixed(2)} exceeds available balance.`, variant: "destructive" });
      return;
    }

    // Validate TP/SL based on direction
    if (direction === 'BUY') {
        if (aiAnalysis.suggestedTakeProfit <= currentPrice || aiAnalysis.suggestedStopLoss >= currentPrice) {
            toast({title: "Invalid TP/SL for BUY", description: "For BUY, TP must be above current price and SL must be below.", variant: "destructive"});
            return;
        }
    } else { // SELL
        if (aiAnalysis.suggestedTakeProfit >= currentPrice || aiAnalysis.suggestedStopLoss <= currentPrice) {
            toast({title: "Invalid TP/SL for SELL", description: "For SELL, TP must be below current price and SL must be above.", variant: "destructive"});
            return;
        }
    }


    const newTrade: MT5TradeOrder = {
      id: uuidv4(),
      instrument: selectedInstrument,
      direction,
      investment,
      entryPrice: currentPrice,
      takeProfit: aiAnalysis.suggestedTakeProfit,
      stopLoss: aiAnalysis.suggestedStopLoss,
      status: 'ACTIVE',
      openTime: Date.now(),
      currentPrice: currentPrice,
      maxHoldingPeriodSeconds: holdingPeriodToSeconds(selectedHoldingPeriod),
      aiCommentaryDuringTrade: aiAnalysis.aiCommentary,
    };

    setActiveTrades(prev => [...prev, newTrade]);
    setCurrentBalance(prev => prev - investment); // Deduct investment from balance
    toast({ title: "Trade Placed (Simulated)", description: `${direction} ${selectedInstrument} @ ${currentPrice.toFixed(getInstrumentDecimalPlaces(selectedInstrument))} for $${investment.toFixed(2)}. TP: ${newTrade.takeProfit}, SL: ${newTrade.stopLoss}` });
  };

  // Simulate trade updates and closures
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTrades(prevActiveTrades => {
        const updatedTrades = prevActiveTrades.map(trade => {
          if (trade.status !== 'ACTIVE') return trade;

          let newCurrentPrice = trade.currentPrice ?? trade.entryPrice;
          const decimalPlaces = getInstrumentDecimalPlaces(trade.instrument);
          const priceChangeFactor = (Math.random() - 0.5) * (decimalPlaces <= 2 ? 0.02 : 0.00020); // Larger volatility for MT5
          newCurrentPrice += priceChangeFactor;
          newCurrentPrice = parseFloat(newCurrentPrice.toFixed(decimalPlaces));

          let newStatus: MT5TradeStatus = trade.status;
          let closeReason = "";
          let pnl = 0;

          // Check TP/SL
          if (trade.direction === 'BUY') {
            if (newCurrentPrice >= trade.takeProfit) {
              newStatus = 'CLOSED_TP'; closeReason = 'Take Profit hit';
              pnl = (trade.takeProfit - trade.entryPrice) * (trade.investment / trade.entryPrice); // Simplified PNL
            } else if (newCurrentPrice <= trade.stopLoss) {
              newStatus = 'CLOSED_SL'; closeReason = 'Stop Loss triggered';
              pnl = (trade.stopLoss - trade.entryPrice) * (trade.investment / trade.entryPrice); // Simplified PNL
            }
          } else { // SELL
            if (newCurrentPrice <= trade.takeProfit) {
              newStatus = 'CLOSED_TP'; closeReason = 'Take Profit hit';
              pnl = (trade.entryPrice - trade.takeProfit) * (trade.investment / trade.entryPrice); // Simplified PNL
            } else if (newCurrentPrice >= trade.stopLoss) {
              newStatus = 'CLOSED_SL'; closeReason = 'Stop Loss triggered';
              pnl = (trade.entryPrice - trade.stopLoss) * (trade.investment / trade.entryPrice); // Simplified PNL
            }
          }
          
          // Check Max Holding Period
          if (newStatus === 'ACTIVE' && (Date.now() > trade.openTime + trade.maxHoldingPeriodSeconds * 1000)) {
            newStatus = 'CLOSED_TIMEOUT'; closeReason = 'Max holding period reached';
            // Calculate PNL based on current price at timeout
             if (trade.direction === 'BUY') {
                pnl = (newCurrentPrice - trade.entryPrice) * (trade.investment / trade.entryPrice);
            } else { // SELL
                pnl = (trade.entryPrice - newCurrentPrice) * (trade.investment / trade.entryPrice);
            }
          }


          if (newStatus !== 'ACTIVE') {
            const closedTrade: ClosedMT5Trade = {
              ...trade,
              status: newStatus,
              closeTime: Date.now(),
              pnl: parseFloat(pnl.toFixed(2)), // ensure pnl is number and formatted
              currentPrice: newCurrentPrice, // final price
              closeReason,
            };
            setClosedTrades(prevClosed => [closedTrade, ...prevClosed]);
            setCurrentBalance(prevBal => prevBal + trade.investment + closedTrade.pnl!); // Return investment + PNL
            
            setTimeout(() => toast({
              title: `MT5 Trade Closed (${paperTradingMode})`,
              description: `${trade.instrument} ${trade.direction} closed. Reason: ${closeReason}. P/L: $${closedTrade.pnl!.toFixed(2)}`,
              variant: closedTrade.pnl! >= 0 ? 'default' : 'destructive'
            }),0);
            return null; // Remove from active trades
          }
          return { ...trade, currentPrice: newCurrentPrice };
        });
        return updatedTrades.filter(trade => trade !== null) as MT5TradeOrder[];
      });
    }, 3000); // Update every 3 seconds

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperTradingMode, setCurrentBalance]);


  const getStatusBadge = (status: MT5TradeStatus) => {
    switch (status) {
      case 'ACTIVE': return <Badge variant="secondary" className="bg-blue-500 text-white">Active</Badge>;
      case 'PENDING_EXECUTION': return <Badge variant="outline">Pending</Badge>;
      case 'CLOSED_TP': return <Badge variant="default" className="bg-green-500 text-white">Closed (TP)</Badge>;
      case 'CLOSED_SL': return <Badge variant="destructive">Closed (SL)</Badge>;
      case 'CLOSED_MANUAL': return <Badge variant="outline" className="border-yellow-500 text-yellow-700">Closed (Manual)</Badge>;
      case 'CLOSED_TIMEOUT': return <Badge variant="outline" className="border-orange-500 text-orange-700">Closed (Timeout)</Badge>;
      default: return <Badge>{status}</Badge>;
    }
  };
  
  const formatPrice = (price: number | undefined, instrument: TradingInstrument) => {
    if (price === undefined) return '-';
    return price.toFixed(getInstrumentDecimalPlaces(instrument));
  };


  return (
    <div className="container mx-auto py-2 space-y-6">
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><Settings2 className="h-7 w-7 text-primary"/> MT5 Style Trading</CardTitle>
          <CardDescription>Place longer-term trades with AI-assisted Take Profit and Stop Loss levels. Bal: ${currentBalance.toFixed(2)} ({paperTradingMode})</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Trade Setup Section */}
          <div className="space-y-4">
            <Card>
                <CardHeader><CardTitle className="text-lg">Trade Parameters</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                    <div>
                        <Label htmlFor="mt5-instrument">Instrument</Label>
                        <Select value={selectedInstrument} onValueChange={(val) => setSelectedInstrument(val as TradingInstrument)}>
                        <SelectTrigger id="mt5-instrument"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {INSTRUMENTS.map(inst => <SelectItem key={inst} value={inst}>{inst}</SelectItem>)}
                        </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="mt5-investment">Investment Amount ($)</Label>
                        <Input id="mt5-investment" type="number" value={investmentAmount} onChange={e => setInvestmentAmount(e.target.value)} placeholder="e.g., 100" />
                         {parseFloat(investmentAmount) > currentBalance && (
                            <p className="text-xs text-destructive mt-1">Investment exceeds available balance.</p>
                        )}
                    </div>
                    <div>
                        <Label htmlFor="mt5-holding-period">Max Holding Period</Label>
                        <Select value={selectedHoldingPeriod} onValueChange={(val) => setSelectedHoldingPeriod(val as MT5HoldingPeriod)}>
                        <SelectTrigger id="mt5-holding-period"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            {HOLDING_PERIODS.map(period => <SelectItem key={period} value={period}>{period}</SelectItem>)}
                        </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label htmlFor="mt5-trading-mode">AI Risk Mode</Label>
                        <Select value={tradingMode} onValueChange={(val) => setTradingMode(val as TradingMode)}>
                        <SelectTrigger id="mt5-trading-mode"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="conservative">Conservative</SelectItem>
                            <SelectItem value="balanced">Balanced</SelectItem>
                            <SelectItem value="aggressive">Aggressive</SelectItem>
                        </SelectContent>
                        </Select>
                    </div>
                     <div>
                        <Label htmlFor="mt5-account-mode">Account Type</Label>
                        <Select value={paperTradingMode} onValueChange={(val) => setPaperTradingMode(val as PaperTradingMode)}>
                        <SelectTrigger id="mt5-account-mode"><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="paper">Demo Account</SelectItem>
                            <SelectItem value="live">Real Account (Simulated)</SelectItem>
                        </SelectContent>
                        </Select>
                    </div>
                    <Button onClick={() => fetchPriceAndAnalysis(selectedInstrument)} className="w-full" disabled={priceLoading || aiAnalysisLoading}>
                        { (priceLoading || aiAnalysisLoading) ? 'Analyzing...' : 'Refresh Analysis & Price'}
                    </Button>
                </CardContent>
            </Card>
          </div>

          {/* AI Analysis & Execution Section */}
          <div className="space-y-4">
             <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Lightbulb className="h-5 w-5 text-accent" /> AI Analysis & Execution</CardTitle>
                    <CardDescription>
                        Current Price ({selectedInstrument}): {priceLoading ? <Skeleton className="h-4 w-20 inline-block" /> : (currentPrice ? formatPrice(currentPrice, selectedInstrument) : 'N/A')}
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                    {aiAnalysisLoading && (
                        <>
                            <Skeleton className="h-6 w-3/4" />
                            <Skeleton className="h-4 w-1/2" />
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-2/3" />
                        </>
                    )}
                    {aiAnalysis && !aiAnalysisLoading && (
                        <div className="space-y-2 text-sm p-3 bg-muted/50 rounded-md">
                            <div className="flex items-center gap-2">
                                <strong>Potential Direction:</strong>
                                <Badge variant={aiAnalysis.potentialDirection === 'UP' ? 'default' : aiAnalysis.potentialDirection === 'DOWN' ? 'destructive' : 'secondary'} className={aiAnalysis.potentialDirection === 'UP' ? "bg-green-500" : aiAnalysis.potentialDirection === 'DOWN' ? "bg-red-500" : ""}>{aiAnalysis.potentialDirection}</Badge>
                            </div>
                            <p><strong>Suggested TP:</strong> {formatPrice(aiAnalysis.suggestedTakeProfit, selectedInstrument)}</p>
                            <p><strong>Suggested SL:</strong> {formatPrice(aiAnalysis.suggestedStopLoss, selectedInstrument)}</p>
                            <p className="text-xs italic mt-1"><strong>Commentary:</strong> {aiAnalysis.aiCommentary}</p>
                             {(aiAnalysis.suggestedTakeProfit === 0 || aiAnalysis.suggestedStopLoss === 0) && (
                                 <p className="text-xs text-orange-600 flex items-center gap-1"><AlertTriangle className="h-3 w-3"/> AI could not determine valid TP/SL. Trading disabled.</p>
                             )}
                        </div>
                    )}
                    {!aiAnalysis && !aiAnalysisLoading && (
                        <p className="text-sm text-muted-foreground text-center py-4">Click "Refresh Analysis & Price" to get AI insights.</p>
                    )}
                    
                    <div className="grid grid-cols-2 gap-3 pt-2">
                        <Button 
                            onClick={() => handlePlaceTrade('BUY')} 
                            className="bg-green-500 hover:bg-green-600 text-white"
                            disabled={aiAnalysisLoading || priceLoading || !currentPrice || !aiAnalysis || aiAnalysis.suggestedTakeProfit === 0 || aiAnalysis.suggestedStopLoss === 0 || parseFloat(investmentAmount) > currentBalance || parseFloat(investmentAmount) <= 0 }
                        >
                            <TrendingUp className="mr-2 h-5 w-5"/> BUY
                        </Button>
                        <Button 
                            onClick={() => handlePlaceTrade('SELL')} 
                            className="bg-red-500 hover:bg-red-600 text-white"
                            disabled={aiAnalysisLoading || priceLoading || !currentPrice || !aiAnalysis || aiAnalysis.suggestedTakeProfit === 0 || aiAnalysis.suggestedStopLoss === 0 || parseFloat(investmentAmount) > currentBalance || parseFloat(investmentAmount) <= 0}
                        >
                           <TrendingDown className="mr-2 h-5 w-5"/> SELL
                        </Button>
                    </div>
                </CardContent>
             </Card>
          </div>
        </CardContent>
      </Card>

      {/* Trades Display Section */}
      <Tabs defaultValue="active" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active">Active Trades ({activeTrades.length})</TabsTrigger>
          <TabsTrigger value="pending" disabled>Pending Orders ({pendingTrades.length})</TabsTrigger>
          <TabsTrigger value="closed">Closed Trades ({closedTrades.length})</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active">
          <Card className="shadow-md">
            <CardHeader><CardTitle>Active MT5 Trades</CardTitle></CardHeader>
            <CardContent>
              {activeTrades.length === 0 ? <p className="text-muted-foreground">No active trades.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Instrument</TableHead><TableHead>Direction</TableHead><TableHead>Investment</TableHead><TableHead>Entry</TableHead><TableHead>Current</TableHead><TableHead>TP</TableHead><TableHead>SL</TableHead><TableHead>Opened</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {activeTrades.map(trade => (
                      <TableRow key={trade.id}>
                        <TableCell>{trade.instrument}</TableCell>
                        <TableCell><Badge variant={trade.direction === 'BUY' ? 'default': 'destructive'} className={trade.direction === 'BUY' ? 'bg-green-500' : 'bg-red-500'}>{trade.direction}</Badge></TableCell>
                        <TableCell>${trade.investment.toFixed(2)}</TableCell>
                        <TableCell>{formatPrice(trade.entryPrice, trade.instrument)}</TableCell>
                        <TableCell>{formatPrice(trade.currentPrice, trade.instrument)}</TableCell>
                        <TableCell>{formatPrice(trade.takeProfit, trade.instrument)}</TableCell>
                        <TableCell>{formatPrice(trade.stopLoss, trade.instrument)}</TableCell>
                        <TableCell>{new Date(trade.openTime).toLocaleTimeString()}</TableCell>
                        <TableCell>{getStatusBadge(trade.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending">
          <Card className="shadow-md">
             <CardHeader><CardTitle>Pending MT5 Orders</CardTitle><CardDescription>This feature (e.g., limit/stop orders) is not yet implemented.</CardDescription></CardHeader>
            <CardContent><p className="text-muted-foreground">No pending orders.</p></CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="closed">
           <Card className="shadow-md">
            <CardHeader><CardTitle>Closed MT5 Trades</CardTitle></CardHeader>
            <CardContent>
              {closedTrades.length === 0 ? <p className="text-muted-foreground">No closed trades yet.</p> : (
                <Table>
                  <TableHeader><TableRow><TableHead>Instrument</TableHead><TableHead>Direction</TableHead><TableHead>Investment</TableHead><TableHead>Entry</TableHead><TableHead>Close Price</TableHead><TableHead>P/L</TableHead><TableHead>Reason</TableHead><TableHead>Closed At</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                  <TableBody>
                    {closedTrades.map(trade => (
                      <TableRow key={trade.id}>
                        <TableCell>{trade.instrument}</TableCell>
                        <TableCell><Badge variant={trade.direction === 'BUY' ? 'default': 'destructive'} className={trade.direction === 'BUY' ? 'bg-green-500' : 'bg-red-500'}>{trade.direction}</Badge></TableCell>
                        <TableCell>${trade.investment.toFixed(2)}</TableCell>
                        <TableCell>{formatPrice(trade.entryPrice, trade.instrument)}</TableCell>
                        <TableCell>{formatPrice(trade.currentPrice, trade.instrument)}</TableCell> {/* currentPrice here is effectively close price */}
                        <TableCell className={trade.pnl! >= 0 ? 'text-green-600' : 'text-red-600'}>${trade.pnl!.toFixed(2)}</TableCell>
                        <TableCell>{trade.closeReason}</TableCell>
                        <TableCell>{new Date(trade.closeTime!).toLocaleTimeString()}</TableCell>
                        <TableCell>{getStatusBadge(trade.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
       <div className="mt-4 p-4 bg-muted/30 rounded-lg text-xs text-muted-foreground">
            <h4 className="font-semibold text-sm mb-1 flex items-center gap-1"><Info className="h-4 w-4"/>Important Notes:</h4>
            <ul className="list-disc list-inside space-y-1">
                <li>All MT5 trading activity on this platform is <span className="font-semibold">simulated</span>. No real funds are involved.</li>
                <li>Price movements are simulated and may not reflect actual market conditions.</li>
                <li>AI analysis is for informational purposes and not financial advice. Use at your own discretion.</li>
                <li>P/L calculations are simplified for this simulation. Real MT5 P/L depends on lot size, leverage, and contract specifications.</li>
            </ul>
        </div>
    </div>
  );
}

