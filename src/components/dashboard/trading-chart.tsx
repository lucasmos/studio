'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import type { TradingInstrument, PriceTick } from '@/types';
import { getTicks } from '@/services/deriv'; // Import the service
import { Skeleton } from '@/components/ui/skeleton';

const chartConfig = {
  price: {
    label: "Price",
    color: "hsl(var(--accent))",
  },
};

interface TradingChartProps {
  instrument: TradingInstrument;
  onInstrumentChange: (instrument: TradingInstrument) => void;
}

function InstrumentChart({ instrument }: { instrument: TradingInstrument }) {
  const [data, setData] = useState<PriceTick[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true; // To prevent state updates on unmounted component

    const fetchTicksData = async () => {
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
          setData([]); // Clear data on error
        }
      } finally {
        if (isActive) {
          setIsLoading(false);
        }
      }
    };

    fetchTicksData();

    return () => {
      isActive = false; // Cleanup function to set isActive to false when component unmounts
    };
  }, [instrument]); // Refetch when instrument changes

  const formattedData = useMemo(() => {
    return data.map(tick => ({
      time: tick.time, // Assuming tick.time is already formatted "HH:mm:ss"
      price: parseFloat(tick.price.toFixed(instrument === 'BTC/USD' ? 2 : 4))
    }));
  }, [data, instrument]);

  if (isLoading) {
    return (
      <div className="aspect-video h-[400px] w-full flex items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="aspect-video h-[400px] w-full flex items-center justify-center text-destructive">
        <p>{error}</p>
      </div>
    );
  }
  
  if (formattedData.length === 0) {
    return (
       <div className="aspect-video h-[400px] w-full flex items-center justify-center text-muted-foreground">
        <p>No trading data available for {instrument} at the moment.</p>
      </div>
    )
  }


  return (
    <ChartContainer config={chartConfig} className="aspect-video h-[400px] w-full">
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
            // Display fewer ticks if data is dense
            interval={formattedData.length > 20 ? Math.floor(formattedData.length / 10) : 0}
          />
          <YAxis 
            domain={['auto', 'auto']}
            tickFormatter={(value) => typeof value === 'number' ? value.toFixed(instrument === 'BTC/USD' ? 2 : 4) : value}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            width={80} // Adjust width to prevent label cropping
          />
          <ChartTooltip
            cursor={true}
            content={<ChartTooltipContent 
                        indicator="line" 
                        labelKey="price" 
                        formatter={(value, name, props) => {
                           const price = typeof props.payload?.price === 'number' ? props.payload.price.toFixed(instrument === 'BTC/USD' ? 2 : 4) : 'N/A';
                           return [`Price: ${price}`, `Time: ${props.payload?.time}`];
                        }}
                        hideLabel={true} // Hiding the default label which might just be "Price"
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


export function TradingChart({ instrument, onInstrumentChange }: TradingChartProps) {
  const instruments: TradingInstrument[] = ['EUR/USD', 'GBP/USD', 'BTC/USD'];

  return (
    <Card className="shadow-lg col-span-1 md:col-span-2">
      <CardHeader>
        <CardTitle>Market Watch</CardTitle>
        <CardDescription>Live price action for selected instruments.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={instrument} onValueChange={(value) => onInstrumentChange(value as TradingInstrument)} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            {instruments.map((inst) => (
              <TabsTrigger key={inst} value={inst}>{inst}</TabsTrigger>
            ))}
          </TabsList>
          {instruments.map((inst) => (
            <TabsContent key={inst} value={inst}>
              <InstrumentChart instrument={inst} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}