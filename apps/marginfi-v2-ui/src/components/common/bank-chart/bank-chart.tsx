"use client";

import React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useBankChart } from "./hooks/use-bank-chart.hook";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";
import { Button } from "~/components/ui/button";

// Use the same colors for both charts
const chartColors = {
  primary: "hsl(var(--mrgn-success))",
  secondary: "hsl(var(--mrgn-warning))",
} as const;

const ratesChartConfig = {
  depositRate: {
    label: "Deposit Rate",
    color: chartColors.primary,
  },
  borrowRate: {
    label: "Borrow Rate",
    color: chartColors.secondary,
  },
} satisfies ChartConfig;

const tvlChartConfig = {
  totalDeposits: {
    label: "Total Deposits",
    color: chartColors.primary,
  },
  totalBorrows: {
    label: "Total Borrows",
    color: chartColors.secondary,
  },
} satisfies ChartConfig;

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const formatTVL = (value: number) => {
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  } else if (value >= 1_000) {
    return `$${(value / 1_000).toFixed(2)}K`;
  }
  return `$${value.toFixed(2)}`;
};

const formatRate = (value: number) => `${value.toFixed(2)}%`;

type BankChartProps = {
  bankAddress: string;
};

const BankChart = ({ bankAddress }: BankChartProps) => {
  const [showTVL, setShowTVL] = React.useState(false);
  const { data, error, isLoading } = useBankChart(bankAddress);

  if (isLoading) {
    return <div>Loading bank rates...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!data || data.length === 0) {
    return <div>No data available</div>;
  }

  const chartConfig = showTVL ? tvlChartConfig : ratesChartConfig;
  const formatValue = showTVL ? formatTVL : formatRate;

  // Transform the data to include formatted values
  const formattedData = data.map((item) => ({
    ...item,
    formattedBorrowRate: formatRate(item.borrowRate),
    formattedDepositRate: formatRate(item.depositRate),
    formattedTotalBorrows: formatTVL(item.totalBorrows),
    formattedTotalDeposits: formatTVL(item.totalDeposits),
  }));

  return (
    <Card className="bg-transparent">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl">Bank Rate History</CardTitle>
        <Button variant="outline" size="sm" onClick={() => setShowTVL(!showTVL)} className="text-sm font-medium">
          {showTVL ? "Show Rates" : "Show TVL"}
        </Button>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            data={formattedData}
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
            <YAxis tickFormatter={formatValue} domain={["auto", "auto"]} hide={false} width={80} />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent labelFormatter={(label) => formatDate(label as string)} />}
            />
            <defs>
              <linearGradient id="fillPrimary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.8} />
                <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillSecondary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.secondary} stopOpacity={0.8} />
                <stop offset="95%" stopColor={chartColors.secondary} stopOpacity={0.1} />
              </linearGradient>
            </defs>

            {showTVL ? (
              <>
                <Area
                  dataKey="totalBorrows"
                  type="monotone"
                  fill="url(#fillSecondary)"
                  fillOpacity={0.4}
                  stroke={chartColors.secondary}
                  strokeWidth={2}
                  name="Total Borrows"
                />
                <Area
                  dataKey="totalDeposits"
                  type="monotone"
                  fill="url(#fillPrimary)"
                  fillOpacity={0.4}
                  stroke={chartColors.primary}
                  strokeWidth={2}
                  name="Total Deposits"
                />
              </>
            ) : (
              <>
                <Area
                  dataKey="borrowRate"
                  type="monotone"
                  fill="url(#fillSecondary)"
                  fillOpacity={0.4}
                  stroke={chartColors.secondary}
                  strokeWidth={2}
                  name="Borrow Rate"
                />
                <Area
                  dataKey="depositRate"
                  type="monotone"
                  fill="url(#fillPrimary)"
                  fillOpacity={0.4}
                  stroke={chartColors.primary}
                  strokeWidth={2}
                  name="Deposit Rate"
                />
              </>
            )}
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};

export { BankChart };
