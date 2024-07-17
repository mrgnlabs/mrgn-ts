import React from "react";

import Image from "next/image";

import { numeralFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { useTradeStore } from "~/store";
import { getTokenImageURL, cn } from "~/utils";

import { PoolChart } from "~/components/common/Pool";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

import type { TokenData } from "~/types";

export const PoolHeader = () => {
  const [activeGroup] = useTradeStore((state) => [state.activeGroup]);

  const [tokenData, setTokenData] = React.useState<TokenData | null>(null);

  const [priceData, setPriceData] = React.useState<
    {
      timestamp: number;
      label: string;
      price: number;
    }[]
  >([]);

  const chartData = React.useMemo(() => {
    const data = priceData.map((item) => ({
      time: item.label,
      desktop: item.price,
    }));
    return data;
  }, [priceData]);

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

    const fetchPriceData = async () => {
      const priceResponse = await fetch(
        `/api/birdeye/price-history?address=${activeGroup.token.info.state.mint.toBase58()}`
      );

      if (!priceResponse.ok) {
        console.error("Failed to fetch price data");
        return;
      }

      const priceData = await priceResponse.json();

      if (!priceData) {
        console.error("Failed to parse price data");
        return;
      }

      priceData.push({
        timestamp: Date.now(),
        label: "",
        price: activeGroup.token.info.oraclePrice.priceRealtime.price.toNumber(),
      });

      setPriceData(priceData);
    };

    fetchTokenData();
    fetchPriceData();
  }, [activeGroup]);

  if (!activeGroup) return null;

  return (
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
          <div className="px-6 lg:px-12 w-full">
            <PoolChart chartData={chartData} />
          </div>
        </div>
      </div>
      <div className="col-span-6">
        {tokenData && (
          <div className="grid grid-cols-2 w-full max-w-6xl mx-auto gap-4 md:gap-8 md:grid-cols-3">
            <StatBlock
              label="Current Price"
              value={
                tokenData.price > 0.01 ? usdFormatter.format(tokenData.price) : `$${tokenData.price.toExponential(2)}`
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
  );
};

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
