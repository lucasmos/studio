
'use server';
/**
 * @fileOverview A Genkit flow to summarize market sentiment from news articles.
 *
 * - summarizeNewsSentiment - A function that takes news articles and returns a sentiment summary.
 * - SummarizeNewsSentimentInput - The input type for the summarizeNewsSentiment function.
 * - SummarizeNewsSentimentOutput - The return type for the summarizeNewsSentiment function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const NewsArticleSchema = z.object({
  title: z.string(),
  description: z.string().nullable(),
});

const SummarizeNewsSentimentInputSchema = z.object({
  articles: z.array(NewsArticleSchema).describe('A list of news articles with titles and descriptions.'),
});
export type SummarizeNewsSentimentInput = z.infer<typeof SummarizeNewsSentimentInputSchema>;

const SummarizeNewsSentimentOutputSchema = z.object({
  summary: z.string().describe('A concise summary (1-2 sentences) of market sentiment and trading activity based on the provided news. If no relevant news, state that current market sentiment from news is neutral or unavailable.'),
});
export type SummarizeNewsSentimentOutput = z.infer<typeof SummarizeNewsSentimentOutputSchema>;

export async function summarizeNewsSentiment(input: SummarizeNewsSentimentInput): Promise<SummarizeNewsSentimentOutput> {
  return summarizeNewsSentimentFlow(input);
}

const prompt = ai.definePrompt({
  name: 'summarizeNewsSentimentPrompt',
  input: {schema: SummarizeNewsSentimentInputSchema},
  output: {schema: SummarizeNewsSentimentOutputSchema},
  prompt: `You are a financial news analyst. Based on the following news headlines and descriptions, provide a very brief (1-2 sentences) summary of the overall market sentiment and any notable trading activities or instrument mentions. Focus on general trends. If no relevant information is found in the articles or no articles are provided, state that "Current market sentiment from news is neutral or no specific insights available at the moment."

News Articles:
{{#if articles.length}}
  {{#each articles}}
  - Title: {{{this.title}}}
    {{#if this.description}}Description: {{{this.description}}}{{/if}}
  {{/each}}
{{else}}
No news articles provided.
{{/if}}
`,
});

const summarizeNewsSentimentFlow = ai.defineFlow(
  {
    name: 'summarizeNewsSentimentFlow',
    inputSchema: SummarizeNewsSentimentInputSchema,
    outputSchema: SummarizeNewsSentimentOutputSchema,
  },
  async (input: SummarizeNewsSentimentInput) => {
    const {output} = await prompt(input);
    if (!output) {
      return { summary: "AI could not generate a news summary at this time." };
    }
    return output;
  }
);
