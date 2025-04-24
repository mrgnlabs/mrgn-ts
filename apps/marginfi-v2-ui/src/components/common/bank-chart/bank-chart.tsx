"use client";

import React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useBankRates } from "./hooks/use-bank-chart.hook";
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

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

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

  if (!data || data.length === 0) {
    return <div>No data available</div>;
  }

  return (
    <Card className="bg-transparent">
      <CardHeader>
        <CardTitle className="text-xl">Bank Rate History</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            data={data}
            margin={{
              left: 12,
              right: 12,
              top: 12,
              bottom: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={formatDate}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis tickFormatter={(value: number) => `${value.toFixed(2)}%`} domain={["auto", "auto"]} hide={false} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelFormatter={(label) => formatDate(label as string)} />}
            />
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
