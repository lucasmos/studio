
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
import { TrendingUp, TrendingDown, Lightbulb, Settings2, Info, AlertTriangle, CheckCircle, XCircle, MinusCircle, Clock, Briefcase, UserCheck, RefreshCwIcon, BarChart2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { SingleInstrumentChartDisplay } from '@/components/dashboard/trading-chart'; // Import the chart display component
import { Separator } from '@/components/ui/separator';

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

  const [manualTakeProfit, setManualTakeProfit] = useState<string>('');
  const [manualStopLoss, setManualStopLoss] = useState<string>('');

  const [activeTrades, setActiveTrades] = useState<MT5TradeOrder[]>([]);
  const [pendingTrades, setPendingTrades] = useState<MT5TradeOrder[]>([]);
  const [closedTrades, setClosedTrades] = useState<ClosedMT5Trade[]>([]);

  const currentBalance = paperTradingMode === 'paper' ? paperBalance : liveBalance;
  const setCurrentBalance = paperTradingMode === 'paper' ? setPaperBalance : setLiveBalance;

  const fetchPriceAndAnalysis = useCallback(async (instrument: TradingInstrument, userInitiated: boolean = true) => {
    if(userInitiated) {
        setPriceLoading(true);
        setAiAnalysisLoading(true);
    }
    setAiAnalysis(null); 
    setCurrentPrice(null);

    try {
      const ticks = await getTicks(instrument);
      if (ticks.length > 0) {
        const latestPrice = ticks[ticks.length - 1].price;
        setCurrentPrice(latestPrice);

        const analysisInput = {
          instrument: instrument,
          currentPrice: latestPrice,
          investmentAmount: parseFloat(investmentAmount) || 100,
          tradingMode: tradingMode,
          recentTicks: ticks.slice(-20), 
        };
        const analysisResult = await analyzeMt5Instrument(analysisInput);
        
        if (analysisResult) {
          setAiAnalysis(analysisResult);
          setManualTakeProfit(analysisResult.suggestedTakeProfit !== 0 ? analysisResult.suggestedTakeProfit.toFixed(getInstrumentDecimalPlaces(instrument)) : '');
          setManualStopLoss(analysisResult.suggestedStopLoss !== 0 ? analysisResult.suggestedStopLoss.toFixed(getInstrumentDecimalPlaces(instrument)) : '');
        } else {
          setManualTakeProfit('');
          setManualStopLoss('');
        }
        
      } else {
        toast({ title: "Price Error", description: `Could not fetch current price for ${instrument}.`, variant: "destructive" });
        setManualTakeProfit('');
        setManualStopLoss('');
      }
    } catch (error) {
      console.error("Error fetching price or AI analysis:", error);
      toast({ title: "Error", description: `Failed to load data for ${instrument}: ${(error as Error).message}`, variant: "destructive" });
      setManualTakeProfit('');
      setManualStopLoss('');
    } finally {
       if(userInitiated){
        setPriceLoading(false);
        setAiAnalysisLoading(false);
       }
    }
  }, [investmentAmount, tradingMode, toast]);

  useEffect(() => {
    fetchPriceAndAnalysis(selectedInstrument, true);
  }, [selectedInstrument, fetchPriceAndAnalysis]);

  const holdingPeriodToSeconds = (period: MT5HoldingPeriod): number => {
    switch (period) {
      case '1H': return 60 * 60;
      case '4H': return 4 * 60 * 60;
      case '1D': return 24 * 60 * 60;
      case '1W': return 7 * 24 * 60 * 60;
      default: return 4 * 60 * 60;
    }
  };

  const handlePlaceTrade = (direction: MT5TradeDirection) => {
    if (authStatus !== 'authenticated' && paperTradingMode === 'live') {
      toast({ title: "Login Required", description: "Please login to trade on a real (simulated) account.", variant: "destructive" });
      return;
    }
    
    const tpPrice = parseFloat(manualTakeProfit);
    const slPrice = parseFloat(manualStopLoss);
    const investment = parseFloat(investmentAmount);

    if (!currentPrice) {
      toast({ title: "Price Error", description: "Current price not available. Cannot place trade.", variant: "destructive" });
      return;
    }
    if (isNaN(investment) || investment <= 0) {
      toast({ title: "Invalid Investment", description: "Please enter a valid investment amount.", variant: "destructive" });
      return;
    }
     if (isNaN(tpPrice) || tpPrice <= 0 || isNaN(slPrice) || slPrice <= 0) {
      toast({ title: "Invalid TP/SL", description: "Please enter valid Take Profit and Stop Loss prices.", variant: "destructive" });
      return;
    }
    if (investment > currentBalance) {
      toast({ title: `Insufficient ${paperTradingMode === 'paper' ? 'Demo' : 'Real'} Balance`, description: `Investment $${investment.toFixed(2)} exceeds available balance $${currentBalance.toFixed(2)}.`, variant: "destructive" });
      return;
    }

    if (direction === 'BUY') {
        if (tpPrice <= currentPrice) {
            toast({title: "Invalid TP for BUY", description: "Take Profit must be above current price for a BUY order.", variant: "destructive"});
            return;
        }
        if (slPrice >= currentPrice) {
            toast({title: "Invalid SL for BUY", description: "Stop Loss must be below current price for a BUY order.", variant: "destructive"});
            return;
        }
    } else { 
        if (tpPrice >= currentPrice) {
            toast({title: "Invalid TP for SELL", description: "Take Profit must be below current price for a SELL order.", variant: "destructive"});
            return;
        }
        if (slPrice <= currentPrice) {
            toast({title: "Invalid SL for SELL", description: "Stop Loss must be above current price for a SELL order.", variant: "destructive"});
            return;
        }
    }

    const newTrade: MT5TradeOrder = {
      id: uuidv4(),
      instrument: selectedInstrument,
      direction,
      investment,
      entryPrice: currentPrice,
      takeProfit: tpPrice,
      stopLoss: slPrice,
      status: 'ACTIVE',
      openTime: Date.now(),
      currentPrice: currentPrice,
      maxHoldingPeriodSeconds: holdingPeriodToSeconds(selectedHoldingPeriod),
      aiCommentaryDuringTrade: aiAnalysis?.aiCommentary || "No AI commentary.",
      pnl: 0,
    };

    setActiveTrades(prev => [...prev, newTrade]);
    setCurrentBalance(prev => parseFloat((prev - investment).toFixed(2))); 
    toast({ title: "MT5 Trade Placed (Simulated)", description: `${direction} ${selectedInstrument} @ ${currentPrice.toFixed(getInstrumentDecimalPlaces(selectedInstrument))} for $${investment.toFixed(2)}. TP: ${tpPrice.toFixed(getInstrumentDecimalPlaces(selectedInstrument))}, SL: ${slPrice.toFixed(getInstrumentDecimalPlaces(selectedInstrument))}` });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTrades(prevActiveTrades => {
        const updatedTrades = prevActiveTrades.map(trade => {
          if (trade.status !== 'ACTIVE') return trade;

          let newCurrentPrice = trade.currentPrice ?? trade.entryPrice;
          const decimalPlaces = getInstrumentDecimalPlaces(trade.instrument);
          const priceChangeFactor = (Math.random() - 0.5) * (decimalPlaces <= 2 ? 0.005 : 0.00005);
          newCurrentPrice += priceChangeFactor;
          newCurrentPrice = parseFloat(newCurrentPrice.toFixed(decimalPlaces));

          let newStatus: MT5TradeStatus = trade.status;
          let closeReason = "";
          
          let currentPnl: number;
          if (trade.direction === 'BUY') {
            currentPnl = (newCurrentPrice - trade.entryPrice) / trade.entryPrice * trade.investment;
          } else { 
            currentPnl = (trade.entryPrice - newCurrentPrice) / trade.entryPrice * trade.investment;
          }
          currentPnl = parseFloat(currentPnl.toFixed(2));
          
          let finalPnlForClosure = currentPnl; 

          if (trade.direction === 'BUY') {
            if (newCurrentPrice >= trade.takeProfit) {
              newStatus = 'CLOSED_TP'; closeReason = 'Take Profit hit';
              finalPnlForClosure = (trade.takeProfit - trade.entryPrice) / trade.entryPrice * trade.investment;
            } else if (newCurrentPrice <= trade.stopLoss) {
              newStatus = 'CLOSED_SL'; closeReason = 'Stop Loss triggered';
              finalPnlForClosure = (trade.stopLoss - trade.entryPrice) / trade.entryPrice * trade.investment;
            }
          } else { 
            if (newCurrentPrice <= trade.takeProfit) {
              newStatus = 'CLOSED_TP'; closeReason = 'Take Profit hit';
              finalPnlForClosure = (trade.entryPrice - trade.takeProfit) / trade.entryPrice * trade.investment;
            } else if (newCurrentPrice >= trade.stopLoss) {
              newStatus = 'CLOSED_SL'; closeReason = 'Stop Loss triggered';
              finalPnlForClosure = (trade.entryPrice - trade.stopLoss) / trade.entryPrice * trade.investment;
            }
          }
          
          if (newStatus === 'ACTIVE' && (Date.now() > trade.openTime + trade.maxHoldingPeriodSeconds * 1000)) {
            newStatus = 'CLOSED_TIMEOUT'; closeReason = 'Max holding period reached';
          }

          if (newStatus !== 'ACTIVE') {
            finalPnlForClosure = parseFloat(finalPnlForClosure.toFixed(2));
            const closedTrade: ClosedMT5Trade = {
              ...trade,
              status: newStatus,
              closeTime: Date.now(),
              pnl: finalPnlForClosure,
              currentPrice: newCurrentPrice, 
              closeReason,
            };
            setClosedTrades(prevClosed => [closedTrade, ...prevClosed].slice(0, 50)); 
            
            setCurrentBalance(prevBal => parseFloat((prevBal + trade.investment + finalPnlForClosure).toFixed(2)));
            
            setTimeout(() => toast({
              title: `MT5 Trade Closed (${paperTradingMode})`,
              description: `${trade.instrument} ${trade.direction} closed. Reason: ${closeReason}. P/L: $${finalPnlForClosure.toFixed(2)}`,
              variant: finalPnlForClosure >= 0 ? 'default' : 'destructive'
            }),0);
            return null;
          }
          return { ...trade, currentPrice: newCurrentPrice, pnl: currentPnl };
        });
        return updatedTrades.filter(trade => trade !== null) as MT5TradeOrder[];
      });
    }, 1000); 

    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paperTradingMode, setCurrentBalance, toast]); // Removed setCurrentBalance, activeTrades from dependency

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
  
  const formatPrice = (price: number | undefined | null, instrument: TradingInstrument) => {
    if (price === undefined || price === null) return '-';
    return price.toFixed(getInstrumentDecimalPlaces(instrument));
  };

  const AccountIcon = paperTradingMode === 'live' ? Briefcase : UserCheck;

  const isTradeExecutionDisabled = 
    aiAnalysisLoading || 
    priceLoading || 
    !currentPrice || 
    !manualTakeProfit || 
    !manualStopLoss ||   
    parseFloat(manualTakeProfit) <= 0 ||
    parseFloat(manualStopLoss) <= 0 ||
    parseFloat(investmentAmount) > currentBalance || 
    parseFloat(investmentAmount) <= 0;

  return (
    <div className="container mx-auto py-2 space-y-6">
       <h1 className="text-3xl font-bold text-foreground">MT5 Style Trading</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Chart */}
        <div className="lg:col-span-2">
          <Card className="shadow-lg h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><BarChart2 className="h-6 w-6 text-primary"/> Market Chart: {selectedInstrument}</CardTitle>
              <CardDescription>Live price data for {selectedInstrument}</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] md:h-[500px]">
              <SingleInstrumentChartDisplay instrument={selectedInstrument} />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Trade Controls */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Settings2 className="h-6 w-6 text-primary"/>Trade Terminal</CardTitle>
              <div className="flex items-center gap-1 text-sm mt-1">
                <AccountIcon className={`h-4 w-4 ${paperTradingMode === 'live' ? 'text-green-500' : 'text-blue-500'}`} />
                {paperTradingMode === 'paper' ? 'Demo' : 'Real (Simulated)'} Balance: 
                <span className="font-semibold">${currentBalance.toFixed(2)}</span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <Label htmlFor="mt5-account-mode">Account Type</Label>
                <Select value={paperTradingMode} onValueChange={(val) => setPaperTradingMode(val as PaperTradingMode)}>
                  <SelectTrigger id="mt5-account-mode" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paper">Demo Account</SelectItem>
                    <SelectItem value="live">Real Account (Simulated)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="mt5-instrument">Instrument</Label>
                <Select value={selectedInstrument} onValueChange={(val) => setSelectedInstrument(val as TradingInstrument)}>
                  <SelectTrigger id="mt5-instrument" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INSTRUMENTS.map(inst => <SelectItem key={inst} value={inst}>{inst}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="mt5-investment">Investment ($)</Label>
                <Input id="mt5-investment" type="number" value={investmentAmount} onChange={e => setInvestmentAmount(e.target.value)} placeholder="e.g., 100" className="mt-1" />
                {parseFloat(investmentAmount) > currentBalance && (
                  <p className="text-xs text-destructive mt-1">Exceeds balance.</p>
                )}
              </div>
              <div>
                <Label htmlFor="mt5-holding-period">Max Holding Period</Label>
                <Select value={selectedHoldingPeriod} onValueChange={(val) => setSelectedHoldingPeriod(val as MT5HoldingPeriod)}>
                  <SelectTrigger id="mt5-holding-period" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {HOLDING_PERIODS.map(period => <SelectItem key={period} value={period}>{period}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="mt5-trading-mode">AI Risk Mode (for suggestions)</Label>
                <Select value={tradingMode} onValueChange={(val) => setTradingMode(val as TradingMode)}>
                  <SelectTrigger id="mt5-trading-mode" className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="conservative">Conservative</SelectItem>
                    <SelectItem value="balanced">Balanced</SelectItem>
                    <SelectItem value="aggressive">Aggressive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={() => fetchPriceAndAnalysis(selectedInstrument, true)} className="w-full mt-2" disabled={priceLoading || aiAnalysisLoading}>
                <RefreshCwIcon className={`mr-2 h-4 w-4 ${ (priceLoading || aiAnalysisLoading) ? 'animate-spin' : ''}`}/>
                { (priceLoading || aiAnalysisLoading) ? 'Analyzing...' : 'Refresh Analysis'}
              </Button>

              <Separator className="my-3"/>

              <div className="text-sm">
                <CardDescription className="mb-1">
                    Current Price ({selectedInstrument}): 
                    {priceLoading ? <Skeleton className="h-4 w-20 inline-block ml-1" /> : (currentPrice ? <span className="font-semibold"> {formatPrice(currentPrice, selectedInstrument)}</span> : ' N/A')}
                </CardDescription>
                {aiAnalysisLoading && (
                    <div className="space-y-2 p-3 bg-muted/30 rounded-md">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    </div>
                )}
                {aiAnalysis && !aiAnalysisLoading && (
                    <div className="space-y-1 p-3 bg-muted/30 rounded-md text-xs">
                    <div className="flex items-center gap-2">
                        <strong>AI Potential Direction:</strong>
                        <Badge variant={aiAnalysis.potentialDirection === 'UP' ? 'default' : aiAnalysis.potentialDirection === 'DOWN' ? 'destructive' : 'secondary'} 
                                className={`font-semibold ${aiAnalysis.potentialDirection === 'UP' ? "bg-green-500 text-white" : aiAnalysis.potentialDirection === 'DOWN' ? "bg-red-500 text-white" : "bg-gray-400 text-white"} `}>
                        {aiAnalysis.potentialDirection}
                        </Badge>
                    </div>
                    <p><strong>AI Suggested TP:</strong> {formatPrice(aiAnalysis.suggestedTakeProfit, selectedInstrument)}</p>
                    <p><strong>AI Suggested SL:</strong> {formatPrice(aiAnalysis.suggestedStopLoss, selectedInstrument)}</p>
                    <p className="italic mt-1"><strong>AI Commentary:</strong> {aiAnalysis.aiCommentary}</p>
                    </div>
                )}
                {!aiAnalysis && !aiAnalysisLoading && (
                    <p className="text-xs text-muted-foreground text-center py-2">Click "Refresh Analysis" for AI suggestions.</p>
                )}
              </div>
              
              <Separator className="my-3"/>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="mt5-manual-tp">Take Profit Price</Label>
                  <Input 
                    id="mt5-manual-tp" 
                    type="number" 
                    value={manualTakeProfit} 
                    onChange={e => setManualTakeProfit(e.target.value)} 
                    placeholder={aiAnalysis?.suggestedTakeProfit && aiAnalysis.suggestedTakeProfit !== 0 ? `AI: ${formatPrice(aiAnalysis.suggestedTakeProfit, selectedInstrument)}` : "Enter TP"}
                    step={getInstrumentDecimalPlaces(selectedInstrument) <= 2 ? "0.01" : "0.00001"}
                    className="mt-1 h-9"
                  />
                </div>
                <div>
                  <Label htmlFor="mt5-manual-sl">Stop Loss Price</Label>
                  <Input 
                    id="mt5-manual-sl" 
                    type="number" 
                    value={manualStopLoss} 
                    onChange={e => setManualStopLoss(e.target.value)} 
                    placeholder={aiAnalysis?.suggestedStopLoss && aiAnalysis.suggestedStopLoss !== 0 ? `AI: ${formatPrice(aiAnalysis.suggestedStopLoss, selectedInstrument)}` : "Enter SL"}
                    step={getInstrumentDecimalPlaces(selectedInstrument) <= 2 ? "0.01" : "0.00001"}
                    className="mt-1 h-9"
                  />
                </div>
              </div>
              
              {(aiAnalysis && (aiAnalysis.suggestedTakeProfit === 0 || aiAnalysis.suggestedStopLoss === 0) && !manualTakeProfit && !manualStopLoss) && (
                  <p className="text-xs text-orange-600 flex items-center gap-1 mt-1"><AlertTriangle className="h-3 w-3"/> AI could not determine valid TP/SL. Manual input required.</p>
              )}
              
              <div className="flex gap-3 pt-2">
                <Button 
                  onClick={() => handlePlaceTrade('BUY')} 
                  className="bg-green-500 hover:bg-green-600 text-white flex-1 py-3 text-base"
                  disabled={isTradeExecutionDisabled}
                >
                  <TrendingUp className="mr-2 h-5 w-5"/> BUY / Long
                </Button>
                <Button 
                  onClick={() => handlePlaceTrade('SELL')} 
                  className="bg-red-500 hover:bg-red-600 text-white flex-1 py-3 text-base"
                  disabled={isTradeExecutionDisabled}
                >
                  <TrendingDown className="mr-2 h-5 w-5"/> SELL / Short
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom section: Trades List (Tabs) */}
      <div className="w-full">
        <Tabs defaultValue="active" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="active">Active Trades ({activeTrades.length})</TabsTrigger>
            <TabsTrigger value="pending" disabled>Pending Orders ({pendingTrades.length})</TabsTrigger>
            <TabsTrigger value="closed">Closed Trades ({closedTrades.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active">
            <Card className="shadow-md">
              <CardHeader><CardTitle className="text-lg">Active MT5 Trades</CardTitle></CardHeader>
              <CardContent className="text-sm">
                {activeTrades.length === 0 ? <p className="text-muted-foreground">No active trades.</p> : (
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Instrument</TableHead><TableHead>Dir.</TableHead><TableHead>Invest.</TableHead><TableHead>Entry</TableHead><TableHead>Current</TableHead><TableHead>TP</TableHead><TableHead>SL</TableHead><TableHead>P/L</TableHead><TableHead>Opened</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {activeTrades.map(trade => (
                        <TableRow key={trade.id}>
                          <TableCell>{trade.instrument}</TableCell>
                          <TableCell><Badge variant={trade.direction === 'BUY' ? 'default': 'destructive'} className={`${trade.direction === 'BUY' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'} px-1.5 py-0.5 text-xs`}>{trade.direction}</Badge></TableCell>
                          <TableCell>${trade.investment.toFixed(2)}</TableCell>
                          <TableCell>{formatPrice(trade.entryPrice, trade.instrument)}</TableCell>
                          <TableCell>{formatPrice(trade.currentPrice, trade.instrument)}</TableCell>
                          <TableCell>{formatPrice(trade.takeProfit, trade.instrument)}</TableCell>
                          <TableCell>{formatPrice(trade.stopLoss, trade.instrument)}</TableCell>
                          <TableCell className={trade.pnl != null && trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                            ${trade.pnl != null ? trade.pnl.toFixed(2) : '0.00'}
                          </TableCell>
                          <TableCell>{new Date(trade.openTime).toLocaleTimeString()}</TableCell>
                          <TableCell>{getStatusBadge(trade.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="pending">
            <Card className="shadow-md">
              <CardHeader><CardTitle className="text-lg">Pending MT5 Orders</CardTitle><CardDescription className="text-sm">This feature (e.g., limit/stop orders) is not yet implemented.</CardDescription></CardHeader>
              <CardContent><p className="text-muted-foreground text-sm">No pending orders.</p></CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="closed">
            <Card className="shadow-md">
              <CardHeader><CardTitle className="text-lg">Closed MT5 Trades</CardTitle></CardHeader>
              <CardContent className="text-sm">
                {closedTrades.length === 0 ? <p className="text-muted-foreground">No closed trades yet.</p> : (
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader><TableRow><TableHead>Instrument</TableHead><TableHead>Dir.</TableHead><TableHead>Invest.</TableHead><TableHead>Entry</TableHead><TableHead>Close Price</TableHead><TableHead>P/L</TableHead><TableHead>Reason</TableHead><TableHead>Closed</TableHead><TableHead>Status</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {closedTrades.map(trade => (
                        <TableRow key={trade.id}>
                          <TableCell>{trade.instrument}</TableCell>
                          <TableCell><Badge variant={trade.direction === 'BUY' ? 'default': 'destructive'} className={`${trade.direction === 'BUY' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'} px-1.5 py-0.5 text-xs`}>{trade.direction}</Badge></TableCell>
                          <TableCell>${trade.investment.toFixed(2)}</TableCell>
                          <TableCell>{formatPrice(trade.entryPrice, trade.instrument)}</TableCell>
                          <TableCell>{formatPrice(trade.currentPrice, trade.instrument)}</TableCell>
                          <TableCell className={trade.pnl != null && trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}>
                            ${trade.pnl != null ? trade.pnl.toFixed(2) : 'N/A'}
                          </TableCell>
                          <TableCell>{trade.closeReason}</TableCell>
                          <TableCell>{trade.closeTime ? new Date(trade.closeTime).toLocaleTimeString() : '-'}</TableCell>
                          <TableCell>{getStatusBadge(trade.status)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
       
       <div className="mt-4 p-4 bg-muted/30 rounded-lg text-xs text-muted-foreground">
            <h4 className="font-semibold text-sm mb-1 flex items-center gap-1"><Info className="h-4 w-4"/>Important Notes:</h4>
            <ul className="list-disc list-inside space-y-1">
                <li>All MT5 trading activity on this platform is <span className="font-semibold">simulated</span>. No real funds are involved.</li>
                <li>Price movements are simulated and may not reflect actual market conditions.</li>
                <li>AI analysis is for informational purposes and not financial advice. Use at your own discretion.</li>
                <li>P/L calculations are simplified for this simulation. Real MT5 P/L depends on lot size, leverage, and contract specifications.</li>
                <li>Balance fluctuation for active trades is an estimation of unrealized P/L. Actual balance updates upon trade closure.</li>
            </ul>
        </div>
    </div>
  );
}
