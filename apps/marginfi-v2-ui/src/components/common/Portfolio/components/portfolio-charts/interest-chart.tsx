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

type PortfolioChartProps = {
  deposits: number;
  borrows: number;
};

const chartColors = {
  primary: "hsl(var(--mfi-chart-1))",
  secondary: "hsl(var(--mfi-chart-2))",
} as const;

const chartConfig = {
  deposits: {
    label: "Interest Earned",
    color: chartColors.primary,
  },
  borrows: {
    label: "Borrowed",
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

const generateMockData = (deposits: number, borrows: number) => {
  const data = [];
  const now = new Date();
  const depositsVolatility = deposits * 0.6;
  const borrowsVolatility = borrows * 0.6;

  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const depositsRandomFactor = Math.random() * 2 - 1;
    const borrowsRandomFactor = Math.random() * 2 - 1;

    const depositsDailyChange = depositsVolatility * depositsRandomFactor;
    const borrowsDailyChange = borrowsVolatility * borrowsRandomFactor;

    const depositsValue = Math.max(0, deposits + depositsDailyChange * (i / 30));
    const borrowsValue = Math.max(0, borrows + borrowsDailyChange * (i / 30));

    data.push({
      timestamp: date.toISOString(),
      deposits: depositsValue,
      borrows: borrowsValue,
    });
  }

  return data;
};

const InterestChart = ({ deposits, borrows }: PortfolioChartProps) => {
  const mockData = React.useMemo(() => generateMockData(deposits, borrows), [deposits, borrows]);

  return (
    <div className="w-full h-[300px]">
      <ChartContainer config={chartConfig} className="h-full w-full -translate-x-3">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={mockData}
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
              tickFormatter={(value) => `$${dynamicNumeralFormatter(value)}`}
              domain={[0, "auto"]}
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
              <linearGradient id="interestFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.2} />
                <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0.05} />
              </linearGradient>
              <linearGradient id="interestFill2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.secondary} stopOpacity={0.2} />
                <stop offset="95%" stopColor={chartColors.secondary} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area
              dataKey="deposits"
              type="monotone"
              fill="url(#interestFill)"
              fillOpacity={1}
              stroke={chartColors.primary}
              strokeWidth={1.5}
              name="Interest Earned"
              isAnimationActive={false}
            />
            {/* <Area
              dataKey="borrows"
              type="monotone"
              fill="url(#interestFill2)"
              fillOpacity={1}
              stroke={chartColors.secondary}
              strokeWidth={1.5}
              name="Borrowed"
              isAnimationActive={false}
            /> */}
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};

export { InterestChart };
