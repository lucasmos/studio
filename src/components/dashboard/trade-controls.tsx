'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import type { TradingMode, TradeDuration, PaperTradingMode } from '@/types';
import { TrendingUp, TrendingDown, Bot, DollarSign, Play, Square } from 'lucide-react';

interface TradeControlsProps {
  tradingMode: TradingMode;
  onTradingModeChange: (mode: TradingMode) => void;
  tradeDuration: TradeDuration;
  onTradeDurationChange: (duration: TradeDuration) => void;
  paperTradingMode: PaperTradingMode;
  onPaperTradingModeChange: (mode: PaperTradingMode) => void;
  stakeAmount: number;
  onStakeAmountChange: (amount: number) => void;
  onExecuteTrade: (action: 'CALL' | 'PUT') => void;
  onGetAiRecommendation: () => void;
  isAiLoading: boolean;
  // AI Auto-Trade props
  autoTradeTotalStake: number;
  onAutoTradeTotalStakeChange: (amount: number) => void;
  onStartAiAutoTrade: () => void;
  onStopAiAutoTrade: () => void;
  isAutoTradingActive: boolean;
  disableManualControls?: boolean;
}

export function TradeControls({
  tradingMode,
  onTradingModeChange,
  tradeDuration,
  onTradeDurationChange,
  paperTradingMode,
  onPaperTradingModeChange,
  stakeAmount,
  onStakeAmountChange,
  onExecuteTrade,
  onGetAiRecommendation,
  isAiLoading,
  autoTradeTotalStake,
  onAutoTradeTotalStakeChange,
  onStartAiAutoTrade,
  onStopAiAutoTrade,
  isAutoTradingActive,
  disableManualControls = false,
}: TradeControlsProps) {
  const tradingModes: TradingMode[] = ['conservative', 'balanced', 'aggressive'];
  const tradeDurations: TradeDuration[] = ['30s', '1m', '5m', '15m', '30m'];
  const paperTradingModes: PaperTradingMode[] = ['paper', 'live'];

  const handleStakeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && value >= 0) {
      onStakeAmountChange(value);
    } else if (event.target.value === "") {
      onStakeAmountChange(0);
    }
  };

  const handleAutoStakeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (!isNaN(value) && value >= 0) {
      onAutoTradeTotalStakeChange(value);
    } else if (event.target.value === "") {
      onAutoTradeTotalStakeChange(0);
    }
  };

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Trade Terminal</CardTitle>
        <CardDescription>Configure and execute your trades.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Manual Trading Section */}
        {!isAutoTradingActive && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
              <div>
                <Label htmlFor="trading-mode" className="text-sm font-medium text-muted-foreground">Trading Mode</Label>
                <Select value={tradingMode} onValueChange={(value) => onTradingModeChange(value as TradingMode)} disabled={disableManualControls}>
                  <SelectTrigger id="trading-mode" className="w-full mt-1">
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    {tradingModes.map(mode => (
                      <SelectItem key={mode} value={mode} className="capitalize">{mode}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="trade-duration" className="text-sm font-medium text-muted-foreground">Trade Duration</Label>
                <Select value={tradeDuration} onValueChange={(value) => onTradeDurationChange(value as TradeDuration)} disabled={disableManualControls}>
                  <SelectTrigger id="trade-duration" className="w-full mt-1">
                    <SelectValue placeholder="Select duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {tradeDurations.map(duration => (
                      <SelectItem key={duration} value={duration}>{duration}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label htmlFor="stake-amount" className="text-sm font-medium text-muted-foreground">Manual Stake Amount ($)</Label>
              <div className="relative mt-1">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="stake-amount"
                  type="number"
                  value={stakeAmount}
                  onChange={handleStakeChange}
                  placeholder="Enter amount"
                  className="w-full pl-8"
                  min="1"
                  disabled={disableManualControls}
                />
              </div>
            </div>
             <Button
              onClick={onGetAiRecommendation}
              className="w-full bg-gradient-to-r from-primary to-purple-600 text-primary-foreground hover:opacity-90 transition-opacity"
              disabled={isAiLoading || disableManualControls}
            >
              <Bot className="mr-2 h-5 w-5" />
              {isAiLoading && !isAutoTradingActive ? 'Analyzing...' : 'Get Manual AI Recommendation'}
            </Button>

            <div className="grid grid-cols-2 gap-4">
              <Button
                size="lg"
                className="bg-green-500 hover:bg-green-600 text-white font-bold text-lg transition-transform hover:scale-105 active:scale-95 h-16"
                onClick={() => onExecuteTrade('CALL')}
                disabled={stakeAmount <= 0 || disableManualControls || isAiLoading}
              >
                <TrendingUp className="mr-2 h-6 w-6" />
                CALL
              </Button>
              <Button
                size="lg"
                className="bg-red-500 hover:bg-red-600 text-white font-bold text-lg transition-transform hover:scale-105 active:scale-95 h-16"
                onClick={() => onExecuteTrade('PUT')}
                disabled={stakeAmount <= 0 || disableManualControls || isAiLoading}
              >
                <TrendingDown className="mr-2 h-6 w-6" />
                PUT
              </Button>
            </div>
          </>
        )}
       

        <Separator />

        {/* AI Automated Trading Section */}
        <div>
          <Label htmlFor="auto-stake-amount" className="text-sm font-medium text-muted-foreground">AI Auto-Trade Total Stake ($)</Label>
          <div className="relative mt-1">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="auto-stake-amount"
              type="number"
              value={autoTradeTotalStake}
              onChange={handleAutoStakeChange}
              placeholder="Total for session"
              className="w-full pl-8"
              min="10" // Example minimum for auto trading session
              disabled={isAutoTradingActive || isAiLoading}
            />
          </div>
        </div>
        
        {isAutoTradingActive ? (
          <Button
            onClick={onStopAiAutoTrade}
            className="w-full bg-red-600 hover:bg-red-700 text-primary-foreground"
            disabled={isAiLoading}
          >
            <Square className="mr-2 h-5 w-5" />
            Stop AI Auto-Trading
          </Button>
        ) : (
          <Button
            onClick={onStartAiAutoTrade}
            className="w-full bg-blue-600 hover:bg-blue-700 text-primary-foreground"
            disabled={isAiLoading || autoTradeTotalStake <=0}
          >
            <Play className="mr-2 h-5 w-5" />
            {isAiLoading ? 'Initializing AI Trades...' : 'Start AI Auto-Trading'}
          </Button>
        )}
        
        <div className="flex items-center space-x-2 mt-4">
          <Switch
            id="paper-trading-mode"
            checked={paperTradingMode === 'paper'}
            onCheckedChange={(checked) => onPaperTradingModeChange(checked ? 'paper' : 'live')}
            disabled={isAutoTradingActive || isAiLoading}
          />
          <Label htmlFor="paper-trading-mode" className="text-sm font-medium">
            {paperTradingMode === 'paper' ? 'Paper Trading Active' : 'Live Trading Active'}
          </Label>
        </div>

         <p className="text-xs text-muted-foreground text-center">
          Trading involves significant risk. Past performance is not indicative of future results. AI trading is experimental.
        </p>
      </CardContent>
    </Card>
  );
}