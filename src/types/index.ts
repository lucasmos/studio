export type TradingInstrument =
  | 'EUR/USD'
  | 'GBP/USD'
  | 'BTC/USD'
  | 'XAU/USD' // Gold
  | 'ETH/USD'; // Ethereum

export type TradingMode = 'conservative' | 'balanced' | 'aggressive';

export type TradeDuration = '30s' | '1m' | '5m' | '15m' | '30m'; // For binary options

export type PaperTradingMode = 'paper' | 'live'; // 'live' means simulated live trading

export interface AiRecommendation { // For binary options dashboard
  tradeRecommendation: string;
  confidenceScore: number;
  optimalDuration: string;
  reasoning: string;
}

export interface PriceTick {
  epoch: number; 
  price: number;
  time: string; 
}

export interface AutomatedTradeProposal { // For binary options auto-trading
  instrument: TradingInstrument;
  action: 'CALL' | 'PUT';
  stake: number;
  durationSeconds: number; 
  reasoning: string;
}

export interface ActiveAutomatedTrade extends AutomatedTradeProposal { // For binary options auto-trading
  id: string;
  entryPrice: number;
  stopLossPrice: number; 
  startTime: number; 
  status: 'active' | 'won' | 'lost_duration' | 'lost_stoploss';
  pnl?: number; 
  currentPrice?: number; 
}

export interface ProfitsClaimable {
  totalNetProfit: number;
  tradeCount: number;
  winningTrades: number;
  losingTrades: number;
}

// For AI Flow (Binary options auto-trading)
export interface AutomatedTradingStrategyInput {
  totalStake: number;
  instruments: TradingInstrument[];
  tradingMode: TradingMode;
  instrumentTicks: Record<TradingInstrument, PriceTick[]>; 
}

export interface AutomatedTradingStrategyOutput {
  tradesToExecute: AutomatedTradeProposal[];
  overallReasoning: string;
}

// Authentication types
export type AuthMethod = 'email' | 'google' | 'deriv' | 'demo' | null;

export interface UserInfo {
  id: string;
  name: string;
  email?: string; // Email might not be present for all auth methods initially (e.g. demo)
  authMethod: AuthMethod;
  // Specific Deriv account details, populated if authMethod is 'deriv'
  // or if a user links their Deriv account later (future feature)
  derivRealAccountId?: string; 
  derivDemoAccountId?: string;
  // Balances associated with Deriv accounts - these would ideally be fetched from Deriv
  derivRealBalance?: number;
  derivDemoBalance?: number;
}

export type AuthStatus = 'authenticated' | 'unauthenticated' | 'pending';

// Payment types
export type TransactionType = 'deposit' | 'withdrawal';


// MT5 Trading Specific Types
export type MT5TradeDirection = 'BUY' | 'SELL';
export type MT5TradeStatus = 'PENDING_EXECUTION' | 'ACTIVE' | 'CLOSED_TP' | 'CLOSED_SL' | 'CLOSED_MANUAL' | 'CLOSED_TIMEOUT';
export type MT5HoldingPeriod = '1H' | '4H' | '1D' | '1W'; // Example holding periods

export interface MT5TradeOrder {
  id: string;
  instrument: TradingInstrument;
  direction: MT5TradeDirection;
  investment: number; // Amount invested
  entryPrice: number;
  takeProfit: number; // Price level
  stopLoss: number;   // Price level
  status: MT5TradeStatus;
  openTime: number; // timestamp
  closeTime?: number; // timestamp
  pnl?: number; // Profit or Loss, can be updated for active trades
  currentPrice?: number; // For UI display of active trades
  maxHoldingPeriodSeconds: number; // Calculated from MT5HoldingPeriod
  aiCommentaryDuringTrade?: string; // AI's initial reasoning for TP/SL
}

export interface MT5InstrumentAnalysis {
  instrument: TradingInstrument;
  currentPrice: number;
  suggestedTakeProfit: number;
  suggestedStopLoss: number;
  aiCommentary: string;
  potentialDirection: 'UP' | 'DOWN' | 'UNCERTAIN';
}

export interface ClosedMT5Trade extends MT5TradeOrder {
  closeReason: string; // e.g., "Take Profit hit", "Stop Loss triggered", "Manually closed", "Max holding period reached"
}

export interface MT5AccountSummary {
    balance: number;
    equity: number;
    margin: number;
    freeMargin: number;
    marginLevelPercentage: number;
}