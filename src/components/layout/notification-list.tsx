'use client';

import { useEffect, useState } from 'react';
import { getNewsSummaryForBanner } from '@/app/actions/news-actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Newspaper, Activity, TrendingUp, CheckCircle, Info } from 'lucide-react';
import { Separator } from '../ui/separator';

interface NotificationItem {
  id: string;
  type: 'news' | 'trade_active_placeholder' | 'trade_profit_placeholder';
  title: string;
  message: string;
  icon: React.ElementType;
  timestamp?: Date;
}

export function NotificationList() {
  const [newsSummary, setNewsSummary] = useState<string | null>(null);
  const [newsError, setNewsError] = useState<string | null>(null);
  const [isLoadingNews, setIsLoadingNews] = useState(true);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    async function fetchNews() {
      setIsLoadingNews(true);
      setNewsError(null);
      try {
        const result = await getNewsSummaryForBanner();
        if (result.error) {
          setNewsError(result.error);
          setNewsSummary(null);
        } else {
          setNewsSummary(result.summary);
        }
      } catch (err) {
        console.error("Error fetching news for notifications:", err);
        setNewsError("Failed to load news updates.");
        setNewsSummary(null);
      } finally {
        setIsLoadingNews(false);
      }
    }
    fetchNews();
  }, []);

  useEffect(() => {
    const baseNotifications: NotificationItem[] = [];
    if (isLoadingNews) {
      baseNotifications.push({
        id: 'news-loading',
        type: 'news',
        title: 'Market Intel',
        message: '', // Skeleton will be shown
        icon: Newspaper,
      });
    } else if (newsError) {
      baseNotifications.push({
        id: 'news-error',
        type: 'news',
        title: 'Market Intel Error',
        message: newsError,
        icon: AlertTriangle,
      });
    } else if (newsSummary) {
      baseNotifications.push({
        id: 'news-latest',
        type: 'news',
        title: 'Latest Market Intel',
        message: newsSummary,
        icon: Newspaper,
        timestamp: new Date(),
      });
    }

    // Placeholders for other notification types
    baseNotifications.push({
      id: 'trade-active-placeholder',
      type: 'trade_active_placeholder',
      title: 'Active Trades',
      message: 'Updates on your active trades will appear here.',
      icon: Activity,
    });
    baseNotifications.push({
      id: 'trade-profit-placeholder',
      type: 'trade_profit_placeholder',
      title: 'Trade Results',
      message: 'Notifications about your trade profits and losses will appear here.',
      icon: TrendingUp,
    });
    
    // Example of a general notification
     baseNotifications.push({
        id: 'welcome-notification',
        type: 'news', // Using 'news' type for generic info styling
        title: 'Welcome to DerivAI Lite!',
        message: 'Check out the dashboard for AI-powered trading insights.',
        icon: Info,
        timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000) // 3 hours ago
    });


    setNotifications(baseNotifications);
  }, [newsSummary, newsError, isLoadingNews]);


  return (
    <div className="flex flex-col">
      <div className="p-4 border-b">
        <h3 className="text-lg font-medium">Notifications</h3>
      </div>
      {notifications.length === 0 && !isLoadingNews && (
        <p className="p-4 text-sm text-muted-foreground">No new notifications.</p>
      )}
      <div className="max-h-96 overflow-y-auto">
        {notifications.map((item, index) => (
          <div key={item.id}>
            <div className="p-4 hover:bg-muted/50">
              <div className="flex items-start gap-3">
                <item.icon className={`mt-1 h-5 w-5 ${item.type === 'news' ? 'text-primary' : item.type === 'trade_profit_placeholder' ? 'text-green-500' : item.type === 'trade_active_placeholder' ? 'text-blue-500' : 'text-destructive'}`} />
                <div className="flex-1">
                  <p className="text-sm font-semibold">{item.title}</p>
                  {item.id === 'news-loading' && isLoadingNews ? (
                    <Skeleton className="h-4 w-full mt-1 bg-muted-foreground/20" />
                  ) : (
                    <p className="text-xs text-muted-foreground">{item.message}</p>
                  )}
                  {item.timestamp && (
                     <p className="text-xs text-muted-foreground/70 mt-0.5">
                        {item.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                     </p>
                  )}
                </div>
              </div>
            </div>
            {index < notifications.length - 1 && <Separator />}
          </div>
        ))}
      </div>
       <div className="p-2 border-t text-center">
        <button className="text-xs text-primary hover:underline">View all notifications (soon)</button>
      </div>
    </div>
  );
}
