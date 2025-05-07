'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer } from "recharts";
import type { TradingInstrument, PriceTick } from '@/types';

const initialChartData: PriceTick[] = Array.from({ length: 30 }, (_, i) => {
  const baseTime = new Date();
  baseTime.setSeconds(baseTime.getSeconds() - (30 - i) * 5); // 5 second intervals
  return {
    time: baseTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    price: 1.0750 + (Math.random() - 0.5) * 0.0020,
  };
});

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
  const [data, setData] = useState<PriceTick[]>(initialChartData);

  useEffect(() => {
    // Simulate real-time data updates
    const intervalId = setInterval(() => {
      setData(prevData => {
        const newDataPoint: PriceTick = {
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit'}),
          price: prevData.length > 0 ? prevData[prevData.length - 1].price + (Math.random() - 0.5) * 0.0005 : 1.0750 + (Math.random() - 0.5) * 0.0010,
        };
        const updatedData = [...prevData.slice(1), newDataPoint];
        return updatedData;
      });
    }, 5000); // Update every 5 seconds

    return () => clearInterval(intervalId);
  }, []);

  const formattedData = useMemo(() => {
    return data.map(tick => ({
      time: tick.time,
      price: parseFloat(tick.price.toFixed(4)) // Ensure price is a number and formatted
    }));
  }, [data]);

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
          />
          <YAxis 
            domain={['auto', 'auto']}
            tickFormatter={(value) => value.toFixed(4)}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
            tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
          />
          <ChartTooltip
            cursor={false}
            content={<ChartTooltipContent indicator="line" labelKey="price" />}
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
