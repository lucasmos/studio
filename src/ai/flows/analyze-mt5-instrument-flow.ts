'use server';
/**
 * @fileOverview AI flow for analyzing an MT5 instrument to suggest Take Profit (TP), Stop Loss (SL),
 * and provide general commentary for a potential trade.
 *
 * - analyzeMt5Instrument - A function that handles the MT5 instrument analysis.
 * - AnalyzeMt5InstrumentInput - The input type.
 * - AnalyzeMt5InstrumentOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { TradingInstrument, TradingMode, PriceTick } from '@/types';

const TradingInstrumentEnum = z.nativeEnum({
  EUR_USD: 'EUR/USD',
  GBP_USD: 'GBP/USD',
  BTC_USD: 'BTC/USD',
  XAU_USD: 'XAU/USD',
  ETH_USD: 'ETH/USD',
} as const);

const PriceTickSchema = z.object({
  epoch: z.number(),
  price: z.number(),
  time: z.string(),
});

const AnalyzeMt5InstrumentInputSchema = z.object({
  instrument: TradingInstrumentEnum.describe('The trading instrument to analyze.'),
  currentPrice: z.number().describe('The current market price of the instrument.'),
  investmentAmount: z.number().positive().describe('The amount the user wishes to invest/stake.'),
  tradingMode: z.enum(['conservative', 'balanced', 'aggressive']).describe('The user-defined trading risk mode.'),
  recentTicks: z.array(PriceTickSchema).optional().describe('Array of recent price ticks for the instrument (latest first). Used for trend analysis.'),
  marketSentimentSummary: z.string().optional().describe('A brief summary of overall market sentiment from news or other sources.'),
});
export type AnalyzeMt5InstrumentInput = z.infer<typeof AnalyzeMt5InstrumentInputSchema>;

const AnalyzeMt5InstrumentOutputSchema = z.object({
  suggestedTakeProfit: z.number().describe('Suggested Take Profit (TP) price level. Must be different from currentPrice. If AI cannot determine, return 0.'),
  suggestedStopLoss: z.number().describe('Suggested Stop Loss (SL) price level. Must be different from currentPrice and ensure SL is on the loss side relative to potential direction. If AI cannot determine, return 0.'),
  aiCommentary: z.string().describe('Brief AI commentary on the instrument and potential trade setup, including reasoning for TP/SL if provided.'),
  potentialDirection: z.enum(['UP', 'DOWN', 'UNCERTAIN']).describe('The AI\'s perceived potential short-term direction for the instrument.')
});
export type AnalyzeMt5InstrumentOutput = z.infer<typeof AnalyzeMt5InstrumentOutputSchema>;

export async function analyzeMt5Instrument(input: AnalyzeMt5InstrumentInput): Promise<AnalyzeMt5InstrumentOutput> {
  return analyzeMt5InstrumentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeMt5InstrumentPrompt',
  input: {schema: AnalyzeMt5InstrumentInputSchema},
  output: {schema: AnalyzeMt5InstrumentOutputSchema},
  prompt: `You are an expert AI trading analyst specializing in MT5-style trades (longer duration, TP/SL based).
Analyze the provided instrument data and suggest a Take Profit (TP) and Stop Loss (SL) level, along with commentary and potential direction.

Instrument: {{{instrument}}}
Current Price: {{{currentPrice}}}
Investment Amount: {{{investmentAmount}}}
User Trading Mode: {{{tradingMode}}}
{{#if recentTicks.length}}
Recent Price Ticks (latest tick is the most recent price):
{{#each recentTicks}}
  - Time: {{time}}, Price: {{price}}
{{/each}}
{{else}}
No recent tick data provided.
{{/if}}
{{#if marketSentimentSummary}}
Market Sentiment Summary: {{{marketSentimentSummary}}}
{{/if}}

Key Considerations:
1.  **Potential Direction**: First, determine if the instrument is more likely to go UP or DOWN in the short to medium term, or if it's UNCERTAIN. Base this on tick trends (if available) and sentiment.
2.  **TP/SL Placement**:
    *   TP and SL MUST be different from the Current Price.
    *   TP should be placed on the profit side based on the Potential Direction.
    *   SL should be placed on the loss side based on the Potential Direction.
    *   The distance between Current Price and SL should generally be smaller than the distance between Current Price and TP to aim for a positive risk/reward ratio, especially in 'balanced' and 'aggressive' modes.
    *   For 'conservative' mode, prioritize tighter SLs and more achievable TPs.
    *   Consider the Investment Amount: A $10 investment might warrant different TP/SL pips/points than a $1000 investment on the same instrument due to psychological risk tolerance, though absolute price levels are key.
    *   If a clear TP/SL cannot be determined (e.g., extreme volatility, no clear trend), set suggestedTakeProfit and suggestedStopLoss to 0 and explain why in the commentary.
3.  **AI Commentary**: Provide a brief (2-3 sentences) explanation of your reasoning for the TP/SL levels and the potential direction. Mention key factors like trend, volatility (inferred from ticks if possible), and how the trading mode influenced your decision.

Output Format:
Return a JSON object matching the output schema.
Ensure 'suggestedTakeProfit' and 'suggestedStopLoss' are numeric price levels. If unable to determine, use 0 for both.
'potentialDirection' must be 'UP', 'DOWN', or 'UNCERTAIN'.

Begin your response with the JSON object.
`,
});

const analyzeMt5InstrumentFlow = ai.defineFlow(
  {
    name: 'analyzeMt5InstrumentFlow',
    inputSchema: AnalyzeMt5InstrumentInputSchema,
    outputSchema: AnalyzeMt5InstrumentOutputSchema,
  },
  async (input: AnalyzeMt5InstrumentInput) => {
    // Prepare a subset of recent ticks if too many are provided, to manage token limits.
    const ticksForPrompt = input.recentTicks ? input.recentTicks.slice(0, 10) : []; // Use last 10 ticks for example

    const {output} = await prompt({
        ...input,
        recentTicks: ticksForPrompt,
    });

    if (!output) {
      throw new Error("AI failed to generate an analysis for the MT5 instrument.");
    }

    // Basic validation: if TP/SL are 0, direction should ideally be UNCERTAIN or reasoning should explain lack of clear direction.
    if (output.suggestedTakeProfit === 0 && output.suggestedStopLoss === 0 && output.potentialDirection !== 'UNCERTAIN') {
        // This is a soft validation, AI might have reasons. Console log for review.
        console.warn(`AI returned TP/SL as 0 but direction is ${output.potentialDirection} for ${input.instrument}. Review AI reasoning: ${output.aiCommentary}`);
    }
    
    // Ensure TP and SL are not the same as current price if they are not 0
    if (output.suggestedTakeProfit !== 0 && output.suggestedTakeProfit === input.currentPrice) {
        console.warn(`AI suggested TP same as current price for ${input.instrument}. Adjusting to 0.`);
        output.suggestedTakeProfit = 0; // Or adjust by a small margin
        output.aiCommentary += " (TP was adjusted as it matched current price)";
    }
    if (output.suggestedStopLoss !== 0 && output.suggestedStopLoss === input.currentPrice) {
        console.warn(`AI suggested SL same as current price for ${input.instrument}. Adjusting to 0.`);
        output.suggestedStopLoss = 0; // Or adjust by a small margin
        output.aiCommentary += " (SL was adjusted as it matched current price)";
    }


    return output;
  }
);
