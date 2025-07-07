"use client";

import { dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common/dist/utils/formatters.utils";
import React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";

import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "~/components/ui/chart";
import { Loader } from "~/components/ui/loader";
import { useInterestChart } from "@mrgnlabs/mrgn-state";

type InterestChartProps = {
  selectedAccount: string | null;
  dataType: "earned" | "paid" | "total";
  variant?: "default" | "total"; // Add variant for total interest chart
};

// Generate dynamic colors for multiple bank lines
const generateChartColors = (bankSymbols: string[], variant: "default" | "total" = "default") => {
  if (variant === "total") {
    // Special colors for total interest chart
    const totalColors: Record<string, string> = {
      "Total Earned": "hsl(var(--mfi-chart-positive))", // Green for earned
      "Total Paid": "hsl(var(--mfi-chart-negative))", // Red for paid
      "Net Interest": "hsl(var(--mfi-chart-neutral))", // mfi-chart-neutral for net
    };
    return totalColors;
  }

  // Use the new mfi-chart variables for multi-bank interest charts
  const baseColors = [
    "hsl(var(--mfi-chart-1))",
    "hsl(var(--mfi-chart-2))",
    "hsl(var(--mfi-chart-3))",
    "hsl(var(--mfi-chart-4))",
    "hsl(var(--mfi-chart-5))",
    "hsl(var(--mfi-chart-6))",
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

const InterestChart = ({ selectedAccount, dataType, variant = "default" }: InterestChartProps) => {
  // Use the new hook
  const { data: chartData, bankSymbols, error, isLoading } = useInterestChart(selectedAccount, dataType);

  const chartColors = React.useMemo(() => generateChartColors(bankSymbols, variant), [bankSymbols, variant]);

  // Generate proper chart config based on data type
  const chartConfig = React.useMemo(() => {
    const config: ChartConfig = {};
    bankSymbols.forEach((symbol: string) => {
      // Fix label generation to use correct data type
      // Special case for Net Interest to avoid duplicate "Interest" word
      if (symbol === "Net Interest" && variant === "total") {
        config[symbol] = {
          label: symbol,
          color: chartColors[symbol],
        };
      } else {
        const labelType = variant === "total" ? "Interest" : dataType === "earned" ? "Interest Earned" : "Interest Paid";
        config[symbol] = {
          label: `${symbol} ${labelType}`,
          color: chartColors[symbol],
        };
      }
    });
    return config;
  }, [bankSymbols, chartColors, dataType, variant]);

  // Calculate the min and max values for Y-axis domain with better scaling for small values
  const { minValue, maxValue, yAxisDomain, yAxisTicks } = React.useMemo(() => {
    if (!chartData.length) return { minValue: 0, maxValue: 0, yAxisDomain: [0, 1], yAxisTicks: undefined };

    let min = 0;
    let max = 0;
    chartData.forEach((dataPoint: any) => {
      bankSymbols.forEach((symbol: string) => {
        const value = dataPoint[symbol] as number;
        if (typeof value === "number") {
          if (value > max) max = value;
          if (value < min) min = value;
        }
      });
    });

    // For total interest chart, ensure 0 is always visible (like Portfolio Balance)
    if (variant === "total" && (min < 0 || max > 0)) {
      // Simple approach: let Recharts handle the domain but ensure it includes 0
      const padding = 0.1;
      const domainMin = min < 0 ? min * (1 + padding) : Math.min(0, min);
      const domainMax = max > 0 ? max * (1 + padding) : Math.max(0, max);

      return {
        minValue: min,
        maxValue: max,
        yAxisDomain: [domainMin, domainMax],
        yAxisTicks: undefined, // Let Recharts auto-generate ticks including 0
      };
    }

    // For individual interest charts with small values, use better scaling
    if (max > 0 && max < 10) {
      // For small positive values (under $10), add better padding
      const domainMax = Math.ceil(max * 1.2 * 100) / 100; // Round up to nearest cent with 20% padding
      const domainMin = min < 0 ? Math.floor(min * 1.2 * 100) / 100 : 0;

      return {
        minValue: min,
        maxValue: max,
        yAxisDomain: [domainMin, domainMax],
        yAxisTicks: undefined,
      };
    }

    // Default case
    return {
      minValue: min,
      maxValue: max,
      yAxisDomain: [min < 0 ? Math.floor(min * 1.1) : 0, max > 0 ? Math.ceil(max * 1.1) : 1],
      yAxisTicks: undefined,
    };
  }, [chartData, bankSymbols, variant]);

  if (isLoading) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <Loader label="Loading interest data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Failed to load interest data</p>
          <p className="text-sm">{error.message}</p>
        </div>
      </div>
    );
  }

  if (!chartData.length || !bankSymbols.length) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>No interest data available</p>
          <p className="text-sm">No activity found in the last 30 days for this account</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[300px]">
      <ChartContainer config={chartConfig} className="h-full w-full -translate-x-3">
        <ResponsiveContainer width="100%" height="100%">
          {variant === "total" ? (
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
                tickFormatter={(value: any) => `$${dynamicNumeralFormatter(value)}`}
                domain={yAxisDomain}
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
                {bankSymbols
                  .filter((symbol) => symbol !== "Net Interest")
                  .map((bankSymbol) => {
                    const color = chartColors[bankSymbol];
                    const uniqueId = `total-${bankSymbol.replace(/\s+/g, "")}-Fill`;
                    return (
                      <linearGradient key={uniqueId} id={uniqueId} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                      </linearGradient>
                    );
                  })}
              </defs>
              {bankSymbols.map((bankSymbol) => {
                if (bankSymbol === "Net Interest") {
                  // Render net interest as a transparent area (appears as line on top)
                  return (
                    <Area
                      key={bankSymbol}
                      dataKey={bankSymbol}
                      type="monotone"
                      fill="transparent"
                      fillOpacity={0}
                      stroke={chartColors[bankSymbol]}
                      strokeWidth={2}
                      name={`${bankSymbol}`}
                      isAnimationActive={false}
                      stackId={undefined}
                    />
                  );
                } else {
                  // Render main data with gradients
                  const uniqueId = `total-${bankSymbol.replace(/\s+/g, "")}-Fill`;
                  return (
                    <Area
                      key={bankSymbol}
                      dataKey={bankSymbol}
                      type="monotone"
                      fill={`url(#${uniqueId})`}
                      fillOpacity={1}
                      stroke={chartColors[bankSymbol]}
                      strokeWidth={2}
                      name={`${bankSymbol} Interest`}
                      isAnimationActive={false}
                      stackId={undefined} // No stacking for individual areas
                    />
                  );
                }
              })}
            </AreaChart>
          ) : (
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
                tickFormatter={(value: any) => `$${dynamicNumeralFormatter(value)}`}
                domain={yAxisDomain}
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
              {bankSymbols.map((bankSymbol, index) => {
                // Fix the area name to use correct data type
                const areaName =
                  dataType === "earned" ? `${bankSymbol} Interest Earned` : `${bankSymbol} Interest Paid`;

                return (
                  <Area
                    key={bankSymbol}
                    dataKey={bankSymbol}
                    type="monotone"
                    fill={`url(#${bankSymbol}Fill)`}
                    fillOpacity={1}
                    stroke={chartColors[bankSymbol]}
                    strokeWidth={1.5}
                    name={areaName}
                    isAnimationActive={false}
                    stackId={index > 0 ? "stack" : undefined}
                  />
                );
              })}
            </AreaChart>
          )}
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};

export { InterestChart };
