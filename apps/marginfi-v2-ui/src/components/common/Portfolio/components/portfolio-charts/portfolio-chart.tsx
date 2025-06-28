"use client";

import {
  dynamicNumeralFormatter,
  numeralFormatter,
  usdFormatter,
} from "@mrgnlabs/mrgn-common/dist/utils/formatters.utils";
import React from "react";
import { Area, AreaChart, Line, LineChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";

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
import { usePortfolioData } from "@mrgnlabs/mrgn-state";
import { useMemo } from "react";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

type PortfolioChartProps = {
  variant: "deposits" | "borrows" | "net";
  selectedAccount: any;
  banks: ExtendedBankInfo[];
};

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const PortfolioChart = ({ variant, selectedAccount, banks }: PortfolioChartProps) => {
  const accountAddress = selectedAccount?.address.toBase58();

  // Use the state layer's data hook directly
  const { data: portfolioData, filledDailyTotals, filledBankData, error, isLoading } = usePortfolioData(
    accountAddress,
    banks
  );

  // Transform data based on variant
  const { chartData, bankSymbols } = useMemo(() => {
    if (isLoading || !portfolioData || portfolioData.length === 0) {
      return { chartData: [], bankSymbols: [] };
    }

    // For the "net" variant, use the total portfolio data
    if (variant === "net") {
      // Convert the filled daily totals to chart format
      const sortedDates = Object.keys(filledDailyTotals).sort();
      const chartData = sortedDates.map((dateStr) => {
        const totals = filledDailyTotals[dateStr];
        const netValue = totals.deposits - totals.borrows;
        
        return {
          timestamp: dateStr,
          net: netValue
        };
      });
      
      return { chartData, bankSymbols: ["net"] };
    }
    
    // For deposits or borrows, use the bank-specific data
    const allBankSymbols = Object.keys(filledBankData);
    if (allBankSymbols.length === 0) {
      return { chartData: [], bankSymbols: [] };
    }

    // Get all dates from the first bank (all banks should have the same date range)
    const firstBank = allBankSymbols[0];
    const allDates = Object.keys(filledBankData[firstBank]).sort();
    
    // Filter out banks that have all zero values for the selected variant
    const filteredBankSymbols = allBankSymbols.filter((symbol: string) => {
      // Check if this bank has any non-zero values for the selected variant
      return Object.values(filledBankData[symbol]).some((dayData) => {
        return dayData[variant] > 0;
      });
    });
    
    // If no banks have non-zero values, return empty data
    if (filteredBankSymbols.length === 0) {
      return { chartData: [], bankSymbols: [] };
    }

    // Create chart data points with filtered banks for each date
    const chartData = allDates.map((date) => {
      const dataPoint: any = { timestamp: date };
      
      // Add each filtered bank's value for this date
      filteredBankSymbols.forEach((symbol: string) => {
        const bankValues = filledBankData[symbol][date];
        dataPoint[symbol] = bankValues ? bankValues[variant] : 0;
      });
      
      return dataPoint;
    });

    return { chartData, bankSymbols: filteredBankSymbols };
  }, [portfolioData, filledDailyTotals, filledBankData, variant, isLoading]);

  // Dynamic chart config with new color scheme
  const dynamicChartConfig = React.useMemo(() => {
    const config: ChartConfig = {};

    // For net variant, use positive/negative colors
    if (variant === "net") {
      bankSymbols.forEach((symbol: string) => {
        if (symbol === "Total Deposits") {
          config[symbol] = {
            label: symbol,
            color: "hsl(var(--mfi-chart-positive))",
          };
        } else if (symbol === "Total Borrows") {
          config[symbol] = {
            label: symbol,
            color: "hsl(var(--mfi-chart-negative))",
          };
        } else if (symbol === "Net Portfolio") {
          config[symbol] = {
            label: symbol,
            color: "hsl(var(--mfi-chart-neutral))",
          };
        } else {
          config[symbol] = {
            label: symbol,
            color: "hsl(var(--mfi-chart-neutral))",
          };
        }
      });
    } else {
      // For multi-bank charts, use the new mfi-chart variables
      const chartColors = [
        "hsl(var(--mfi-chart-1))",
        "hsl(var(--mfi-chart-2))",
        "hsl(var(--mfi-chart-3))",
        "hsl(var(--mfi-chart-4))",
        "hsl(var(--mfi-chart-5))",
        "hsl(var(--mfi-chart-6))",
      ];

      bankSymbols.forEach((symbol: string, index: number) => {
        config[symbol] = {
          label: symbol,
          color: chartColors[index % chartColors.length],
        };
      });
    }

    return config;
  }, [variant, bankSymbols]);

  if (isLoading) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <Loader label="Loading portfolio data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground">{error.message}</p>
      </div>
    );
  }

  if (!chartData || chartData.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <p className="text-muted-foreground">No portfolio data available</p>
      </div>
    );
  }

  return (
    <div className="w-full h-[300px]">
      <ChartContainer config={dynamicChartConfig} className="h-full w-full -translate-x-3">
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
              tickFormatter={(value: any) => `$${dynamicNumeralFormatter(value)}`}
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
                .filter((symbol) => symbol !== "Net Portfolio")
                .map((symbol: string) => {
                  const { color } = dynamicChartConfig[symbol] || {};
                  const uniqueId = `${variant}-${symbol.replace(/\s+/g, "")}-Fill`;
                  return (
                    <linearGradient key={uniqueId} id={uniqueId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                    </linearGradient>
                  );
                })}
            </defs>
            {bankSymbols.map((symbol: string, index: number) => {
              if (symbol === "Net Portfolio") {
                // Render net portfolio as a transparent area (appears as line on top)
                return (
                  <Area
                    key={symbol}
                    dataKey={symbol}
                    type="monotone"
                    fill="transparent"
                    fillOpacity={0}
                    stroke={(dynamicChartConfig as any)[symbol]?.color || "hsl(var(--mfi-chart-neutral))"}
                    strokeWidth={2}
                    name={symbol}
                    isAnimationActive={false}
                    stackId={undefined}
                  />
                );
              } else {
                // Render main data with gradients
                const uniqueId = `${variant}-${symbol.replace(/\s+/g, "")}-Fill`;
                return (
                  <Area
                    key={symbol}
                    dataKey={symbol}
                    type="monotone"
                    fill={`url(#${uniqueId})`}
                    fillOpacity={1}
                    stroke={(dynamicChartConfig as any)[symbol]?.color || "hsl(var(--mfi-chart-1))"}
                    strokeWidth={1.5}
                    name={symbol}
                    isAnimationActive={false}
                    stackId={undefined}
                  />
                );
              }
            })}
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};

export { PortfolioChart };
