import React from "react";

import Image from "next/image";
import Link from "next/link";

import { IconExternalLink } from "@tabler/icons-react";

import { numeralFormatter, tokenPriceFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { useTradeStore } from "~/store";
import { getTokenImageURL, cn } from "~/utils";

import { PoolChart } from "~/components/common/Pool";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";

import type { GroupData } from "~/store/tradeStore";

type PoolHeaderProps = {
  groupData: GroupData;
};

export const PoolHeader = ({ groupData }: PoolHeaderProps) => {
  const [activeGroupPk, groupMap] = useTradeStore((state) => [state.activeGroup, state.groupMap]);

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
    if (!groupData) return;

    const fetchPriceData = async () => {
      const priceResponse = await fetch(
        `/api/birdeye/price-history?address=${groupData.pool.token.info.state.mint.toBase58()}`
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
        price: groupData.pool.token.info.oraclePrice.priceRealtime.price.toNumber(),
      });

      setPriceData(priceData);
    };

    fetchPriceData();
  }, [groupData]);

  if (!groupData) return null;

  return (
    <div className="space-y-8 grid-cols-9 w-full max-w-6xl mx-auto md:grid md:space-y-0">
      <div className="col-span-3">
        <div className="h-full flex flex-col justify-center text-center items-center gap-2">
          <Image
            src={getTokenImageURL(groupData.pool.token.info.state.mint.toBase58())}
            width={72}
            height={72}
            className="rounded-full border"
            alt={groupData.pool.token.meta.tokenName}
          />
          <div className="space-y-2">
            <div className="space-y-0">
              <h1 className="text-2xl font-medium">{groupData.pool.token.meta.tokenName}</h1>
              <h2 className="text-xl text-muted-foreground">{groupData.pool.token.meta.tokenSymbol}</h2>
            </div>
            <Link className="inline-block" href={`/trade/${groupData.pool.token.address.toBase58()}`}>
              <Button variant="outline" size="sm" className="h-8">
                <IconExternalLink size={16} />
                Trade {groupData.pool.token.meta.tokenSymbol}
              </Button>
            </Link>
          </div>
          <div className="px-6 lg:px-12 w-full">
            <PoolChart chartData={chartData} />
          </div>
        </div>
      </div>
      <div className="col-span-6">
        {groupData.pool.token.tokenData && (
          <div className="grid grid-cols-2 w-full max-w-6xl mx-auto gap-4 md:gap-8 md:grid-cols-3">
            <StatBlock
              label="Current Price"
              value={
                groupData.pool.token.tokenData.price > 0.00001
                  ? tokenPriceFormatter.format(groupData.pool.token.tokenData.price)
                  : `$${groupData.pool.token.tokenData.price.toExponential(2)}`
              }
              subValue={
                <span
                  className={cn(
                    groupData.pool.token.tokenData.priceChange24hr > 0 ? "text-mrgn-success" : "text-mrgn-error"
                  )}
                >
                  {groupData.pool.token.tokenData.priceChange24hr > 0 && "+"}
                  {percentFormatter.format(groupData.pool.token.tokenData.priceChange24hr / 100)}
                </span>
              }
            />
            <StatBlock
              label="24hr vol"
              value={`$${numeralFormatter(groupData.pool.token.tokenData.volume24hr)}`}
              subValue={
                <span
                  className={cn(
                    groupData.pool.token.tokenData.volumeChange24hr > 0 ? "text-mrgn-success" : "text-mrgn-error"
                  )}
                >
                  {groupData.pool.token.tokenData.volumeChange24hr > 0 && "+"}
                  {percentFormatter.format(groupData.pool.token.tokenData.volumeChange24hr / 100)}
                </span>
              }
            />
            <StatBlock label="Market cap" value={`$${numeralFormatter(groupData.pool.token.tokenData.marketCap)}`} />

            <StatBlock
              label={
                <div className="flex items-center gap-2">
                  <Image
                    src={getTokenImageURL(groupData.pool.token.info.state.mint.toBase58())}
                    alt={groupData.pool.token.meta.tokenName}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  Total Deposits
                  <br />({groupData.pool.token.meta.tokenSymbol})
                </div>
              }
              value={numeralFormatter(groupData.pool.token.info.state.totalDeposits)}
              subValue={usdFormatter.format(
                groupData.pool.token.info.state.totalDeposits *
                  groupData.pool.token.info.oraclePrice.priceRealtime.price.toNumber()
              )}
            />
            <StatBlock
              label={
                <div className="flex items-center gap-2">
                  <Image
                    src={getTokenImageURL(groupData.pool.quoteTokens[0].info.state.mint.toBase58())}
                    alt={groupData.pool.quoteTokens[0].meta.tokenName}
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                  Total Deposits
                  <br />
                  (USDC)
                </div>
              }
              value={numeralFormatter(groupData.pool.quoteTokens[0].info.state.totalDeposits)}
              subValue={usdFormatter.format(
                groupData.pool.quoteTokens[0].info.state.totalDeposits *
                  groupData.pool.quoteTokens[0].info.oraclePrice.priceRealtime.price.toNumber()
              )}
            />
            {groupData.pool.poolData?.totalLiquidity && (
              <StatBlock
                label={
                  <div className="flex items-center">
                    <div className="flex items-center">
                      <Image
                        src={getTokenImageURL(groupData.pool.token.info.state.mint.toBase58())}
                        alt={groupData.pool.token.meta.tokenName}
                        width={24}
                        height={24}
                        className="rounded-full z-20"
                      />
                      <Image
                        src={getTokenImageURL(groupData.pool.quoteTokens[0].info.state.mint.toBase58())}
                        alt={groupData.pool.quoteTokens[0].meta.tokenName}
                        width={24}
                        height={24}
                        className="rounded-full -translate-x-2.5 z-10"
                      />
                    </div>
                    Total Liquidity
                    <br />({groupData.pool.token.meta.tokenSymbol} + USDC)
                  </div>
                }
                value={usdFormatter.format(groupData.pool.poolData.totalLiquidity)}
              />
            )}
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
        {value} {subValue && <span className="text-base text-muted-foreground">{subValue}</span>}
      </p>
    </CardContent>
  </Card>
);
