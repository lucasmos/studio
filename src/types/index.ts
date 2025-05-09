export type VolatilityInstrumentType =
  | 'Volatility 10 Index'
  | 'Volatility 25 Index'
  | 'Volatility 50 Index'
  | 'Volatility 75 Index'
  | 'Volatility 100 Index';

export type ForexCryptoCommodityInstrumentType =
  | 'EUR/USD'
  | 'GBP/USD'
  | 'BTC/USD'
  | 'XAU/USD' // Gold
  | 'ETH/USD'; // Ethereum

export type TradingInstrument = ForexCryptoCommodityInstrumentType | VolatilityInstrumentType;

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

export interface AutomatedTradeProposal { // For binary options auto-trading (Forex/Crypto/Commodity)
  instrument: ForexCryptoCommodityInstrumentType;
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

// For AI Flow (Binary options auto-trading - Forex/Crypto/Commodity)
export interface AutomatedTradingStrategyInput {
  totalStake: number;
  instruments: ForexCryptoCommodityInstrumentType[];
  tradingMode: TradingMode;
  instrumentTicks: Record<ForexCryptoCommodityInstrumentType, PriceTick[]>; 
}

export interface AutomatedTradingStrategyOutput {
  tradesToExecute: AutomatedTradeProposal[];
  overallReasoning: string;
}

// For AI Flow (Volatility auto-trading)
export interface VolatilityTradeProposal {
  instrument: VolatilityInstrumentType;
  action: 'CALL' | 'PUT';
  stake: number;
  durationSeconds: number;
  reasoning: string;
}

export interface ActiveAutomatedVolatilityTrade extends VolatilityTradeProposal {
  id: string;
  entryPrice: number;
  stopLossPrice: number;
  startTime: number;
  status: 'active' | 'won' | 'lost_duration' | 'lost_stoploss';
  pnl?: number;
  currentPrice?: number;
}

export interface VolatilityTradingStrategyInput {
  totalStake: number;
  instruments: VolatilityInstrumentType[];
  tradingMode: TradingMode;
  instrumentTicks: Record<VolatilityInstrumentType, PriceTick[]>;
}

export interface VolatilityTradingStrategyOutput {
  tradesToExecute: VolatilityTradeProposal[];
  overallReasoning: string;
}


// Authentication types
export type AuthMethod = 'email' | 'google' | 'deriv' | 'demo' | null;

export interface UserInfo {
  id: string; // Firebase UID or Deriv ID
  name: string; // Firebase displayName or Deriv name
  email?: string | null; // Firebase email or Deriv email
  authMethod: AuthMethod;
  photoURL?: string | null; // From Firebase or a placeholder
  // Specific Deriv account details, populated if authMethod is 'deriv'
  derivRealAccountId?: string; 
  derivDemoAccountId?: string;
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
  instrument: TradingInstrument; // Can be any type of instrument available for MT5
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
  instrument: TradingInstrument; // Can be any type for MT5 analysis
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

// Trade History Record
export type TradeCategory = 'forexCrypto' | 'volatility' | 'mt5';
export type TradeRecordStatus = 'won' | 'lost_duration' | 'lost_stoploss' | 'closed_manual' | 'cancelled'; // Add more specific statuses as needed

export interface TradeRecord {
  id: string;
  timestamp: number; // Store as number (Date.now()) for easier sorting
  instrument: TradingInstrument;
  action: 'CALL' | 'PUT' | MT5TradeDirection; // Accommodate binary and MT5
  duration?: TradeDuration | string; // Duration string for binary, or descriptive for MT5 (e.g., holding period)
  stake: number; // Or investment for MT5
  entryPrice: number;
  exitPrice?: number | null; // Price at trade conclusion
  pnl: number; // Profit or Loss
  status: TradeRecordStatus;
  accountType: PaperTradingMode; // 'paper' or 'live'
  tradeCategory: TradeCategory;
  reasoning?: string; // Optional AI reasoning or manual note
}
