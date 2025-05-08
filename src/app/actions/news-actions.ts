
'use server';

import { getNewsArticles } from '@/services/news';
import { summarizeNewsSentiment } from '@/ai/flows/summarize-news-sentiment-flow';

interface NewsSummaryResult {
  summary: string | null;
  error?: string;
}

export async function getNewsSummaryForBanner(): Promise<NewsSummaryResult> {
  try {
    const articles = await getNewsArticles({ query: 'forex finance trading market sentiment', pageSize: 3 });

    if (articles.length === 0) {
      return { summary: "No current news updates available for market sentiment." };
    }

    const articlesForSummary = articles.map(a => ({ 
      title: a.title, 
      description: a.description 
    }));
    const sentimentResult = await summarizeNewsSentiment({ articles: articlesForSummary });
    
    return { summary: sentimentResult.summary };
  } catch (err) {
    console.error("Failed to fetch or summarize news for banner:", err);
    let errorMessage = "Could not load market news alerts at this time.";
    if (err instanceof Error) {
        // Pass specific NewsAPI error messages if available and safe
        if (err.message.includes("NewsAPI Error") || err.message.includes("Failed to fetch news articles")) {
             errorMessage = err.message;
        }
    }
    return { summary: null, error: errorMessage };
  }
}
