'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import type { TradingMode, TradeDuration, PaperTradingMode, TradingInstrument, ForexCryptoCommodityInstrumentType } from '@/types';
import { TrendingUp, TrendingDown, Bot, DollarSign, Play, Square, Briefcase, UserCheck } from 'lucide-react'; 
import { Badge } from '@/components/ui/badge';

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
  autoTradeTotalStake: number;
  onAutoTradeTotalStakeChange: (amount: number) => void;
  onStartAiAutoTrade: () => void;
  onStopAiAutoTrade: () => void;
  isAutoTradingActive: boolean;
  disableManualControls?: boolean;
  currentBalance: number; 
  supportedInstrumentsForManualAi: ForexCryptoCommodityInstrumentType[];
  currentSelectedInstrument: TradingInstrument;
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
  currentBalance,
  supportedInstrumentsForManualAi,
  currentSelectedInstrument,
}: TradeControlsProps) {
  const tradingModes: TradingMode[] = ['conservative', 'balanced', 'aggressive'];
  const tradeDurations: TradeDuration[] = ['30s', '1m', '5m', '15m', '30m'];

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

  const handleAccountTypeChange = (isRealAccount: boolean) => {
    onPaperTradingModeChange(isRealAccount ? 'live' : 'paper');
  };

  const isManualTradeDisabled = stakeAmount <= 0 || disableManualControls || isAiLoading || stakeAmount > currentBalance;
  const isManualAiRecommendationDisabled = isAiLoading || disableManualControls || !supportedInstrumentsForManualAi.includes(currentSelectedInstrument as ForexCryptoCommodityInstrumentType);

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle>Trade Terminal</CardTitle>
        <CardDescription>Configure and execute your trades. This terminal is for Forex/Crypto/Commodity instruments.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Switch
              id="account-type-switch"
              checked={paperTradingMode === 'live'} 
              onCheckedChange={handleAccountTypeChange}
              disabled={isAutoTradingActive || isAiLoading} 
              aria-label="Account Type Switch"
            />
            <Label htmlFor="account-type-switch" className="text-sm font-medium flex items-center">
              {paperTradingMode === 'live' ? (
                <><Briefcase className="mr-2 h-4 w-4 text-green-500" /> Real Account (Simulated)</>
              ) : (
                <><UserCheck className="mr-2 h-4 w-4 text-blue-500" /> Demo Account</>
              )}
            </Label>
          </div>
           <Badge variant={paperTradingMode === 'live' ? "destructive" : "default"} className={paperTradingMode === 'live' ? "bg-green-100 text-green-700" : "bg-blue-100 text-blue-700"}>
            {paperTradingMode === 'live' ? 'REAL' : 'DEMO'}
          </Badge>
        </div>


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
              {stakeAmount > currentBalance && !disableManualControls && (
                <p className="text-xs text-destructive mt-1">Stake exceeds available balance.</p>
              )}
            </div>
             <Button
              onClick={onGetAiRecommendation}
              className="w-full bg-gradient-to-r from-primary to-purple-600 text-primary-foreground hover:opacity-90 transition-opacity"
              disabled={isManualAiRecommendationDisabled}
              title={!supportedInstrumentsForManualAi.includes(currentSelectedInstrument as ForexCryptoCommodityInstrumentType) ? `AI for ${currentSelectedInstrument} on Volatility page.` : "Get AI Recommendation"}
            >
              <Bot className="mr-2 h-5 w-5" />
              {isAiLoading && !isAutoTradingActive ? 'Analyzing...' : 'Get Manual AI Recommendation'}
            </Button>

            <div className="grid grid-cols-2 gap-4">
              <Button
                size="lg"
                className="bg-green-500 hover:bg-green-600 text-white font-bold text-lg transition-transform hover:scale-105 active:scale-95 h-16"
                onClick={() => onExecuteTrade('CALL')}
                disabled={isManualTradeDisabled}
              >
                <TrendingUp className="mr-2 h-6 w-6" />
                CALL
              </Button>
              <Button
                size="lg"
                className="bg-red-500 hover:bg-red-600 text-white font-bold text-lg transition-transform hover:scale-105 active:scale-95 h-16"
                onClick={() => onExecuteTrade('PUT')}
                disabled={isManualTradeDisabled}
              >
                <TrendingDown className="mr-2 h-6 w-6" />
                PUT
              </Button>
            </div>
          </>
        )}
       

        <Separator />

        <div>
          <Label htmlFor="auto-stake-amount" className="text-sm font-medium text-muted-foreground">AI Auto-Trade Total Stake ($)</Label>
           <p className="text-xs text-muted-foreground mb-1">
            AI will apportion this stake across Forex/Crypto/Commodity trades for the selected account type ({paperTradingMode === 'live' ? 'Real - Simulated' : 'Demo'}).
          </p>
          <div className="relative mt-1">
            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="auto-stake-amount"
              type="number"
              value={autoTradeTotalStake}
              onChange={handleAutoStakeChange}
              placeholder="Total for session"
              className="w-full pl-8"
              min="10" 
              disabled={isAutoTradingActive || isAiLoading}
            />
          </div>
          {autoTradeTotalStake > currentBalance && !isAutoTradingActive && !isAiLoading && (
             <p className="text-xs text-destructive mt-1">Auto-trade stake exceeds available balance.</p>
          )}
        </div>
        
        {isAutoTradingActive ? (
          <Button
            onClick={onStopAiAutoTrade}
            className="w-full bg-red-600 hover:bg-red-700 text-primary-foreground"
            disabled={isAiLoading && !isAutoTradingActive} 
          >
            <Square className="mr-2 h-5 w-5" />
            Stop AI Auto-Trading
          </Button>
        ) : (
          <Button
            onClick={onStartAiAutoTrade}
            className="w-full bg-blue-600 hover:bg-blue-700 text-primary-foreground"
            disabled={isAiLoading || autoTradeTotalStake <=0 || autoTradeTotalStake > currentBalance}
          >
            <Play className="mr-2 h-5 w-5" />
            {isAiLoading && isAutoTradingActive ? 'Initializing AI Trades...' : 'Start AI Auto-Trading (Forex/Crypto/Commodities)'}
          </Button>
        )}
        
        <p className="text-xs text-muted-foreground text-center">
          Trading involves significant risk. AI strategies are experimental.
          Real account trading is simulated. For Volatility Index auto-trading, please use the Volatility Trading page.
        </p>
      </CardContent>
    </Card>
  );
}
