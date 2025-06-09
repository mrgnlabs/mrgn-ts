"use client";

import React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { IconLoader2 } from "@tabler/icons-react";

import { useBankChart } from "../hooks/use-bank-chart.hook";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "~/components/ui/chart";
import { Skeleton } from "~/components/ui/skeleton";
import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { dynamicNumeralFormatter, percentFormatter } from "@mrgnlabs/mrgn-common/dist/utils/formatters.utils";

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

type BankChartProps = {
  bankAddress: string;
  tab?: "rates" | "tvl";
};

const BankChart = ({ bankAddress, tab = "tvl" }: BankChartProps) => {
  const [showTVL, setShowTVL] = React.useState(tab === "tvl");
  const { data, error, isLoading } = useBankChart(bankAddress);

  if (isLoading) {
    return (
      <Skeleton className="bg-muted/50 w-[100%] h-[435px] mx-auto flex flex-col gap-2 items-center justify-center text-muted-foreground">
        <IconLoader2 size={16} className="animate-spin" />
        <p>Loading chart...</p>
      </Skeleton>
    );
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  if (!data || data.length === 0) {
    return <div>No data available</div>;
  }

  const chartConfig = showTVL ? tvlChartConfig : ratesChartConfig;
  const formatValue = showTVL ? dynamicNumeralFormatter : percentFormatter.format;

  // Transform the data to include formatted values
  const formattedData = data.map((item) => ({
    ...item,
    formattedBorrowRate: percentFormatter.format(item.borrowRate),
    formattedDepositRate: percentFormatter.format(item.depositRate),
    formattedTotalBorrows: dynamicNumeralFormatter(item.totalBorrows),
    formattedTotalDeposits: dynamicNumeralFormatter(item.totalDeposits),
  }));

  const CustomTooltipContent = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="text-foreground font-medium">{formatDate(label)}</p>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center gap-2 mt-1">
              <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-sm text-muted-foreground">{entry.name}:</span>
              <span className="text-sm font-medium text-foreground">
                {showTVL ? `$${dynamicNumeralFormatter(entry.value)}` : `${entry.value.toFixed(2)}%`}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-transparent border-none">
      <CardHeader className="sr-only">
        <CardTitle>Bank History</CardTitle>
        <CardDescription>
          Chart showing interest rates and total deposits and borrows over the last 30 days.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-3 rounded-lg space-y-4 relative bg-background-gray pt-8">
        <ToggleGroup
          type="single"
          value={showTVL ? "tvl" : "rates"}
          onValueChange={(value) => setShowTVL(value === "tvl")}
          className="justify-start absolute top-3 right-3 z-20"
        >
          <ToggleGroupItem value="tvl">TVL</ToggleGroupItem>
          <ToggleGroupItem value="rates">Rates</ToggleGroupItem>
        </ToggleGroup>
        <ChartContainer config={chartConfig} className="h-[460px] w-full">
          <AreaChart
            data={formattedData}
            margin={{
              top: 24,
              right: 24,
              bottom: 6,
              left: 0,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickLine={false}
              axisLine={false}
              tickMargin={12}
              tickFormatter={formatDate}
              interval="preserveStartEnd"
              minTickGap={50}
            />
            <YAxis
              tickFormatter={(value) => (showTVL ? `$${formatValue(value)}` : `${value}%`)}
              domain={[0, "auto"]}
              hide={false}
              width={80}
              tickMargin={12}
            />
            <ChartTooltip cursor={false} content={<CustomTooltipContent />} />
            <ChartLegend content={<ChartLegendContent />} className="mt-6" />
            <defs>
              <linearGradient id="fillPrimary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.2} />
                <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillSecondary" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.secondary} stopOpacity={0.2} />
                <stop offset="95%" stopColor={chartColors.secondary} stopOpacity={0} />
              </linearGradient>
            </defs>

            {showTVL ? (
              <>
                <Area
                  dataKey="totalDeposits"
                  type="monotone"
                  fill="url(#fillPrimary)"
                  fillOpacity={0.4}
                  stroke={chartColors.primary}
                  strokeWidth={2}
                  name="Total Deposits"
                />
                <Area
                  dataKey="totalBorrows"
                  type="monotone"
                  fill="url(#fillSecondary)"
                  fillOpacity={0.4}
                  stroke={chartColors.secondary}
                  strokeWidth={2}
                  name="Total Borrows"
                />
              </>
            ) : (
              <>
                <Area
                  dataKey="depositRate"
                  type="monotone"
                  fill="url(#fillPrimary)"
                  fillOpacity={0.4}
                  stroke={chartColors.primary}
                  strokeWidth={2}
                  name="Deposit Rate"
                />
                <Area
                  dataKey="borrowRate"
                  type="monotone"
                  fill="url(#fillSecondary)"
                  fillOpacity={0.4}
                  stroke={chartColors.secondary}
                  strokeWidth={2}
                  name="Borrow Rate"
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
