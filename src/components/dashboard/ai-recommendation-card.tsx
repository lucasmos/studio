import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Lightbulb, CheckCircle, XCircle, BarChart, Clock } from 'lucide-react';
import type { AiRecommendation } from '@/types';

interface AiRecommendationCardProps {
  recommendation: AiRecommendation | null;
  isLoading: boolean;
}

export function AiRecommendationCard({ recommendation, isLoading }: AiRecommendationCardProps) {
  if (isLoading) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lightbulb className="mr-2 h-6 w-6 text-accent animate-pulse" />
            AI Analysis
          </CardTitle>
          <CardDescription>Fetching latest insights...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="h-6 bg-muted rounded w-3/4 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-1/2 animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-full animate-pulse"></div>
          <div className="h-4 bg-muted rounded w-2/3 animate-pulse"></div>
        </CardContent>
      </Card>
    );
  }

  if (!recommendation) {
    return (
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Lightbulb className="mr-2 h-6 w-6 text-accent" />
            AI Analysis
          </CardTitle>
          <CardDescription>Get AI-powered trade recommendations.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Click "Get AI Recommendation" to see insights.</p>
        </CardContent>
      </Card>
    );
  }

  const isCall = recommendation.tradeRecommendation.toUpperCase() === 'CALL';
  const Icon = isCall ? CheckCircle : XCircle;
  const badgeVariant = isCall ? 'default' : 'destructive';
  const badgeColorClass = isCall ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600';


  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center">
          <Lightbulb className="mr-2 h-6 w-6 text-accent" />
          AI Recommendation
        </CardTitle>
        <CardDescription>Based on current market conditions and AI analysis.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert variant={isCall ? "default" : "destructive"} className={isCall ? "border-green-500" : "border-red-500"}>
          <Icon className={`h-5 w-5 ${isCall ? "text-green-500" : "text-red-500"}`} />
          <AlertTitle className={`font-semibold ${isCall ? "text-green-700" : "text-red-700"}`}>
            Recommended Action: {recommendation.tradeRecommendation}
          </AlertTitle>
          <AlertDescription>
            Confidence Score: 
            <Badge variant="secondary" className={`ml-2 ${recommendation.confidenceScore > 70 ? 'bg-green-100 text-green-800' : recommendation.confidenceScore > 40 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
              {recommendation.confidenceScore}%
            </Badge>
          </AlertDescription>
        </Alert>

        <div className="space-y-2">
          <div className="flex items-center text-sm">
            <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
            <span className="font-medium text-muted-foreground">Optimal Duration:</span>
            <Badge variant="outline" className="ml-2">{recommendation.optimalDuration}</Badge>
          </div>
          
          <div>
            <p className="text-sm font-medium text-muted-foreground mb-1">Reasoning:</p>
            <p className="text-sm text-foreground bg-muted/50 p-3 rounded-md shadow-inner">
              {recommendation.reasoning}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          AI recommendations are for informational purposes only and not financial advice.
        </p>
      </CardContent>
    </Card>
  );
}
