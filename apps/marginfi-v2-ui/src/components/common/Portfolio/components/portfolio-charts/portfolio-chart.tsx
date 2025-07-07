"use client";

import {
  dynamicNumeralFormatter,
  numeralFormatter,
  usdFormatter,
} from "@mrgnlabs/mrgn-common/dist/utils/formatters.utils";
import React from "react";
import {
  Scatter,
  ScatterChart,
  Line,
  LineChart,
  CartesianGrid,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ZAxis,
} from "recharts";

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
import { usePortfolioData, usePortfolioChart } from "@mrgnlabs/mrgn-state";
import { useMemo } from "react";
import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";

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

  const {
    data: chartData,
    bankSymbols,
    isLoading: isChartLoading,
    error: chartError,
  } = usePortfolioChart(accountAddress, banks, variant as "deposits" | "borrows" | "net");

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
        } else if (symbol === "Net Portfolio" || symbol === "net") {
          config[symbol] = {
            label: symbol === "net" ? "Net Portfolio" : symbol,
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

  if (isChartLoading) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <Loader label="Loading portfolio data..." />
      </div>
    );
  }

  if (chartError) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Failed to load {variant === "borrows" ? "borrow" : variant === "deposits" ? "deposit" : ""} data</p>
          <p className="text-sm">
            {chartError.message.includes("Error fetching portfolio data: Not Found")
              ? "No activity found in the last 30 days for this account."
              : chartError.message}
          </p>
        </div>
      </div>
    );
  }

  if (!chartData || chartData.length === 0 || bankSymbols.length === 0) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>No {variant === "borrows" ? "borrow" : variant === "deposits" ? "deposit" : ""} data available</p>
          <p className="text-sm">Data will appear here when available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[300px]">
      <ChartContainer config={dynamicChartConfig} className="h-full w-full -translate-x-3">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart
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
              name="Date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatDate}
              type="category"
              allowDuplicatedCategory={false}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <YAxis
              dataKey="value"
              name="Value"
              tickFormatter={(value: any) => `$${dynamicNumeralFormatter(value)}`}
              axisLine={false}
              tickLine={false}
              width={65}
              tickMargin={8}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
            />
            <ZAxis range={[60, 60]} />
            <ChartTooltip
              cursor={{ strokeDasharray: "3 3" }}
              content={({ active, payload }) => {
                if (active && payload && payload.length > 0) {
                  const dataPoint = payload[0].payload;
                  const date = formatDate(dataPoint.timestamp);
                  const symbols = Object.keys(dataPoint).filter((key) => key !== "timestamp" && key !== "value");

                  return (
                    <div className="bg-background p-3 border rounded-lg shadow-md">
                      <p className="font-medium mb-1">{date}</p>
                      <div className="space-y-1">
                        {symbols.map((symbol) => {
                          const color = (dynamicChartConfig as any)[symbol]?.color || "hsl(var(--mfi-chart-1))";
                          return (
                            <div key={symbol} className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
                              <span className="text-sm font-medium">{symbol}</span>
                              <span className="text-sm text-muted-foreground">
                                ${numeralFormatter(dataPoint[symbol])}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ChartLegend content={<ChartLegendContent />} className="mt-2" />

            {bankSymbols.map((symbol: string) => {
              const color = (dynamicChartConfig as any)[symbol]?.color || "hsl(var(--mfi-chart-1))";
              const strokeWidth = symbol === "net" || symbol === "Net Portfolio" ? 2 : 1.5;

              const scatterData = chartData.map((point: Record<string, any>) => ({
                timestamp: point.timestamp,
                value: point[symbol] || 0,
                [symbol]: point[symbol] || 0,
              }));

              return (
                <Scatter
                  key={symbol}
                  name={symbol}
                  data={scatterData}
                  fill={color}
                  shape="circle"
                  isAnimationActive={false}
                />
              );
            })}
          </ScatterChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};

export { PortfolioChart };
