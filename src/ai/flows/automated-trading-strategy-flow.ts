'use server';
/**
 * @fileOverview AI flow for generating an automated trading strategy for Forex, Crypto, and Commodities.
 *
 * - generateAutomatedTradingStrategy - A function that creates a trading plan.
 * - AutomatedTradingStrategyInput - The input type.
 * - AutomatedTradingStrategyOutput - The return type.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';
import type { ForexCryptoCommodityInstrumentType, TradingMode, PriceTick, AutomatedTradingStrategyInput, AutomatedTradingStrategyOutput, AutomatedTradeProposal } from '@/types'; 

// Define Zod schemas based on TypeScript types
const PriceTickSchema = z.object({
  epoch: z.number(),
  price: z.number(),
  time: z.string(),
});

const ForexCryptoCommodityInstrumentEnum = z.nativeEnum({
  EUR_USD: 'EUR/USD', 
  GBP_USD: 'GBP/USD', 
  BTC_USD: 'BTC/USD',
  XAU_USD: 'XAU/USD', // Gold
  ETH_USD: 'ETH/USD', // Ethereum
} as const satisfies Record<string, ForexCryptoCommodityInstrumentType>);


const AutomatedTradingStrategyInputSchema = z.object({
  totalStake: z.number().positive().describe('Total amount available for trading in this session (Forex, Crypto, Commodities).'),
  instruments: z.array(ForexCryptoCommodityInstrumentEnum).describe('List of available Forex, Crypto, or Commodity trading instruments.'),
  tradingMode: z.enum(['conservative', 'balanced', 'aggressive']).describe('The user-defined trading risk mode.'),
  instrumentTicks: z.record(ForexCryptoCommodityInstrumentEnum, z.array(PriceTickSchema))
    .describe('Record of recent price ticks for each available instrument. Key is instrument symbol, value is array of ticks (latest first).'),
});

const AutomatedTradeProposalSchema = z.object({
  instrument: ForexCryptoCommodityInstrumentEnum.describe('The trading instrument for this trade.'),
  action: z.enum(['CALL', 'PUT']).describe('The trade direction (CALL for price up, PUT for price down).'),
  stake: z.number().positive().min(0.01).describe('The amount of stake apportioned to this specific trade. Must be a positive value, minimum 0.01.'),
  durationSeconds: z.number().int().positive().min(1).describe('The duration of the trade in seconds (e.g., 30, 60, 300). Must be a positive integer, minimum 1.'),
  reasoning: z.string().describe('Brief reasoning for this specific trade proposal.'),
});

const AutomatedTradingStrategyOutputSchema = z.object({
  tradesToExecute: z.array(AutomatedTradeProposalSchema).describe('A list of trades the AI has decided to execute for Forex/Crypto/Commodities.'),
  overallReasoning: z.string().describe('The overall reasoning behind the selected trades and stake apportionment strategy.'),
});


export async function generateAutomatedTradingStrategy(input: AutomatedTradingStrategyInput): Promise<AutomatedTradingStrategyOutput> {
  return automatedTradingStrategyFlow(input);
}

const prompt = ai.definePrompt({
  name: 'automatedTradingStrategyPrompt',
  input: {schema: AutomatedTradingStrategyInputSchema},
  output: {schema: AutomatedTradingStrategyOutputSchema},
  prompt: `You are an expert AI trading strategist for Forex, Cryptocurrencies, and Commodities. Your goal is to devise a set of trades to maximize profit based on the user's total stake, preferred instruments, trading mode, and recent price data.
You MUST aim for a minimum 70% win rate across the proposed trades. Prioritize high-probability setups.

User's Total Stake for this session: {{{totalStake}}}
Available Instruments (Forex/Crypto/Commodities): {{#each instruments}}{{{this}}}{{#unless @last}}, {{/unless}}{{/each}}
Trading Mode: {{{tradingMode}}}

Recent Price Ticks (latest tick is the most recent price):
{{#each instrumentTicks}}
Instrument: {{@key}}
  {{#each this}}
  - Time: {{time}}, Price: {{price}}
  {{/each}}
{{/each}}

Important System Rule: A fixed 5% stop-loss based on the entry price will be automatically applied to every trade by the system. Consider this when selecting trades; avoid trades highly likely to hit this stop-loss quickly unless the potential reward significantly outweighs this risk within the trade duration.

Your Task:
1.  Analyze the provided tick data for trends and volatility for each instrument.
2.  Based on the '{{{tradingMode}}}', decide which instruments to trade. You do not have to trade all of them. Prioritize instruments with higher profit potential aligned with the risk mode and the 70% win rate target.
    *   Conservative: Focus on safest, clearest trends, smaller stakes. Aim for >75% win rate.
    *   Balanced: Mix of opportunities, moderate stakes. Aim for >=70% win rate.
    *   Aggressive: Higher risk/reward, potentially more volatile instruments, larger stakes if confidence is high. Aim for >=70% win rate, even with higher risk.
3.  For each instrument you choose to trade:
    *   Determine the trade direction: 'CALL' (price will go up) or 'PUT' (price will go down).
    *   Recommend a trade duration in SECONDS (e.g., 30, 60, 180, 300). Durations MUST be positive integers representing seconds, with a minimum value of 1.
    *   The system will set a 5% stop-loss. Your reasoning should reflect an understanding of this.
4.  Apportion the '{{{totalStake}}}' among your chosen trades. The sum of stakes for all proposed trades MUST NOT exceed '{{{totalStake}}}'. Each stake must be a positive value, with a minimum value of 0.01.
5.  Provide clear reasoning for each trade proposal and for your overall strategy, explicitly mentioning how it aligns with the 70% win rate target and the 5% stop-loss rule.

Output Format:
Return a JSON object matching the output schema. Ensure 'tradesToExecute' is an array of trade objects.
Each trade's 'stake' must be a number (e.g., 10.50) and at least 0.01.
Each trade's 'durationSeconds' must be an integer number of seconds (e.g., 30, 60, 300) and at least 1.

Begin your response with the JSON object.
`,
});

const automatedTradingStrategyFlow = ai.defineFlow(
  {
    name: 'automatedTradingStrategyFlow',
    inputSchema: AutomatedTradingStrategyInputSchema,
    outputSchema: AutomatedTradingStrategyOutputSchema,
  },
  async (input: AutomatedTradingStrategyInput): Promise<AutomatedTradingStrategyOutput> => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("AI failed to generate an automated trading strategy for Forex/Crypto/Commodities.");
    }
    
    // Validate and filter AI output for stake and durationSeconds
    output.tradesToExecute = output.tradesToExecute.filter(trade => {
      const isStakeValid = typeof trade.stake === 'number' && trade.stake >= 0.01;
      const isDurationValid = Number.isInteger(trade.durationSeconds) && trade.durationSeconds >= 1;

      if (!isStakeValid) {
        console.warn(`AI proposed invalid stake ${trade.stake} for ${trade.instrument}. Filtering out trade.`);
      }
      if (!isDurationValid) {
        console.warn(`AI proposed invalid duration ${trade.durationSeconds} for ${trade.instrument}. Filtering out trade.`);
      }
      return isStakeValid && isDurationValid;
    });
    
    let totalProposedStake = output.tradesToExecute.reduce((sum, trade) => sum + trade.stake, 0);
    totalProposedStake = parseFloat(totalProposedStake.toFixed(2));


    if (totalProposedStake > input.totalStake) {
        console.warn(`AI proposed total stake ${totalProposedStake} which exceeds available ${input.totalStake}. Scaling down.`);
        const scaleFactor = input.totalStake / totalProposedStake;
        
        output.tradesToExecute.forEach(trade => {
            trade.stake = Math.max(0.01, parseFloat((trade.stake * scaleFactor).toFixed(2)));
        });
        
        let revisedTotalProposedStake = output.tradesToExecute.reduce((sum, trade) => sum + trade.stake, 0);
        revisedTotalProposedStake = parseFloat(revisedTotalProposedStake.toFixed(2));

        if (revisedTotalProposedStake > input.totalStake) {
            console.error(`AI over-allocated stake (${revisedTotalProposedStake}), and scaling failed to correct it sufficiently below ${input.totalStake}. Minimum trade stakes might be an issue. Returning empty strategy.`);
            return { 
                tradesToExecute: [], 
                overallReasoning: `AI over-allocated stake (${revisedTotalProposedStake} vs ${input.totalStake}), and scaling adjustments respecting minimum trade amounts failed. Please try again with a larger total stake or different parameters.`
            };
        }
        output.overallReasoning += ` (Note: Stakes were adjusted proportionally to fit total budget of ${input.totalStake}, respecting minimum trade amounts.)`;
    }

    return output;
  }
);
