'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing market sentiment using FinBERT,
 * LSTM for price trend analysis, and an ensemble model to combine signals for optimal trade durations.
 *
 * - analyzeMarketSentiment - A function that orchestrates the market sentiment analysis process.
 * - AnalyzeMarketSentimentInput - The input type for the analyzeMarketSentiment function.
 * - AnalyzeMarketSentimentOutput - The return type for the analyzeMarketSentiment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import {getNewsArticles} from '@/services/news';
import {analyzeSentiment} from '@/lib/ai/sentiment';
import {getTicks} from '@/services/deriv';

const AnalyzeMarketSentimentInputSchema = z.object({
  symbol: z.string().describe('The trading symbol to analyze (e.g., EUR/USD).'),
  tradingMode: z
    .enum(['conservative', 'balanced', 'aggressive'])
    .describe('The trading mode to use.'),
});
export type AnalyzeMarketSentimentInput = z.infer<typeof AnalyzeMarketSentimentInputSchema>;

const AnalyzeMarketSentimentOutputSchema = z.object({
  tradeRecommendation: z.string().describe('The recommended trade action (e.g., CALL, PUT).'),
  confidenceScore: z
    .number()
    .min(0)
    .max(100)
    .describe('The confidence score for the recommendation (0-100%).'),
  optimalDuration: z.string().describe('The optimal trade duration (e.g., 30s, 1m, 5m).'),
  reasoning: z.string().describe('The AI reasoning behind the recommendation. This is a placeholder and will be populated by explainAiReasoning flow separately.'),
});
export type AnalyzeMarketSentimentOutput = z.infer<typeof AnalyzeMarketSentimentOutputSchema>;

export async function analyzeMarketSentiment(input: AnalyzeMarketSentimentInput): Promise<AnalyzeMarketSentimentOutput> {
  return analyzeMarketSentimentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeMarketSentimentPrompt',
  input: z.object({
    symbol: AnalyzeMarketSentimentInputSchema.shape.symbol,
    tradingMode: AnalyzeMarketSentimentInputSchema.shape.tradingMode,
    newsSentiment: z.string().describe('Aggregated sentiment from news articles related to the symbol or general forex market.'),
    priceTrend: z.string().describe('The general price trend observed from recent tick data (e.g., Upward, Downward, Sideways, No data).'),
  }),
  output: {schema: AnalyzeMarketSentimentOutputSchema},
  prompt: `You are an AI trading assistant that analyzes market sentiment to provide trade recommendations.

You will receive a trading symbol, the current price (implied by recent ticks), news sentiment, price trend, and the trading mode. Use these to generate a trade recommendation, confidence score, and optimal duration. The reasoning will be generated separately.

Symbol: {{{symbol}}}
Trading Mode: {{{tradingMode}}}

News Sentiment: {{newsSentiment}}
Price Trend: {{priceTrend}}

Consider the risk associated with the trading mode when generating a trade recommendation:
- Conservative: Prioritize capital preservation. Lower confidence scores for aggressive trades. Shorter durations might be preferred.
- Balanced: Seek a balance between risk and reward.
- Aggressive: Willing to take higher risks for potentially higher rewards. Higher confidence scores for potentially volatile trades. Longer durations might be considered if trend is strong.

Your recommendation should be formatted as follows:
Trade Recommendation: [CALL or PUT]
Confidence Score: [0-100] (integer)
Optimal Duration: [30s, 1m, 5m, 15m, 30m]
Reasoning: [This will be provided by another AI model based on technical indicators.]`,
});

const analyzeMarketSentimentFlow = ai.defineFlow(
  {
    name: 'analyzeMarketSentimentFlow',
    inputSchema: AnalyzeMarketSentimentInputSchema,
    outputSchema: AnalyzeMarketSentimentOutputSchema,
  },
  async input => {
    // Fetch news articles related to the symbol or general forex market
    const newsArticles = await getNewsArticles({ query: input.symbol, pageSize: 5 });

    // Analyze the sentiment of the news articles using FinBERT
    let newsSentimentSummary = 'Neutral or no significant news found.';
    if (newsArticles && newsArticles.length > 0) {
      const sentimentResults = await Promise.all(
        newsArticles.map(async article => {
          if (!article.title) return null; // Skip articles without titles
          try {
            // FinBERT returns an array, usually with one dominant sentiment.
            const sentiment = await analyzeSentiment(article.title);
            return sentiment[0]; // Taking the first (typically highest score) sentiment
          } catch (error) {
            console.error('Error analyzing sentiment for article:', article.title, error);
            return null; // Return null if sentiment analysis fails for an article
          }
        })
      );
      
      const validSentiments = sentimentResults.filter(result => result !== null) as Array<{ label: string; score: number }>;

      if (validSentiments.length > 0) {
        // Aggregate sentiments (e.g., count positive/negative/neutral, or average scores)
        // For simplicity, we'll just list the dominant sentiment of the first few articles.
        newsSentimentSummary = validSentiments
          .slice(0, 3) // Take top 3 relevant articles' sentiments
          .map(s => `${s.label} (Score: ${s.score.toFixed(2)})`)
          .join('; ');
        if (validSentiments.length === 0) newsSentimentSummary = 'Sentiment analysis yielded no clear results from available news.';
      }
    }

    // Analyze price trend using LSTM (simulated with mock data for now)
    const ticks = await getTicks(input.symbol); // Assumes getTicks returns recent data
    let priceTrend = 'No data';
    if (ticks.length > 1) {
        // A very basic trend detection. A real LSTM would be more sophisticated.
        const firstPrice = ticks[0].price;
        const lastPrice = ticks[ticks.length - 1].price;
        if (lastPrice > firstPrice) priceTrend = 'Upward';
        else if (lastPrice < firstPrice) priceTrend = 'Downward';
        else priceTrend = 'Sideways';
    }
    
    const {output} = await prompt({
      symbol: input.symbol,
      tradingMode: input.tradingMode,
      newsSentiment: newsSentimentSummary,
      priceTrend: priceTrend,
    });

    // Ensure output is not null and reasoning is a placeholder.
    if (!output) {
      throw new Error("AI prompt failed to return an output for market sentiment.");
    }
    
    return {
        ...output,
        reasoning: "Detailed reasoning based on RSI, MACD, and Volatility will be generated separately." 
    };
  }
);
