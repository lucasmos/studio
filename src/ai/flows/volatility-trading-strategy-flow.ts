
'use server';
/**
 * @fileOverview AI flow for generating an automated trading strategy for Volatility Indices.
 *
 * - generateVolatilityTradingStrategy - A function that creates a trading plan for volatility indices.
 * - VolatilityTradingStrategyInput - The input type.
 * - VolatilityTradingStrategyOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { VolatilityInstrumentType, TradingMode, PriceTick, VolatilityTradingStrategyInput, VolatilityTradingStrategyOutput, VolatilityTradeProposal } from '@/types'; 

// Define Zod schemas based on TypeScript types
const PriceTickSchema = z.object({
  epoch: z.number(),
  price: z.number(),
  time: z.string(),
});

const VolatilityInstrumentEnum = z.nativeEnum({
  VOL_10: 'Volatility 10 Index',
  VOL_25: 'Volatility 25 Index',
  VOL_50: 'Volatility 50 Index',
  VOL_75: 'Volatility 75 Index',
  VOL_100: 'Volatility 100 Index',
} as const satisfies Record<string, VolatilityInstrumentType>);


const VolatilityTradingStrategyInputSchema = z.object({
  totalStake: z.number().min(1).describe('Total amount available for trading volatility indices in this session. Must be at least 1.'),
  instruments: z.array(VolatilityInstrumentEnum).describe('List of available volatility trading instruments.'),
  tradingMode: z.enum(['conservative', 'balanced', 'aggressive']).describe('The user-defined trading risk mode.'),
  instrumentTicks: z.record(VolatilityInstrumentEnum, z.array(PriceTickSchema))
    .describe('Record of recent price ticks for each available volatility instrument. Key is instrument symbol, value is array of ticks (latest first).'),
});

const VolatilityTradeProposalSchema = z.object({
  instrument: VolatilityInstrumentEnum.describe('The volatility instrument for this trade.'),
  action: z.enum(['CALL', 'PUT']).describe('The trade direction (CALL for price up, PUT for price down).'),
  stake: z.number().min(0.01).describe('The amount of stake apportioned to this specific trade. Must be a positive value, minimum 0.01.'),
  durationSeconds: z.number().int().min(1).describe('The duration of the trade in seconds (e.g., 30, 60, 180, 300). Must be a positive integer, minimum 1.'),
  reasoning: z.string().describe('Brief reasoning for this specific trade proposal.'),
});

const VolatilityTradingStrategyOutputSchema = z.object({
  tradesToExecute: z.array(VolatilityTradeProposalSchema).describe('A list of volatility trades the AI has decided to execute.'),
  overallReasoning: z.string().describe('The overall reasoning behind the selected trades and stake apportionment strategy.'),
});


export async function generateVolatilityTradingStrategy(input: VolatilityTradingStrategyInput): Promise<VolatilityTradingStrategyOutput> {
  return volatilityTradingStrategyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'volatilityTradingStrategyPrompt',
  input: {schema: VolatilityTradingStrategyInputSchema},
  output: {schema: VolatilityTradingStrategyOutputSchema},
  prompt: `You are an expert AI trading strategist specializing in Volatility Indices. Your goal is to devise a set of trades to maximize profit based on the user's total stake, preferred instruments, trading mode, and recent price data for these indices.
You MUST aim for a minimum 70% win rate across the proposed trades. Prioritize high-probability setups.

User's Total Stake for this session: {{{totalStake}}} (Must be at least 1)
Available Volatility Instruments: {{#each instruments}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
Trading Mode: {{{tradingMode}}}

Recent Price Ticks for Volatility Indices (latest tick is the most recent price):
{{#each instrumentTicks}}
Instrument: {{@key}}
  {{#each this}}
  - Time: {{time}}, Price: {{price}}
  {{/each}}
{{/each}}

Important System Rule: A fixed 5% stop-loss based on the entry price will be automatically applied to every trade by the system. Consider this when selecting trades; avoid trades highly likely to hit this stop-loss quickly unless the potential reward significantly outweighs this risk within the trade duration. Volatility indices can be very volatile, so short durations might be preferred, or ensure the trend is strong enough to withstand potential 5% pullbacks for longer durations.

Your Task:
1.  Analyze the provided tick data for trends and volatility for each volatility instrument.
2.  Based on the '{{{tradingMode}}}', decide which instruments to trade. You do not have to trade all of them. Prioritize instruments with higher profit potential aligned with the risk mode and the 70% win rate target.
    *   Conservative: Focus on safest, clearest trends, smaller stakes. Aim for >75% win rate. Consider shorter durations due to volatility.
    *   Balanced: Mix of opportunities, moderate stakes. Aim for >=70% win rate.
    *   Aggressive: Higher risk/reward, potentially more volatile instruments, larger stakes if confidence is high. Aim for >=70% win rate, even with higher risk. Longer durations can be considered if strong momentum is evident.
3.  For each instrument you choose to trade:
    *   Determine the trade direction: 'CALL' (price will go up) or 'PUT' (price will go down).
    *   Recommend a trade duration in SECONDS (e.g., 30, 60, 180, 300). Durations MUST be positive integers representing seconds, with a minimum value of 1.
    *   The system will set a 5% stop-loss. Your reasoning should reflect an understanding of this and how it impacts trade selection for volatile instruments.
4.  Apportion the '{{{totalStake}}}' among your chosen trades. The sum of stakes for all proposed trades MUST NOT exceed '{{{totalStake}}}'. Each stake must be a positive value, with a minimum value of 0.01.
5.  Provide clear reasoning for each trade proposal and for your overall strategy, explicitly mentioning how it aligns with the 70% win rate target and the 5% stop-loss rule, particularly in the context of volatility indices.

Output Format:
Return a JSON object matching the output schema. Ensure 'tradesToExecute' is an array of trade objects.
Each trade's 'stake' must be a number (e.g., 10.50) and at least 0.01.
Each trade's 'durationSeconds' must be an integer number of seconds (e.g., 30, 60, 300) and at least 1.

Begin your response with the JSON object.
`,
});

const volatilityTradingStrategyFlow = ai.defineFlow(
  {
    name: 'volatilityTradingStrategyFlow',
    inputSchema: VolatilityTradingStrategyInputSchema,
    outputSchema: VolatilityTradingStrategyOutputSchema,
  },
  async (input: VolatilityTradingStrategyInput): Promise<VolatilityTradingStrategyOutput> => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate an automated volatility trading strategy.");
    }
    
    // Validate and filter AI output for stake and durationSeconds
    output.tradesToExecute = output.tradesToExecute.filter(trade => {
      const isStakeValid = typeof trade.stake === 'number' && trade.stake >= 0.01;
      const isDurationValid = Number.isInteger(trade.durationSeconds) && trade.durationSeconds >= 1;

      if (!isStakeValid) {
        console.warn(`AI proposed invalid stake ${trade.stake} for ${trade.instrument} (Volatility). Filtering out trade.`);
      }
      if (!isDurationValid) {
        console.warn(`AI proposed invalid duration ${trade.durationSeconds} for ${trade.instrument} (Volatility). Filtering out trade.`);
      }
      return isStakeValid && isDurationValid;
    });
    
    let totalProposedStake = output.tradesToExecute.reduce((sum, trade) => sum + trade.stake, 0);
    totalProposedStake = parseFloat(totalProposedStake.toFixed(2));


    if (totalProposedStake > input.totalStake) {
        console.warn(`AI proposed total stake ${totalProposedStake} for volatility trades which exceeds available ${input.totalStake}. Scaling down.`);
        const scaleFactor = input.totalStake / totalProposedStake;
        
        output.tradesToExecute.forEach(trade => {
            trade.stake = Math.max(0.01, parseFloat((trade.stake * scaleFactor).toFixed(2)));
        });
        
        let revisedTotalProposedStake = output.tradesToExecute.reduce((sum, trade) => sum + trade.stake, 0);
        revisedTotalProposedStake = parseFloat(revisedTotalProposedStake.toFixed(2));

        if (revisedTotalProposedStake > input.totalStake) {
            console.error(`AI (Volatility) over-allocated stake (${revisedTotalProposedStake}), and scaling failed to correct it sufficiently below ${input.totalStake}. Minimum trade stakes might be an issue. Returning empty strategy.`);
            return { 
                tradesToExecute: [], 
                overallReasoning: `AI (Volatility) over-allocated stake (${revisedTotalProposedStake} vs ${input.totalStake}), and scaling adjustments respecting minimum trade amounts failed. Please try again with a larger total stake or different parameters.`
            };
        }
        output.overallReasoning += ` (Note: Stakes for volatility trades were adjusted proportionally to fit total budget of ${input.totalStake}, respecting minimum trade amounts.)`;
    }

    return output;
  }
);

