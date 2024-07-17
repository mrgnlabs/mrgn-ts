import React from "react";

import Image from "next/image";

import { IconInfoCircle } from "@tabler/icons-react";
import { numeralFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { useTradeStore, useUiStore } from "~/store";
import { getTokenImageURL, cn } from "~/utils";

import { BankCard } from "~/components/common/Pool";
import { ActionComplete } from "~/components/common/ActionComplete";
import { Loader } from "~/components/ui/loader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "~/components/ui/chart";

import type { TokenData } from "~/types";

const chartData = [
  { month: "January", desktop: 186 },
  { month: "February", desktop: 305 },
  { month: "March", desktop: 237 },
  { month: "April", desktop: 73 },
  { month: "May", desktop: 209 },
  { month: "June", desktop: 214 },
];

const chartConfig = {
  desktop: {
    label: "Desktop",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function TradeSymbolPage() {
  const [initialized, activeGroup, accountSummary] = useTradeStore((state) => [
    state.initialized,
    state.activeGroup,
    state.accountSummary,
  ]);
  const [previousTxn] = useUiStore((state) => [state.previousTxn]);
  const [tokenData, setTokenData] = React.useState<TokenData | null>(null);

  const healthColor = React.useMemo(() => {
    if (accountSummary.healthFactor) {
      let color: string;

      if (accountSummary.healthFactor >= 0.5) {
        color = "#75BA80"; // green color " : "#",
      } else if (accountSummary.healthFactor >= 0.25) {
        color = "#B8B45F"; // yellow color
      } else {
        color = "#CF6F6F"; // red color
      }

      return color;
    } else {
      return "#fff";
    }
  }, [accountSummary.healthFactor]);

  React.useEffect(() => {
    if (!activeGroup) return;

    const fetchTokenData = async () => {
      const tokenResponse = await fetch(`/api/birdeye/token?address=${activeGroup.token.info.state.mint.toBase58()}`);

      if (!tokenResponse.ok) {
        console.error("Failed to fetch token data");
        return;
      }

      const tokenData = await tokenResponse.json();

      if (!tokenData) {
        console.error("Failed to parse token data");
        return;
      }

      setTokenData(tokenData);
    };

    fetchTokenData();
  }, [activeGroup]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 pt-12 z-10">
        {(!initialized || !activeGroup) && <Loader label="Loading mrgntrade..." className="mt-8" />}
        {initialized && activeGroup && activeGroup.token && (
          <div className="flex flex-col items-start gap-8 pb-16 w-full">
            <div className="space-y-8 grid-cols-9 w-full max-w-6xl mx-auto md:grid md:space-y-0">
              <div className="col-span-3">
                <div className="h-full flex flex-col justify-center text-center items-center gap-3">
                  <Image
                    src={getTokenImageURL(activeGroup.token.meta.tokenSymbol)}
                    width={72}
                    height={72}
                    className="rounded-full border"
                    alt={activeGroup.token.meta.tokenName}
                  />
                  <div className="space-y-0.5">
                    <h1 className="text-2xl font-medium">{activeGroup.token.meta.tokenName}</h1>
                    <h2 className="text-xl text-muted-foreground">{activeGroup.token.meta.tokenSymbol}</h2>
                  </div>
                  <div className="px-12 w-full">
                    <ChartContainer config={chartConfig} className="h-[100px] w-full mt-2">
                      <AreaChart accessibilityLayer data={chartData}>
                        <defs>
                          <linearGradient id="fill" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#75ba80" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#75ba80" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <Area dataKey="desktop" type="natural" fill="url(#fill)" fillOpacity={0.4} stroke="#75ba80" />
                      </AreaChart>
                    </ChartContainer>
                  </div>
                </div>
              </div>
              <div className="col-span-6">
                {tokenData && (
                  <div className="grid grid-cols-2 w-full max-w-6xl mx-auto gap-4 md:gap-8 md:grid-cols-3">
                    <StatBlock
                      label="Current Price"
                      value={
                        tokenData.price > 0.01
                          ? usdFormatter.format(tokenData.price)
                          : `$${tokenData.price.toExponential(2)}`
                      }
                      subValue={
                        <span className={cn(tokenData.priceChange24h > 0 ? "text-mrgn-success" : "text-mrgn-error")}>
                          {tokenData.priceChange24h > 0 && "+"}
                          {percentFormatter.format(tokenData.priceChange24h / 100)}
                        </span>
                      }
                    />
                    <StatBlock label="Market cap" value={`$${numeralFormatter(tokenData.marketCap)}`} />
                    <StatBlock
                      label="24hr vol"
                      value={`$${numeralFormatter(tokenData.volume24h)}`}
                      subValue={
                        <span className={cn(tokenData.volumeChange24h > 0 ? "text-mrgn-success" : "text-mrgn-error")}>
                          {tokenData.volumeChange24h > 0 && "+"}
                          {percentFormatter.format(tokenData.volumeChange24h / 100)}
                        </span>
                      }
                    />
                    <StatBlock
                      label={
                        <div className="flex items-center gap-2">
                          <Image
                            src={getTokenImageURL(activeGroup.token.meta.tokenSymbol)}
                            alt={activeGroup.token.meta.tokenName}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                          Total Deposits
                          <br />({activeGroup.token.meta.tokenSymbol})
                        </div>
                      }
                      value={numeralFormatter(activeGroup.token.info.state.totalDeposits)}
                      subValue={usdFormatter.format(
                        activeGroup.token.info.state.totalDeposits *
                          activeGroup.token.info.oraclePrice.priceRealtime.price.toNumber()
                      )}
                    />
                    <StatBlock
                      label={
                        <div className="flex items-center gap-2">
                          <Image
                            src={getTokenImageURL(activeGroup.usdc.meta.tokenSymbol)}
                            alt={activeGroup.usdc.meta.tokenName}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                          Total Deposits
                          <br />
                          (USDC)
                        </div>
                      }
                      value={numeralFormatter(activeGroup.usdc.info.state.totalDeposits)}
                      subValue={usdFormatter.format(
                        activeGroup.usdc.info.state.totalDeposits *
                          activeGroup.usdc.info.oraclePrice.priceRealtime.price.toNumber()
                      )}
                    />
                    <StatBlock
                      label={
                        <div className="flex items-center">
                          <div className="flex items-center">
                            <Image
                              src={getTokenImageURL(activeGroup.token.meta.tokenSymbol)}
                              alt={activeGroup.token.meta.tokenName}
                              width={24}
                              height={24}
                              className="rounded-full z-20"
                            />
                            <Image
                              src={getTokenImageURL(activeGroup.usdc.meta.tokenSymbol)}
                              alt={activeGroup.token.meta.tokenName}
                              width={24}
                              height={24}
                              className="rounded-full -translate-x-2.5 z-10"
                            />
                          </div>
                          Total Liquidity
                          <br />({activeGroup.token.meta.tokenSymbol} + USDC)
                        </div>
                      }
                      value={usdFormatter.format(
                        activeGroup.usdc.info.state.totalDeposits *
                          activeGroup.usdc.info.oraclePrice.priceRealtime.price.toNumber() +
                          activeGroup.token.info.state.totalDeposits *
                            activeGroup.token.info.oraclePrice.priceRealtime.price.toNumber()
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="bg-background/80 backdrop-blur-sm border shadow-sm p-6 rounded-xl w-full max-w-6xl mx-auto">
              <h2 className="font-medium text-2xl mb-4">Your position</h2>
              <dl className="flex justify-between items-center gap-2">
                <dt className="flex items-center gap-1.5 text-sm">
                  Lend/borrow health factor
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconInfoCircle size={16} />
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <div className="flex flex-col gap-2 pb-2">
                          <p>
                            Health factor is based off <b>price biased</b> and <b>weighted</b> asset and liability
                            values.
                          </p>
                          <div className="font-medium">
                            When your account health reaches 0% or below, you are exposed to liquidation.
                          </div>
                          <p>The formula is:</p>
                          <p className="text-sm italic text-center">{"(assets - liabilities) / (assets)"}</p>
                          <p>Your math is:</p>
                          <p className="text-sm italic text-center">{`(${usdFormatter.format(
                            accountSummary.lendingAmountWithBiasAndWeighted
                          )} - ${usdFormatter.format(
                            accountSummary.borrowingAmountWithBiasAndWeighted
                          )}) / (${usdFormatter.format(accountSummary.lendingAmountWithBiasAndWeighted)})`}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </dt>
                <dd className="text-xl md:text-2xl font-medium" style={{ color: healthColor }}>
                  {numeralFormatter(accountSummary.healthFactor * 100)}%
                </dd>
              </dl>
              <div className="h-2 bg-background-gray-light rounded-full">
                <div
                  className="h-2 rounded-full"
                  style={{
                    backgroundColor: healthColor,
                    width: `${accountSummary.healthFactor * 100}%`,
                  }}
                />
              </div>

              <div className="grid grid-cols-1 gap-4 w-full mx-auto mt-8 md:grid-cols-2 md:gap-8">
                <BankCard bank={activeGroup.token} />
                <BankCard bank={activeGroup.usdc} />
              </div>
            </div>
          </div>
        )}
      </div>
      {initialized && previousTxn && <ActionComplete />}
    </>
  );
}

type StatProps = {
  label: JSX.Element | string;
  value: JSX.Element | string;
  subValue?: JSX.Element | string;
};

const StatBlock = ({ label, value, subValue }: StatProps) => (
  <Card>
    <CardHeader className="pb-2 px-4">
      <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
    </CardHeader>
    <CardContent className="px-4">
      <p className="text-3xl">
        {value} {subValue && <span className="text-lg text-muted-foreground">{subValue}</span>}
      </p>
    </CardContent>
  </Card>
);
