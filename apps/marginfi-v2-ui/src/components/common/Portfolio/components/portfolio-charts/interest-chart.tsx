"use client";

import {
  dynamicNumeralFormatter,
  numeralFormatter,
  usdFormatter,
} from "@mrgnlabs/mrgn-common/dist/utils/formatters.utils";
import React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";

import { Card, CardContent } from "~/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "~/components/ui/chart";
import { Loader } from "~/components/ui/loader";

interface ChartDataPoint {
  timestamp: string;
  [bankSymbol: string]: number | string;
}

type InterestChartProps = {
  chartData: ChartDataPoint[];
  bankSymbols: string[];
  loading: boolean;
  error: string | null;
};

// Generate dynamic colors for multiple bank lines
const generateChartColors = (bankSymbols: string[]) => {
  const baseColors = [
    "hsl(var(--mrgn-success))", // Green
    "hsl(var(--mrgn-warning))", // Yellow/Orange
    "hsl(var(--mrgn-error))", // Red
    "hsl(var(--primary))", // Primary theme color
    "hsl(220, 91%, 60%)", // Blue
    "hsl(280, 91%, 60%)", // Purple
    "hsl(340, 91%, 60%)", // Pink
    "hsl(160, 91%, 60%)", // Teal
  ];

  const colors: Record<string, string> = {};
  bankSymbols.forEach((symbol, index) => {
    colors[symbol] = baseColors[index % baseColors.length];
  });

  return colors;
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const InterestChart = ({ chartData, bankSymbols, loading, error }: InterestChartProps) => {
  const chartColors = React.useMemo(() => generateChartColors(bankSymbols), [bankSymbols]);

  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    bankSymbols.forEach((symbol) => {
      config[symbol] = {
        label: `${symbol} Interest Earned`,
        color: chartColors[symbol],
      };
    });
    return config;
  }, [bankSymbols, chartColors]);

  // Calculate the maximum value for Y-axis domain
  const maxValue = React.useMemo(() => {
    if (!chartData.length) return 0;

    let max = 0;
    chartData.forEach((dataPoint) => {
      bankSymbols.forEach((symbol) => {
        const value = dataPoint[symbol] as number;
        if (typeof value === "number" && value > max) {
          max = value;
        }
      });
    });
    return max;
  }, [chartData, bankSymbols]);

  if (loading) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <Loader label="Loading interest earned data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Failed to load interest earned data</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!chartData.length || !bankSymbols.length) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>No interest earned data available</p>
          <p className="text-sm">Start lending to see your interest earnings over time</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[300px]">
      <ChartContainer config={chartConfig} className="h-full w-full -translate-x-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={chartData}
            margin={{
              top: 10,
              right: 10,
              bottom: 10,
              left: 0,
            }}
          >
            <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
            <XAxis
              dataKey="timestamp"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatDate}
              interval="preserveStartEnd"
              minTickGap={50}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis
              tickFormatter={(value) => `$${dynamicNumeralFormatter(Math.max(0, value))}`}
              domain={[0, maxValue > 0 ? Math.ceil(maxValue * 1.1) : 1]}
              axisLine={false}
              tickLine={false}
              width={65}
              tickMargin={8}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelFormatter={(label) => formatDate(label as string)} />}
            />
            <ChartLegend content={<ChartLegendContent />} className="mt-2" />
            <defs>
              {bankSymbols.map((bankSymbol, index) => (
                <linearGradient key={`${bankSymbol}Fill`} id={`${bankSymbol}Fill`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={chartColors[bankSymbol]} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={chartColors[bankSymbol]} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            {bankSymbols.map((bankSymbol, index) => (
              <Area
                key={bankSymbol}
                dataKey={bankSymbol}
                type="monotone"
                fill={`url(#${bankSymbol}Fill)`}
                fillOpacity={1}
                stroke={chartColors[bankSymbol]}
                strokeWidth={1.5}
                name={`${bankSymbol} Interest Earned`}
                isAnimationActive={false}
                stackId={index > 0 ? "stack" : undefined} // Stack areas for better visibility
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};

export { InterestChart };
