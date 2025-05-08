
'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import type { TradingInstrument, PriceTick, VolatilityInstrumentType, ForexCryptoCommodityInstrumentType } from '@/types';
import { getTicks } from '@/services/deriv'; 
import { Skeleton } from '@/components/ui/skeleton';
import { getInstrumentDecimalPlaces } from '@/lib/utils';

const chartConfig = {
  price: {
    label: "Price",
    color: "hsl(var(--accent))",
  },
};

interface SingleInstrumentChartDisplayProps {
  instrument: TradingInstrument;
}

// Renamed and Exported for use in MT5 Page and potentially elsewhere
export function SingleInstrumentChartDisplay({ instrument }: SingleInstrumentChartDisplayProps) {
  const [data, setData] = useState<PriceTick[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const decimalPlaces = getInstrumentDecimalPlaces(instrument);

  useEffect(() => {
    let isActive = true; 

    const fetchTicksData = async () => {
      if (!isActive) return; 
      setIsLoading(true);
      setError(null);
      try {
        const ticks = await getTicks(instrument);
        if (isActive) { 
          setData(ticks);
        }
      } catch (err) {
        console.error(`Failed to fetch ticks for ${instrument}:`, err);
        if (isActive) { 
          setError(`Failed to load data for ${instrument}.`);
          setData([]); 
        }
      } finally {
        if (isActive) { 
          setIsLoading(false);
        }
      }
    };

    fetchTicksData(); 

    const intervalId = setInterval(fetchTicksData, 30000); 

    return () => {
      isActive = false; 
      clearInterval(intervalId); 
    };
  }, [instrument]); 

  const formattedData = useMemo(() => {
    return data.map(tick => ({
      time: tick.time, 
      price: parseFloat(tick.price.toFixed(decimalPlaces))
    }));
  }, [data, decimalPlaces]);

  if (isLoading) {
    return (
      <div className="aspect-video h-full w-full flex items-center justify-center"> 
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="aspect-video h-full w-full flex items-center justify-center text-destructive"> 
        <p>{error}</p>
      </div>
    );
  }
  
  if (formattedData.length === 0) {
    return (
       <div className="aspect-video h-full w-full flex items-center justify-center text-muted-foreground"> 
        <p>No trading data available for {instrument} at the moment.</p>
      </div>
    )
  }


  return (
    <ChartContainer config={chartConfig} className="aspect-video h-full w-full"> 
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={formattedData}
          margin={{ top: 5, right: 20, left: -20, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
          <XAxis 
            dataKey="time" 
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }} 
            tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            interval={formattedData.length > 20 ? Math.floor(formattedData.length / 10) : 0}
          />
          <YAxis 
            domain={['auto', 'auto']}
            tickFormatter={(value) => typeof value === 'number' ? value.toFixed(decimalPlaces) : value}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            width={80} 
          />
          <ChartTooltip
            cursor={true}
            content={<ChartTooltipContent 
                        indicator="line" 
                        labelKey="price" 
                        formatter={(value, name, props) => {
                           const price = typeof props.payload?.price === 'number' ? props.payload.price.toFixed(decimalPlaces) : 'N/A';
                           return [`Price: ${price}`, `Time: ${props.payload?.time}`];
                        }}
                        hideLabel={true} 
                     />}
          />
          <Line
            dataKey="price"
            type="monotone"
            stroke="var(--color-price)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

interface TradingChartProps {
  instrument: TradingInstrument;
  onInstrumentChange: (instrument: TradingInstrument) => void;
}

const forexCryptoCommodityInstruments: ForexCryptoCommodityInstrumentType[] = ['EUR/USD', 'GBP/USD', 'BTC/USD', 'XAU/USD', 'ETH/USD'];
const volatilityInstruments: VolatilityInstrumentType[] = ['Volatility 10 Index', 'Volatility 25 Index', 'Volatility 50 Index', 'Volatility 75 Index', 'Volatility 100 Index'];
const allInstruments: TradingInstrument[] = [...forexCryptoCommodityInstruments, ...volatilityInstruments];


export function TradingChart({ instrument, onInstrumentChange }: TradingChartProps) {
  return (
    <Card className="shadow-lg col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Market Watch</CardTitle>
        <CardDescription>Live price action for selected instruments. Includes Forex, Crypto, Commodities and Volatility Indices.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={instrument} onValueChange={(value) => onInstrumentChange(value as TradingInstrument)} className="w-full">
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 mb-4"> 
            {allInstruments.map((inst) => (
              <TabsTrigger key={inst} value={inst}>{inst}</TabsTrigger>
            ))}
          </TabsList>
          {allInstruments.map((inst) => (
            <TabsContent key={inst} value={inst}>
              <SingleInstrumentChartDisplay instrument={inst} /> 
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
