"use client";

import { numeralFormatter, usdFormatter } from "@mrgnlabs/mrgn-common/dist/utils/formatters.utils";
import React from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer } from "recharts";

import { Card, CardContent } from "~/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";

type PortfolioChartProps = {
  value: number;
};

const chartColors = {
  primary: "hsl(198.6 88.7% 48.4%)",
} as const;

const chartConfig = {
  value: {
    label: "Portfolio Value",
    color: chartColors.primary,
  },
} satisfies ChartConfig;

const formatDate = (dateStr: string) => {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

const generateMockData = (currentValue: number) => {
  const data = [];
  const now = new Date();
  const volatility = currentValue * 0.15;

  for (let i = 30; i >= 0; i--) {
    const date = new Date(now);
    date.setDate(date.getDate() - i);

    const randomFactor = Math.random() * 2 - 1;
    const dailyChange = volatility * randomFactor;
    const dayValue = Math.max(0, currentValue + dailyChange * (i / 30));

    data.push({
      timestamp: date.toISOString(),
      value: dayValue,
    });
  }

  return data;
};

const PortfolioChart = ({ value }: PortfolioChartProps) => {
  const mockData = React.useMemo(() => generateMockData(value), [value]);

  return (
    <div className="w-full h-[200px]">
      <ChartContainer config={chartConfig} className="h-full w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={mockData}
            margin={{
              top: 10,
              right: 10,
              bottom: 20,
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
              tickFormatter={(value) => `$${numeralFormatter(value)}`}
              domain={["auto", "auto"]}
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
            <defs>
              <linearGradient id="portfolioFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColors.primary} stopOpacity={0.2} />
                <stop offset="95%" stopColor={chartColors.primary} stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <Area
              dataKey="value"
              type="monotone"
              fill="url(#portfolioFill)"
              fillOpacity={1}
              stroke={chartColors.primary}
              strokeWidth={1.5}
              name="Portfolio Value"
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartContainer>
    </div>
  );
};

export { PortfolioChart };
