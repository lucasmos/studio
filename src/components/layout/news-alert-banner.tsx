'use client';

import { useEffect, useState } from 'react';
import { getNewsSummaryForBanner } from '@/app/actions/news-actions';
import { AlertTriangle, Newspaper, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

const NEWS_CACHE_KEY = 'derivAiNewsSummaryCache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface NewsCache {
  summary: string | null;
  timestamp: number;
  error?: string | null;
}

export function NewsAlertBanner() {
  const [currentSummary, setCurrentSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  const fetchAndSetNews = async (forceFetch: boolean = false) => {
    setIsLoading(true);
    setCurrentError(null);

    if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
    }

    const cachedDataString = localStorage.getItem(NEWS_CACHE_KEY);
    let cachedNews: NewsCache | null = null;

    if (cachedDataString) {
      try {
        cachedNews = JSON.parse(cachedDataString);
      } catch (e) {
        console.error("Failed to parse news cache:", e);
        localStorage.removeItem(NEWS_CACHE_KEY); // Clear corrupted cache
      }
    }

    if (!forceFetch && cachedNews && (Date.now() - cachedNews.timestamp < CACHE_DURATION)) {
      setCurrentSummary(cachedNews.summary);
      setCurrentError(cachedNews.error || null);
      setIsLoading(false);
      return;
    }

    try {
      const result = await getNewsSummaryForBanner();
      const newCache: NewsCache = {
        summary: result.summary,
        timestamp: Date.now(),
        error: result.error || null,
      };
      localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(newCache));
      setCurrentSummary(result.summary);
      setCurrentError(result.error || null);
    } catch (err) {
      console.error("Error in fetchAndSetNews (NewsAlertBanner):", err);
      const errorMessage = "An unexpected error occurred while fetching news.";
      setCurrentError(errorMessage);
      setCurrentSummary(null);
      const errorCache: NewsCache = {
        summary: null,
        timestamp: Date.now(),
        error: errorMessage,
      };
      localStorage.setItem(NEWS_CACHE_KEY, JSON.stringify(errorCache));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAndSetNews(); // Initial fetch

    const intervalId = setInterval(() => {
      fetchAndSetNews(true); // Force fetch periodically
    }, CACHE_DURATION); // Check to refresh roughly every 24 hours

    return () => clearInterval(intervalId);
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="bg-secondary text-secondary-foreground p-3 shadow-md relative">
      <div className="container mx-auto flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Newspaper className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium">Market Intel:</span>
        </div>
        {isLoading && (
          <Skeleton className="h-5 w-3/4 md:w-1/2 bg-muted" />
        )}
        {currentError && !isLoading && (
          <div className="flex items-center gap-1 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span className="truncate max-w-[calc(100vw-150px)]">{currentError}</span>
          </div>
        )}
        {currentSummary && !isLoading && !currentError && (
          <p className="text-sm flex-grow text-center md:text-left truncate max-w-[calc(100vw-150px)]">{currentSummary}</p>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground flex-shrink-0"
          onClick={() => setIsVisible(false)}
          aria-label="Dismiss news alert"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
