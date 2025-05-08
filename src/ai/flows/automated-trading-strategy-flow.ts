'use server';
/**
 * @fileOverview AI flow for generating an automated trading strategy.
 *
 * - generateAutomatedTradingStrategy - A function that creates a trading plan.
 * - AutomatedTradingStrategyInput - The input type.
 * - AutomatedTradingStrategyOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { TradingInstrument, PriceTick, TradingMode, AutomatedTradeProposal, AutomatedTradingStrategyOutput as AIOutputType, AutomatedTradingStrategyInput as AIInputType } from '@/types';
import { getTicks } from '@/services/deriv'; // To fetch current prices if needed for context

// Define Zod schemas based on TypeScript types
const PriceTickSchema = z.object({
  epoch: z.number(),
  price: z.number(),
  time: z.string(),
});

const AutomatedTradingStrategyInputSchema = z.object({
  totalStake: z.number().positive().describe('Total amount available for trading in this session.'),
  instruments: z.array(z.nativeEnum({EUR_USD: 'EUR/USD', GBP_USD: 'GBP/USD', BTC_USD: 'BTC/USD'} as const)).describe('List of available trading instruments.'),
  tradingMode: z.enum(['conservative', 'balanced', 'aggressive']).describe('The user-defined trading risk mode.'),
  instrumentTicks: z.record(z.nativeEnum({EUR_USD: 'EUR/USD', GBP_USD: 'GBP/USD', BTC_USD: 'BTC/USD'} as const), z.array(PriceTickSchema))
    .describe('Record of recent price ticks for each available instrument. Key is instrument symbol, value is array of ticks (latest first).'),
});

const AutomatedTradeProposalSchema = z.object({
  instrument: z.nativeEnum({EUR_USD: 'EUR/USD', GBP_USD: 'GBP/USD', BTC_USD: 'BTC/USD'} as const).describe('The trading instrument for this trade.'),
  action: z.enum(['CALL', 'PUT']).describe('The trade direction (CALL for price up, PUT for price down).'),
  stake: z.number().positive().describe('The amount of stake apportioned to this specific trade.'),
  durationSeconds: z.number().int().positive().describe('The duration of the trade in seconds (e.g., 30, 60, 300).'),
  suggestedStopLossPips: z.number().positive().describe('Suggested stop-loss distance in pips/points from the entry price. For Forex (e.g., EUR/USD), 1 pip = 0.0001. For BTC/USD, 1 point could be 1.00. Adjust based on instrument volatility. E.g., 10 pips for EUR/USD, 50 points for BTC/USD.'),
  reasoning: z.string().describe('Brief reasoning for this specific trade proposal.'),
});

const AutomatedTradingStrategyOutputSchema = z.object({
  tradesToExecute: z.array(AutomatedTradeProposalSchema).describe('A list of trades the AI has decided to execute.'),
  overallReasoning: z.string().describe('The overall reasoning behind the selected trades and stake apportionment strategy.'),
});

export type AutomatedTradingStrategyInput = z.infer<typeof AutomatedTradingStrategyInputSchema>;
export type AutomatedTradingStrategyOutput = z.infer<typeof AutomatedTradingStrategyOutputSchema>;


export async function generateAutomatedTradingStrategy(input: AutomatedTradingStrategyInput): Promise<AutomatedTradingStrategyOutput> {
  // Augment input with current prices if needed, or rely on provided ticks
  // For simplicity, we assume `instrumentTicks` in input is sufficient for AI analysis
  return automatedTradingStrategyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'automatedTradingStrategyPrompt',
  input: {schema: AutomatedTradingStrategyInputSchema},
  output: {schema: AutomatedTradingStrategyOutputSchema},
  prompt: `You are an expert AI trading strategist. Your goal is to devise a set of trades to maximize profit based on the user's total stake, preferred instruments, trading mode, and recent price data.

User's Total Stake for this session: {{{totalStake}}}
Available Instruments: {{#each instruments}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
Trading Mode: {{{tradingMode}}}

Recent Price Ticks (latest tick is the most recent price):
{{#each instrumentTicks}}
Instrument: {{@key}}
  {{#each this}}
  - Time: {{time}}, Price: {{price}}
  {{/each}}
{{/each}}

Your Task:
1.  Analyze the provided tick data for trends and volatility for each instrument.
2.  Based on the '{{{tradingMode}}}', decide which instruments to trade. You do not have to trade all ofthem. Prioritize instruments with higher profit potential aligned with the risk mode.
    *   Conservative: Focus on safer, clearer trends, smaller stakes.
    *   Balanced: Mix of opportunities, moderate stakes.
    *   Aggressive: Higher risk/reward, potentially more volatile instruments, larger stakes if confidence is high.
3.  For each instrument you choose to trade:
    *   Determine the trade direction: 'CALL' (price will go up) or 'PUT' (price will go down).
    *   Recommend a trade duration in seconds (e.g., 30, 60, 180, 300).
    *   Suggest a stop-loss in pips/points. This is the adverse price movement from entry that should trigger a close. 
        Examples: For EUR/USD, 10 pips is 0.0010. For BTC/USD, 50 points is 50.00.
        The stop-loss should protect capital but allow for normal volatility.
        - Conservative mode might use tighter stop-losses.
        - Aggressive mode might use wider stop-losses.
4.  Apportion the '{{{totalStake}}}' among your chosen trades. The sum of stakes for all proposed trades MUST NOT exceed '{{{totalStake}}}'.
5.  Provide clear reasoning for each trade proposal and for your overall strategy.

Output Format:
Return a JSON object matching the output schema. Ensure 'tradesToExecute' is an array of trade objects.
'suggestedStopLossPips' should be a positive number representing the distance from entry. For example, if EUR/USD entry is 1.0750 and action is CALL, a suggestedStopLossPips of 10 (0.0010) means stop if price hits 1.0740. If action is PUT, stop if price hits 1.0760.

Example for suggestedStopLossPips:
- If instrument is EUR/USD or GBP/USD (Forex pairs where 1 pip = 0.0001 typically): A value of 10 means 0.0010 price movement.
- If instrument is BTC/USD (where price is large, e.g., 65000.00): A value of 50 might mean $50.00 price movement. Use sensible values based on typical instrument volatility apparent from ticks.

Begin your response with the JSON object.
`,
});

const automatedTradingStrategyFlow = ai.defineFlow(
  {
    name: 'automatedTradingStrategyFlow',
    inputSchema: AutomatedTradingStrategyInputSchema,
    outputSchema: AutomatedTradingStrategyOutputSchema,
  },
  async (input: AutomatedTradingStrategyInput) => {
    // Potentially, pre-process or fetch more data here if needed.
    // For now, directly call the prompt with the input.

    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate an automated trading strategy.");
    }
    // Validate that total stake of proposed trades does not exceed input.totalStake
    const totalProposedStake = output.tradesToExecute.reduce((sum, trade) => sum + trade.stake, 0);
    if (totalProposedStake > input.totalStake) {
        // Attempt to scale down stakes proportionally if AI over-allocated.
        // This is a simple fix; ideally, the AI follows instructions.
        console.warn(`AI proposed total stake ${totalProposedStake} which exceeds available ${input.totalStake}. Scaling down.`);
        const scaleFactor = input.totalStake / totalProposedStake;
        output.tradesToExecute.forEach(trade => {
            trade.stake = Math.floor(trade.stake * scaleFactor); // Use Math.floor to ensure integer stakes if required by platform
        });
        // Recalculate to confirm, though flooring might leave some dust.
        const revisedTotalProposedStake = output.tradesToExecute.reduce((sum, trade) => sum + trade.stake, 0);
        console.log(`Revised total proposed stake: ${revisedTotalProposedStake}`);
        if (revisedTotalProposedStake > input.totalStake) {
             // Still over after scaling (unlikely with floor, but good to check)
             // Or, one trade might have a minimum stake making scaling problematic
            console.error("AI over-allocated stake, and scaling failed to correct it sufficiently. Returning empty strategy.");
            return { tradesToExecute: [], overallReasoning: "AI over-allocated stake, and scaling failed. Please try again with a clearer stake or different parameters."};
        }
    }

    return output;
  }
);

// Helper function to convert duration string (e.g., '5m', '30s') to seconds
export function durationToSeconds(duration: string): number {
  const match = duration.match(/^(\d+)([smh])$/);
  if (!match) return 300; // Default to 5m if parse fails
  const value = parseInt(match[1]);
  const unit = match[2];
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    default: return 300;
  }
}