export type TradingInstrument =
  | 'EUR/USD'
  | 'GBP/USD'
  | 'BTC/USD'
  | 'XAU/USD' // Gold
  | 'ETH/USD'; // Ethereum
  // SOL/USD was removed as 'crySOLUSD' is an invalid symbol on Deriv

export type TradingMode = 'conservative' | 'balanced' | 'aggressive';

export type TradeDuration = '30s' | '1m' | '5m' | '15m' | '30m';

export type PaperTradingMode = 'paper' | 'live';

export interface AiRecommendation {
  tradeRecommendation: string;
  confidenceScore: number;
  optimalDuration: string;
  reasoning: string;
}

export interface PriceTick {
  epoch: number; // Epoch timestamp in seconds
  price: number;
  time: string; // Formatted time string for display, e.g., "HH:mm:ss"
}

export interface AutomatedTradeProposal {
  instrument: TradingInstrument;
  action: 'CALL' | 'PUT';
  stake: number;
  durationSeconds: number;
  // suggestedStopLossPips is removed. System will apply a fixed 5% stop-loss.
  reasoning: string;
}

export interface ActiveAutomatedTrade extends Omit<AutomatedTradeProposal, 'suggestedStopLossPips'> {
  id: string;
  entryPrice: number;
  stopLossPrice: number; // This will be calculated as 5% of entryPrice
  startTime: number; // timestamp
  status: 'active' | 'won' | 'lost_duration' | 'lost_stoploss';
  pnl?: number; // Profit or Loss
  currentPrice?: number; // For simulation display
}

export interface ProfitsClaimable {
  totalNetProfit: number;
  tradeCount: number;
  winningTrades: number;
  losingTrades: number;
}

// For AI Flow
export interface AutomatedTradingStrategyInput {
  totalStake: number;
  instruments: TradingInstrument[];
  tradingMode: TradingMode;
  // Record where key is instrument symbol, value is array of recent ticks
  instrumentTicks: Record<TradingInstrument, PriceTick[]>; 
}

export interface AutomatedTradingStrategyOutput {
  tradesToExecute: AutomatedTradeProposal[];
  overallReasoning: string;
}

