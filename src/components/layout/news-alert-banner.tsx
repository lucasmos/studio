
'use client';

import { useEffect, useState } from 'react';
import { getNewsSummaryForBanner } from '@/app/actions/news-actions'; // Import the new server action
import { AlertTriangle, Newspaper, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function NewsAlertBanner() {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    async function fetchNewsData() {
      setIsLoading(true);
      setError(null);
      try {
        const result = await getNewsSummaryForBanner();
        if (result.error) {
          setError(result.error);
          setSummary(null);
        } else {
          setSummary(result.summary);
        }
      } catch (err) {
        console.error("Error in fetchNewsData (NewsAlertBanner):", err);
        setError("An unexpected error occurred while fetching news.");
        setSummary(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchNewsData();
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
        {error && !isLoading && (
          <div className="flex items-center gap-1 text-destructive text-sm">
            <AlertTriangle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
        {summary && !isLoading && !error && (
          <p className="text-sm flex-grow text-center md:text-left">{summary}</p>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={() => setIsVisible(false)}
          aria-label="Dismiss news alert"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

