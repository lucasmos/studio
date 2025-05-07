/**
 * Represents a news article.
 */
export interface NewsArticle {
  /**
   * The title of the news article.
   */
  title: string;
  /**
   * The description of the news article.
   */
  description: string | null; // Description can be null
  /**
   * The URL of the news article.
   */
  url: string;
  /**
   * The published date of the news article.
   */
  publishedAt: string;
  /**
   * The source of the news article
   */
  source: {
    id: string | null;
    name: string;
  };
  /**
   * The URL to the image of the news article
   */
  urlToImage: string | null; // Image URL can be null
  /**
   * The content of the news article
   */
  content: string | null; // Content can be null
}

interface NewsApiResponse {
  status: string;
  totalResults: number;
  articles: NewsArticle[];
}

const NEWS_API_KEY = 'ffd4683b2bcf448fbda2bc554f35943c';
const NEWS_API_BASE_URL = 'https://newsapi.org/v2/everything';

/**
 * Asynchronously retrieves news articles related to a specific query, prioritizing forex.
 *
 * @param params The parameters for the news query.
 * @param params.query The query for which to retrieve news articles (e.g., a currency pair or 'forex').
 * @param params.pageSize The number of results to return per page (default 20, max 100).
 * @param params.language The 2-letter ISO-639-1 code of the language you want to get headlines for (e.g., 'en', 'es'). Default is 'en'.
 * @returns A promise that resolves to an array of NewsArticle objects.
 */
export async function getNewsArticles(
  params: { query: string; pageSize?: number; language?: string }
): Promise<NewsArticle[]> {
  const { query, pageSize = 10, language = 'en' } = params;
  
  // Prioritize "forex" in the query if a specific symbol is given, to broaden relevant news.
  // Or simply use "forex" if a general query is intended.
  const searchQuery = query.toLowerCase().includes('forex') ? query : `forex ${query}`;
  
  const url = `${NEWS_API_BASE_URL}?q=${encodeURIComponent(searchQuery)}&apiKey=${NEWS_API_KEY}&pageSize=${pageSize}&language=${language}&sortBy=publishedAt`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      // Attempt to parse error response from NewsAPI
      const errorData = await response.json().catch(() => ({ message: "Unknown error occurred" }));
      console.error(`NewsAPI Error: ${response.status} - ${errorData.message || response.statusText}`);
      throw new Error(`Failed to fetch news articles: ${response.status} ${errorData.message || response.statusText}`);
    }
    const data: NewsApiResponse = await response.json();
    
    if (data.status !== 'ok') {
      console.error('NewsAPI response status was not "ok":', data);
      // @ts-ignore - NewsAPI might return an error message in the response body
      throw new Error(`NewsAPI returned status ${data.status}${data.message ? `: ${data.message}` : ''}`);
    }
    
    return data.articles;
  } catch (error) {
    console.error('Error fetching news articles:', error);
    // Fallback to empty array or rethrow, depending on desired error handling strategy.
    // Per requirements, fallback can be an option. For now, returning empty array.
    // If NewsAPI fails, this could be a place to trigger a fallback to local sentiment analysis.
    return []; 
  }
}
