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
import { usePortfolioChart } from "@mrgnlabs/mrgn-state";
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

const formatDateTime = (dateStr: string) => {
  const date = new Date(dateStr);
  return (
    date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }) +
    ", " +
    date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
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
        } else if (symbol === "Portfolio Balance" || symbol === "net") {
          config[symbol] = {
            label: symbol === "net" ? "Portfolio Balance" : symbol,
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
              content={<ChartTooltipContent labelFormatter={(label) => formatDateTime(label as string)} />}
            />
            <ChartLegend content={<ChartLegendContent />} className="mt-2" />
            <defs>
              {bankSymbols.map((symbol: string) => {
                const color = (dynamicChartConfig as any)[symbol]?.color || "hsl(var(--mfi-chart-1))";
                const uniqueId = `portfolio-${symbol.replace(/\s+/g, "")}-Fill`;
                return (
                  <linearGradient key={uniqueId} id={uniqueId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={color} stopOpacity={0.05} />
                  </linearGradient>
                );
              })}
            </defs>
            {bankSymbols.map((symbol: string, index: number) => {
              const color = (dynamicChartConfig as any)[symbol]?.color || "hsl(var(--mfi-chart-1))";
              const strokeWidth =
                symbol === "net" || symbol === "Net Portfolio" || symbol === "Portfolio Balance" ? 2 : 1.5;
              const uniqueId = `portfolio-${symbol.replace(/\s+/g, "")}-Fill`;

              if (symbol === "net" || symbol === "Net Portfolio" || symbol === "Portfolio Balance") {
                return (
                  <Area
                    key={symbol}
                    dataKey={symbol}
                    type="monotone"
                    fill={`url(#${uniqueId})`}
                    fillOpacity={0.4}
                    stroke={color}
                    strokeWidth={strokeWidth}
                    name={symbol === "net" ? "Portfolio Balance" : symbol}
                    isAnimationActive={false}
                    stackId={undefined}
                    dot={{ fill: color, strokeWidth: 2, r: 3 }}
                  />
                );
              }

              return (
                <Area
                  key={symbol}
                  dataKey={symbol}
                  type="monotone"
                  fill={`url(#${uniqueId})`}
                  fillOpacity={1}
                  stroke={color}
                  strokeWidth={strokeWidth}
                  name={symbol}
                  isAnimationActive={false}
                  stackId={
                    variant === "deposits" || variant === "borrows" ? (index > 0 ? "stack" : undefined) : undefined
                  }
                  dot={{ fill: color, strokeWidth: 2, r: 3 }}
                />
              );
            })}
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};

export { PortfolioChart };
