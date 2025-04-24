"use client";

import React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useBankRates, BankRate } from "./hooks/bank-chart.hook";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";

const chartConfig = {
  borrowRate: {
    label: "Borrow Rate",
    color: "hsl(var(--mfi-stake-calculator-chart-1))",
  },
  depositRate: {
    label: "Deposit Rate",
    color: "hsl(var(--mfi-stake-calculator-chart-2))",
  },
} satisfies ChartConfig;

type BankChartProps = {
  bankAddress: string;
};

const BankChart = ({ bankAddress }: BankChartProps) => {
  const { data, error, isLoading } = useBankRates(bankAddress);

  if (isLoading) {
    return <div>Loading bank rates...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!data) {
    return <div>No data available</div>;
  }

  const chartData = data
    .map((rate: BankRate) => ({
      timestamp: new Date(rate.time).toLocaleDateString(),
      borrowRate: parseFloat(rate.borrow_rate_pct),
      depositRate: parseFloat(rate.deposit_rate_pct),
    }))
    .reverse(); // Show oldest to newest

  return (
    <Card className="bg-transparent">
      <CardHeader>
        <CardTitle className="text-xl">Bank Rates Over Time</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis dataKey="timestamp" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickFormatter={(value: number) => `${value}%`} domain={["auto", "auto"]} hide={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <linearGradient id="fillBorrowRate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-borrowRate)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-borrowRate)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillDepositRate" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-depositRate)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-depositRate)" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <Area
              dataKey="borrowRate"
              type="monotone"
              fill="url(#fillBorrowRate)"
              fillOpacity={0.4}
              stroke="var(--color-borrowRate)"
            />
            <Area
              dataKey="depositRate"
              type="monotone"
              fill="url(#fillDepositRate)"
              fillOpacity={0.4}
              stroke="var(--color-depositRate)"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export { BankChart };
