
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
import type { TradingInstrument, PriceTick } from '@/types'; // TradingMode removed as it's part of the input schema

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
  instrument: TradingInstrumentEnum.describe('The trading instrument analyzed.'), // Added instrument to output
  currentPrice: z.number().describe('The current market price at the time of analysis.'), // Added current price to output
  suggestedTakeProfit: z.number().describe('Suggested Take Profit (TP) price level. Must be different from currentPrice. If AI cannot determine, return 0.'),
  suggestedStopLoss: z.number().describe('Suggested Stop Loss (SL) price level. Must be different from currentPrice and ensure SL is on the loss side relative to potential direction. If AI cannot determine, return 0.'),
  aiCommentary: z.string().describe('Brief AI commentary on the instrument and potential trade setup, including reasoning for TP/SL if provided. Explain if TP/SL is 0.'),
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
Recent Price Ticks (latest tick is the most recent price, analyze for trends/volatility):
{{#each recentTicks}}
  - Time: {{time}}, Price: {{price}}
{{/each}}
{{else}}
No recent tick data provided. Rely on general knowledge and sentiment if available.
{{/if}}
{{#if marketSentimentSummary}}
Market Sentiment Summary: {{{marketSentimentSummary}}}
{{/if}}

Key Considerations for TP/SL:
1.  **Potential Direction**: First, determine if the instrument is more likely to go UP or DOWN in the short to medium term, or if it's UNCERTAIN. Base this on tick trends (if available), sentiment, and general market knowledge for the instrument.
2.  **TP/SL Placement Rules**:
    *   TP and SL MUST be different from the Current Price.
    *   TP should be placed on the profit side based on the Potential Direction.
    *   SL should be placed on the loss side based on the Potential Direction.
    *   The distance between Current Price and SL should ideally be smaller than or equal to the distance between Current Price and TP (aim for >= 1:1 risk/reward).
    *   For 'conservative' mode: Prioritize tighter SLs and more achievable TPs. Smaller TP/SL ranges are expected.
    *   For 'balanced' mode: Seek a reasonable balance.
    *   For 'aggressive' mode: Wider TPs may be considered if a strong trend is identified, but SLs should still be prudent.
    *   Consider typical volatility of the instrument when setting TP/SL distances.
    *   If a clear, sensible TP/SL cannot be determined (e.g., extreme uncertainty, conflicting signals, flat market), you MUST set 'suggestedTakeProfit' and 'suggestedStopLoss' to 0.
3.  **AI Commentary**: Provide a brief (2-3 sentences) explanation of your reasoning for the TP/SL levels (or why they are 0) and the potential direction. Mention key factors like trend (or lack thereof), volatility (inferred from ticks or general knowledge), and how the trading mode influenced your decision.

Output Format:
Return a JSON object matching the output schema.
'suggestedTakeProfit' and 'suggestedStopLoss' are price levels. If unable to determine appropriate levels, use 0 for both.
'potentialDirection' must be 'UP', 'DOWN', or 'UNCERTAIN'.
The output MUST include 'instrument' and 'currentPrice' fields, matching the input.

Example for valid TP/SL:
{ "instrument": "EUR/USD", "currentPrice": 1.0850, "suggestedTakeProfit": 1.0900, "suggestedStopLoss": 1.0820, "aiCommentary": "EUR/USD shows slight upward momentum. Conservative TP at 1.0900, SL at 1.0820.", "potentialDirection": "UP" }

Example for undetermined TP/SL:
{ "instrument": "BTC/USD", "currentPrice": 65000, "suggestedTakeProfit": 0, "suggestedStopLoss": 0, "aiCommentary": "Market for BTC/USD is highly volatile and uncertain currently. No clear TP/SL can be recommended.", "potentialDirection": "UNCERTAIN" }

Begin your response with the JSON object.
`,
});

const analyzeMt5InstrumentFlow = ai.defineFlow(
  {
    name: 'analyzeMt5InstrumentFlow',
    inputSchema: AnalyzeMt5InstrumentInputSchema,
    outputSchema: AnalyzeMt5InstrumentOutputSchema,
  },
  async (input: AnalyzeMt5InstrumentInput): Promise<AnalyzeMt5InstrumentOutput> => {
    // Prepare a subset of recent ticks if too many are provided, to manage token limits.
    // Using last 10-20 ticks is usually sufficient for short-term trend indication.
    const ticksForPrompt = input.recentTicks ? input.recentTicks.slice(-20) : []; 

    const {output} = await prompt({
        ...input,
        recentTicks: ticksForPrompt,
    });

    if (!output) {
      throw new Error("AI failed to generate an analysis for the MT5 instrument.");
    }
    
    // Post-processing and validation of AI output
    let finalOutput = {...output};

    // Ensure instrument and currentPrice from input are in the output, as AI might omit them
    finalOutput.instrument = input.instrument;
    finalOutput.currentPrice = input.currentPrice;

    // If TP/SL are 0, direction ideally should be UNCERTAIN. Log if not, but allow AI's reasoning.
    if (finalOutput.suggestedTakeProfit === 0 && finalOutput.suggestedStopLoss === 0 && finalOutput.potentialDirection !== 'UNCERTAIN') {
        console.warn(`AI returned TP/SL as 0 but direction is ${finalOutput.potentialDirection} for ${input.instrument}. Review AI reasoning: ${finalOutput.aiCommentary}`);
    }
    
    // Ensure TP and SL are not the same as current price if they are not 0
    if (finalOutput.suggestedTakeProfit !== 0 && finalOutput.suggestedTakeProfit === input.currentPrice) {
        console.warn(`AI suggested TP same as current price for ${input.instrument}. Adjusting TP to 0 and updating commentary.`);
        finalOutput.suggestedTakeProfit = 0;
        finalOutput.aiCommentary = `AI suggested TP was invalid (same as current price), so it has been set to 0. Original commentary: ${finalOutput.aiCommentary}`;
        // If TP becomes 0, SL might also need to be 0 unless a valid one-sided trade is intended (rare for this flow)
        if (finalOutput.suggestedStopLoss !== 0) {
            finalOutput.suggestedStopLoss = 0; // Force SL to 0 if TP becomes 0 due to invalidity
            finalOutput.aiCommentary += " SL also reset to 0.";
        }
         finalOutput.potentialDirection = 'UNCERTAIN';
    }
    if (finalOutput.suggestedStopLoss !== 0 && finalOutput.suggestedStopLoss === input.currentPrice) {
        console.warn(`AI suggested SL same as current price for ${input.instrument}. Adjusting SL to 0 and updating commentary.`);
        finalOutput.suggestedStopLoss = 0;
        finalOutput.aiCommentary = `AI suggested SL was invalid (same as current price), so it has been set to 0. Original commentary: ${finalOutput.aiCommentary}`;
        if (finalOutput.suggestedTakeProfit !== 0) {
             finalOutput.suggestedTakeProfit = 0;
             finalOutput.aiCommentary += " TP also reset to 0.";
        }
        finalOutput.potentialDirection = 'UNCERTAIN';
    }
    
    // Ensure logical TP/SL based on direction if they are not 0
    if (finalOutput.potentialDirection === 'UP') {
        if (finalOutput.suggestedTakeProfit !== 0 && finalOutput.suggestedTakeProfit <= input.currentPrice) {
            finalOutput.suggestedTakeProfit = 0; finalOutput.suggestedStopLoss = 0; finalOutput.potentialDirection = 'UNCERTAIN';
            finalOutput.aiCommentary = `Invalid TP for UP direction. TP/SL reset. Original: ${output.aiCommentary}`;
        }
        if (finalOutput.suggestedStopLoss !== 0 && finalOutput.suggestedStopLoss >= input.currentPrice) {
             finalOutput.suggestedTakeProfit = 0; finalOutput.suggestedStopLoss = 0; finalOutput.potentialDirection = 'UNCERTAIN';
             finalOutput.aiCommentary = `Invalid SL for UP direction. TP/SL reset. Original: ${output.aiCommentary}`;
        }
    } else if (finalOutput.potentialDirection === 'DOWN') {
        if (finalOutput.suggestedTakeProfit !== 0 && finalOutput.suggestedTakeProfit >= input.currentPrice) {
            finalOutput.suggestedTakeProfit = 0; finalOutput.suggestedStopLoss = 0; finalOutput.potentialDirection = 'UNCERTAIN';
            finalOutput.aiCommentary = `Invalid TP for DOWN direction. TP/SL reset. Original: ${output.aiCommentary}`;
        }
        if (finalOutput.suggestedStopLoss !== 0 && finalOutput.suggestedStopLoss <= input.currentPrice) {
             finalOutput.suggestedTakeProfit = 0; finalOutput.suggestedStopLoss = 0; finalOutput.potentialDirection = 'UNCERTAIN';
             finalOutput.aiCommentary = `Invalid SL for DOWN direction. TP/SL reset. Original: ${output.aiCommentary}`;
        }
    }
    
    // If after all checks, TP or SL is 0, but not both, set both to 0 and direction to UNCERTAIN.
    if ((finalOutput.suggestedTakeProfit === 0 && finalOutput.suggestedStopLoss !== 0) || (finalOutput.suggestedTakeProfit !== 0 && finalOutput.suggestedStopLoss === 0)) {
        console.warn(`AI suggested one-sided TP/SL for ${input.instrument}. Setting both to 0 and direction to UNCERTAIN.`);
        finalOutput.suggestedTakeProfit = 0;
        finalOutput.suggestedStopLoss = 0;
        finalOutput.potentialDirection = 'UNCERTAIN';
        finalOutput.aiCommentary = `AI provided incomplete TP/SL. Resetting to indicate no clear trade. Original commentary: ${output.aiCommentary}`;
    }


    return finalOutput;
  }
);
