
import { config } from 'dotenv';
config();

import '@/ai/flows/analyze-market-sentiment.ts';
import '@/ai/flows/explain-ai-reasoning.ts';
import '@/ai/flows/automated-trading-strategy-flow.ts';
import '@/ai/flows/summarize-news-sentiment-flow.ts';
import '@/ai/flows/analyze-mt5-instrument-flow.ts'; // Added new flow
import '@/ai/flows/volatility-trading-strategy-flow.ts'; // Added Volatility flow
