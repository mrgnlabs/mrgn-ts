import React from "react";

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { useDebounce } from "@uidotdev/usehooks";

import { formatAmount } from "@mrgnlabs/mrgn-utils";
import { groupedNumberFormatterDyn, usdFormatter } from "@mrgnlabs/mrgn-common";

import { cn } from "@mrgnlabs/mrgn-utils";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "~/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Switch } from "~/components/ui/switch";

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

type StakeCalculatorProps = {
  solPrice: number;
  apy: number;
};

const StakeCalculator = ({ solPrice, apy = 8.5 }: StakeCalculatorProps) => {
  const [amount, setAmount] = React.useState(1000);
  const [amountFormatted, setAmountFormatted] = React.useState("1,000");
  const [duration, setDuration] = React.useState(5);
  const [pricePrediction, setPricePrediction] = React.useState(0);
  const [isUsdDenominated, setIsUsdDenominated] = React.useState(false);
  const debouncedAmount = useDebounce(amount, 500);
  const debouncedPricePrediction = useDebounce(pricePrediction, 500);
  const prevPricePredictionRef = React.useRef(debouncedPricePrediction);
  const isUserInputRef = React.useRef(false);

  const handlePricePredictionChange = (value: string) => {
    isUserInputRef.current = true;
    setPricePrediction(Number(value));
  };

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
    const APY = apy / 100;

    // calculate yearly price change rate to reach prediction
    const priceGrowthRate = Math.pow(debouncedPricePrediction / solPrice, 1 / duration) - 1;

    return [
      {
        year: "0 years",
        staked: Math.round(isUsdDenominated ? debouncedAmount * solPrice : debouncedAmount),
        unstaked: Math.round(isUsdDenominated ? debouncedAmount * solPrice : debouncedAmount),
      },
      ...years.map((year) => {
        // calculate interpolated price for this year
        const priceAtYear = solPrice * Math.pow(1 + priceGrowthRate, year);

        return {
          year: `${year} year${year > 1 ? "s" : ""}`,
          staked: Math.round(
            isUsdDenominated
              ? debouncedAmount * Math.pow(1 + APY, year) * priceAtYear
              : debouncedAmount * Math.pow(1 + APY, year)
          ),
          unstaked: Math.round(isUsdDenominated ? debouncedAmount * priceAtYear : debouncedAmount),
        };
      }),
    ];
  }, [debouncedAmount, duration, isUsdDenominated, debouncedPricePrediction, solPrice]);

  React.useEffect(() => {
    if (
      !isUsdDenominated &&
      debouncedPricePrediction &&
      prevPricePredictionRef.current !== debouncedPricePrediction &&
      isUserInputRef.current
    ) {
      setIsUsdDenominated(true);
    }
    prevPricePredictionRef.current = debouncedPricePrediction;
  }, [debouncedPricePrediction, isUsdDenominated]);

  // Reset the user input flag when the prop updates
  React.useEffect(() => {
    setPricePrediction(parseFloat(solPrice.toFixed(2)));
    isUserInputRef.current = false;
  }, [solPrice]);

  return (
    <Card className="bg-transparent">
      <CardHeader>
        <CardTitle className="flex flex-col gap-4 items-center text-xl">
          <div className="text-sm font-normal flex items-center gap-2">
            <Label
              onClick={() => setIsUsdDenominated(false)}
              className={cn(isUsdDenominated && "text-muted-foreground")}
            >
              SOL
            </Label>
            <Switch
              id="usd-denominated"
              checked={isUsdDenominated}
              onCheckedChange={setIsUsdDenominated}
              className="data-[state=checked]:bg-accent-highlight"
            />{" "}
            <Label
              onClick={() => setIsUsdDenominated(true)}
              className={cn(!isUsdDenominated && "text-muted-foreground")}
            >
              USD
            </Label>
          </div>
          <div>
            Your{" "}
            <strong className="text-chartreuse">
              {isUsdDenominated ? "$" : ""}
              {formatNumber(isUsdDenominated ? debouncedAmount * solPrice : debouncedAmount)}
            </strong>{" "}
            {!isUsdDenominated && "SOL"} will grow to{" "}
            <strong className="text-chartreuse">
              {isUsdDenominated ? "$" : ""}
              {formatNumber(chartData[chartData.length - 1].staked)}
            </strong>{" "}
            {!isUsdDenominated && "SOL"} after {duration} years
          </div>
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
            <YAxis
              domain={[
                isUsdDenominated ? debouncedAmount * debouncedPricePrediction * 0.95 : debouncedAmount * 0.95,
                "auto",
              ]}
              hide
            />
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
        <form className="flex flex-col md:flex-row text-left gap-4 pt-4">
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
          <div className="space-y-1 w-full">
            <Label className="text-muted-foreground">
              Price prediction <span className="text-xs">(${solPrice})</span>
            </Label>
            <div className="flex items-center gap-1">
              <span className="text-sm">$</span>
              <Input
                type="text"
                inputMode="decimal"
                value={pricePrediction.toString()}
                onChange={(e) => handlePricePredictionChange(e.target.value)}
                className="border-border px-1"
              />
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export { StakeCalculator };
