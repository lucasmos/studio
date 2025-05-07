'use server';

/**
 * @fileOverview Explains the AI's reasoning for trade recommendations in simple terms.
 *
 * - explainAiReasoning - A function that takes market data and AI analysis to generate a human-readable explanation.
 * - ExplainAiReasoningInput - The input type for the explainAiReasoning function.
 * - ExplainAiReasoningOutput - The return type for the explainAiReasoning function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const ExplainAiReasoningInputSchema = z.object({
  rsi: z.number().describe('Relative Strength Index value.'),
  macd: z.number().describe('Moving Average Convergence Divergence value.'),
  volatility: z.string().describe('Current market volatility level (e.g., low, medium, high).'),
  recommendationType: z.string().describe('The type of trade recommendation (e.g., CALL, PUT).'),
});
export type ExplainAiReasoningInput = z.infer<typeof ExplainAiReasoningInputSchema>;

const ExplainAiReasoningOutputSchema = z.object({
  explanation: z.string().describe('A human-readable explanation of the AI reasoning for the trade recommendation.'),
});
export type ExplainAiReasoningOutput = z.infer<typeof ExplainAiReasoningOutputSchema>;

export async function explainAiReasoning(input: ExplainAiReasoningInput): Promise<ExplainAiReasoningOutput> {
  return explainAiReasoningFlow(input);
}

const prompt = ai.definePrompt({
  name: 'explainAiReasoningPrompt',
  input: {schema: ExplainAiReasoningInputSchema},
  output: {schema: ExplainAiReasoningOutputSchema},
  prompt: `You are an AI trading assistant that explains its reasoning for trade recommendations in simple terms.

  Given the following market data and AI analysis, generate a concise and easy-to-understand explanation for the trade recommendation.

  RSI: {{{rsi}}}
  MACD: {{{macd}}}
  Volatility: {{{volatility}}}
  Recommendation Type: {{{recommendationType}}}

  Explanation:`,
});

const explainAiReasoningFlow = ai.defineFlow(
  {
    name: 'explainAiReasoningFlow',
    inputSchema: ExplainAiReasoningInputSchema,
    outputSchema: ExplainAiReasoningOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
