export type TradingInstrument = 'EUR/USD' | 'GBP/USD' | 'BTC/USD';

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
  time: string; // Should be a parsable date string or timestamp
  price: number;
}
