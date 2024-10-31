import React from "react";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { formatAmount } from "@mrgnlabs/mrgn-utils";
import { groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";

import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";

const chartConfig = {
  staked: {
    label: "Staked",
    color: "hsl(var(--mfi-stake-calculator-chart-1))",
  },
  unstaked: {
    label: "Unstaked",
    color: "hsl(var(--mfi-stake-calculator-chart-2))",
  },
} satisfies ChartConfig;

const StakeCalculator = () => {
  const [amount, setAmount] = React.useState(1000);
  const [amountFormatted, setAmountFormatted] = React.useState("1,000");
  const [duration, setDuration] = React.useState(5);

  const handleAmountChange = (value: string) => {
    if (!value) {
      setAmountFormatted("1");
      setAmount(1);
      return;
    }
    setAmountFormatted(formatAmount(value, null, null, new Intl.NumberFormat()));
    setAmount(parseInt(value.replace(/,/g, "")));
  };

  const formatNumber = (value: number) => {
    return groupedNumberFormatterDyn.format(value).replace(".00", "");
  };

  const chartData = React.useMemo(() => {
    const years = [...Array(duration)].map((_, i) => i + 1);
    const APY = 0.09; // 9% annual yield

    return [
      {
        year: "0 years",
        staked: amount,
        unstaked: amount,
      },
      ...years.map((year) => ({
        year: `${year} year${year > 1 ? "s" : ""}`,
        staked: amount * Math.pow(1 + APY, year), // Compound interest formula: A = P(1 + r)^t
        unstaked: amount,
      })),
    ];
  }, [amount, duration]);

  return (
    <Card className="bg-transparent">
      <CardHeader>
        <CardTitle className="text-xl">
          Your <strong className="text-chartreuse">{formatNumber(amount)}</strong> SOL will grow to{" "}
          <strong className="text-chartreuse">{formatNumber(chartData[chartData.length - 1].staked)}</strong> SOL after{" "}
          {duration} years
        </CardTitle>
        <CardDescription className="sr-only">
          Calculate your potential yield by staking with mrgn validators and minting LST.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="year"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => value.slice(0, 3)}
            />
            <YAxis domain={[amount * 0.95, "auto"]} hide />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <defs>
              <linearGradient id="fillStaked" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-staked)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-staked)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillUnstaked" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--color-unstaked)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--color-unstaked)" stopOpacity={0.1} />
              </linearGradient>
            </defs>

            <Area
              dataKey="staked"
              type="natural"
              fill="url(#fillStaked)"
              fillOpacity={0.4}
              stroke="var(--color-staked)"
            />
            <Area
              dataKey="unstaked"
              type="natural"
              fill="url(#fillUnstaked)"
              fillOpacity={0.4}
              stroke="var(--color-unstaked)"
            />
          </AreaChart>
        </ChartContainer>
        <form className="flex text-left gap-4 pt-4">
          <div className="space-y-1 w-full">
            <Label className="text-muted-foreground">Amount to stake</Label>
            <Input
              type="text"
              inputMode="decimal"
              value={amountFormatted}
              onChange={(e) => handleAmountChange(e.target.value)}
              className="border-border"
            />
          </div>
          <div className="space-y-1 w-full">
            <Label className="text-muted-foreground">Stake duration</Label>
            <Select value={duration.toString()} onValueChange={(value) => setDuration(parseInt(value))}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[...Array(10)].map((_, i) => (
                  <SelectItem key={i + 1} value={(i + 1).toString()}>
                    {i + 1} years
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export { StakeCalculator };
