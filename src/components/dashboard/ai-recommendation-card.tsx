'use client';

import type { AiRecommendation } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Bot, Zap, Clock, BarChartBig } from 'lucide-react';

interface AiRecommendationCardProps {
  recommendation: AiRecommendation | null;
  isLoading: boolean;
}

export function AiRecommendationCard({ recommendation, isLoading }: AiRecommendationCardProps) {
  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Bot className="mr-2 h-6 w-6 text-primary" />
          AI Recommendation
        </CardTitle>
        <CardDescription>Analysis based on current market conditions for manual trading.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2 mb-2" />
            <Skeleton className="h-4 w-1/4 mb-2" />
            <Skeleton className="h-10 w-full" />
          </>
        ) : recommendation ? (
          <>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Recommendation</h4>
              <Badge 
                variant={recommendation.tradeRecommendation.toUpperCase() === 'CALL' ? 'default' : 'destructive'}
                className={`text-lg font-semibold px-3 py-1 ${recommendation.tradeRecommendation.toUpperCase() === 'CALL' ? 'bg-green-500 hover:bg-green-600 text-primary-foreground' : 'bg-red-500 hover:bg-red-600 text-primary-foreground'}`}
              >
                {recommendation.tradeRecommendation.toUpperCase()}
              </Badge>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Confidence Score</h4>
              <p className="text-xl font-semibold flex items-center">
                <BarChartBig className="mr-2 h-5 w-5 text-accent" />
                {recommendation.confidenceScore}%
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Optimal Duration</h4>
              <p className="text-lg flex items-center">
                <Clock className="mr-2 h-5 w-5 text-accent" />
                {recommendation.optimalDuration}
              </p>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground">Reasoning</h4>
              <p className="text-sm text-foreground/90">{recommendation.reasoning}</p>
            </div>
          </>
        ) : (
          <div className="text-center py-6">
            <Zap className="mx-auto h-10 w-10 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No AI recommendation available.</p>
            <p className="text-xs text-muted-foreground">Click &quot;Get Manual AI Recommendation&quot; in the Trade Terminal.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
