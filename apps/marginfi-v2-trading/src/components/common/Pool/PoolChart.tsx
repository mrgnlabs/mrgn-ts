import React from "react";

import { useRouter } from "next/router";

import { AreaChart, CartesianGrid, XAxis, Area, Tooltip } from "recharts";

import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";
import { usdFormatter } from "@mrgnlabs/mrgn-common";

type PoolChartProps = {
  chartData: {
    time: string;
    desktop: number;
  }[];
};

const chartConfig = {
  desktop: {
    label: "Price",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export const PoolChart = ({ chartData }: PoolChartProps) => {
  if (!chartData.length) return null;

  return (
    <ChartContainer config={chartConfig} className="h-[100px] w-full mt-2">
      <AreaChart accessibilityLayer data={chartData}>
        <CartesianGrid horizontal={false} />
        <XAxis
          dataKey="time"
          tickLine={false}
          axisLine={false}
          minTickGap={32}
          tickMargin={8}
          tickFormatter={(value) => {
            console.log(value);
            return value
              .replace(/hours|hour/g, "hr")
              .replace(/minutes/g, "m")
              .replace(/an/g, "1")
              .replace(/a day/g, "24 hr")
              .replace(/ago/g, "");
          }}
          className="text-xs"
        />
        <ChartTooltip
          cursor={false}
          content={
            <ChartTooltipContent
              formatter={(value) => {
                const num = Number(value);
                return (
                  <div className="flex items-center justify-center gap-2 w-full">
                    <strong className="font-medium">Price:</strong>
                    <span>{num > 0.01 ? usdFormatter.format(num) : `$${num.toExponential(2)}`}</span>
                  </div>
                );
              }}
              labelFormatter={(value) => {
                if (!value) {
                  return "Now";
                }

                return value;
              }}
            />
          }
        />
        <defs>
          <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
            <stop
              offset="5%"
              stopColor={chartData[chartData.length - 1].desktop >= chartData[0].desktop ? "#75ba80" : "#e07d6f"}
              stopOpacity={0.8}
            />
            <stop
              offset="95%"
              stopColor={chartData[chartData.length - 1].desktop >= chartData[0].desktop ? "#75ba80" : "#e07d6f"}
              stopOpacity={0.1}
            />
          </linearGradient>
        </defs>
        <Area
          dataKey="desktop"
          type="natural"
          fill="url(#fill)"
          fillOpacity={0.4}
          stroke={chartData[chartData.length - 1].desktop >= chartData[0].desktop ? "#75ba80" : "#e07d6f"}
        />
      </AreaChart>
    </ChartContainer>
  );
};
