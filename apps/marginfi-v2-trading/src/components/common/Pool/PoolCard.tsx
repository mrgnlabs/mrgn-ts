import React from "react";

import Image from "next/image";
import Link from "next/link";

import { tokenPriceFormatter, percentFormatter, numeralFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";
import { cn, useIsMobile } from "@mrgnlabs/mrgn-utils";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

import { useTradeStoreV2 } from "~/store";
import { ArenaPoolSummary } from "~/types/trade-store.types";

type PoolCardProps = {
  poolData: ArenaPoolSummary;
};

export const PoolCard = ({ poolData }: PoolCardProps) => {
  const [tokenDataByMint] = useTradeStoreV2((state) => [state.tokenDataByMint]);
  const isMobile = useIsMobile();
  const isLstQuote = React.useMemo(() => {
    return poolData.quoteSummary.tokenSymbol === "LST";
  }, [poolData]);

  const { tokenData, quoteTokenData } = React.useMemo(() => {
    const tokenData = tokenDataByMint[poolData.tokenSummary.mint.toBase58()];
    const quoteTokenData = tokenDataByMint[poolData.quoteSummary.mint.toBase58()];
    return { tokenData, quoteTokenData };
  }, [poolData, tokenDataByMint]);

  const tokenPrice = React.useMemo(() => {
    if (isLstQuote) {
      const lstPrice = quoteTokenData.price;
      return `${tokenPriceFormatter(tokenData.price / lstPrice, "decimal")} ${poolData.quoteSummary.tokenSymbol}`;
    }
    return tokenPriceFormatter(tokenData.price);
  }, [isLstQuote, tokenData.price, quoteTokenData.price, poolData.quoteSummary.tokenSymbol]);

  const fundingRate = React.useMemo(() => {
    const fundingRateShort =
      (poolData.tokenSummary.bankData.borrowRate - poolData.quoteSummary.bankData.depositRate) / 100;
    const fundingRateLong =
      (poolData.quoteSummary.bankData.borrowRate - poolData.tokenSummary.bankData.depositRate) / 100;
    return `${percentFormatter.format(fundingRateLong)} / ${percentFormatter.format(fundingRateShort)}`;
  }, [
    poolData.tokenSummary.bankData.borrowRate,
    poolData.tokenSummary.bankData.depositRate,
    poolData.quoteSummary.bankData.depositRate,
    poolData.quoteSummary.bankData.borrowRate,
  ]);

  return (
    <Card>
      <CardHeader className="md:pb-0">
        <CardTitle>
          <div className="flex items-center gap-2 justify-between">
            <Link
              href={`/trade/${poolData.groupPk.toBase58()}`}
              className="flex items-center gap-2 justify-between cursor-pointer"
            >
              <Image
                src={poolData.tokenSummary.tokenLogoUri}
                width={48}
                height={48}
                alt={poolData.tokenSummary.tokenName}
                className="rounded-full border"
              />{" "}
              <div className="flex flex-col space-y-0.5">
                <h2>{`${poolData.tokenSummary.tokenSymbol}/${poolData.quoteSummary.tokenSymbol}`}</h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-muted-foreground text-sm">
                        {shortenAddress(poolData.tokenSummary.mint)}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{poolData.tokenSummary.mint.toBase58()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </Link>
            <div className="font-medium text-xs flex flex-col gap-1 items-center ml-auto self-start">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Link href="https://x.com/marginfi" target="_blank">
                      <Image
                        src="https://pbs.twimg.com/profile_images/1791110026456633344/VGViq-CJ_400x400.jpg"
                        width={20}
                        height={20}
                        alt="marginfi"
                        className="rounded-full"
                      />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Pool created by marginfi</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 pb-6">
        {tokenData && (
          <dl className="grid grid-cols-2 gap-1.5 text-sm text-muted-foreground w-full mt-2">
            <dt>Price</dt>
            <dd className="text-right text-primary tracking-wide">
              {tokenPrice}
              {isLstQuote ? (
                <>
                  {isMobile ? (
                    <span className="text-xs ml-1 text-muted-foreground block">
                      {tokenPriceFormatter(tokenData.price)} USD
                    </span>
                  ) : (
                    <span className="text-xs ml-1 text-muted-foreground">({tokenPriceFormatter(tokenData.price)})</span>
                  )}
                </>
              ) : (
                tokenData.priceChange24h && (
                  <span
                    className={cn(
                      "text-xs ml-2",
                      tokenData.priceChange24h > 0 ? "text-mrgn-success" : "text-mrgn-error"
                    )}
                  >
                    {tokenData.priceChange24h > 0 && "+"}
                    {percentFormatter.format(tokenData.priceChange24h / 100)}
                  </span>
                )
              )}
            </dd>
            <dt className="">24hr vol</dt>
            <dd className="text-right text-primary tracking-wide">
              ${numeralFormatter(tokenData.volume24h)}
              {tokenData.volumeChange24h && (
                <span
                  className={cn(
                    "text-xs ml-2",
                    tokenData.volumeChange24h > 0 ? "text-mrgn-success" : "text-mrgn-error"
                  )}
                >
                  {tokenData.volumeChange24h > 0 && "+"}
                  {percentFormatter.format(tokenData.volumeChange24h / 100)}
                </span>
              )}
            </dd>
            <dt>Funding rate (long/short)</dt>
            <dd className="text-right text-primary tracking-wide">{fundingRate}</dd>
            {poolData.tokenSummary.bankData && (
              <>
                <dt>Pool liquidity</dt>
                <dd className="text-right text-primary tracking-wide">
                  $
                  {numeralFormatter(
                    poolData.quoteSummary.bankData.totalDepositsUsd + poolData.tokenSummary.bankData.totalDepositsUsd
                  )}
                </dd>
              </>
            )}
          </dl>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-3 w-full">
          <Link href={`/trade/${poolData.groupPk.toBase58()}?side=long`} className="w-full">
            <Button variant="long" className="w-full">
              Long
            </Button>
          </Link>
          <Link href={`/trade/${poolData.groupPk.toBase58()}?side=short`} className="w-full">
            <Button variant="short" className="w-full">
              Short
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
};
