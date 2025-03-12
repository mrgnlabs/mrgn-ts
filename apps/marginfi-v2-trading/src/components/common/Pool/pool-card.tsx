import React from "react";

import Link from "next/link";
import Image from "next/image";

import { percentFormatter, shortenAddress, dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";
import { minidenticon } from "minidenticons";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

import { useTradeStoreV2 } from "~/store";
import { ArenaPoolSummary } from "~/types/trade-store.types";
import { mfiAddresses } from "~/utils/arenaUtils";
import { IconSwitchHorizontal } from "@tabler/icons-react";

type PoolCardProps = {
  poolData: ArenaPoolSummary;
};

export const PoolCard = ({ poolData }: PoolCardProps) => {
  const [tokenVolumeDataByMint, groupsByGroupPk] = useTradeStoreV2((state) => [
    state.tokenVolumeDataByMint,
    state.groupsByGroupPk,
  ]);

  const { tokenVolumeData, quoteTokenVolumeData } = React.useMemo(() => {
    const tokenVolumeData = tokenVolumeDataByMint[poolData.tokenSummary.mint.toBase58()];
    const quoteTokenVolumeData = tokenVolumeDataByMint[poolData.quoteSummary.mint.toBase58()];
    return { tokenVolumeData, quoteTokenVolumeData };
  }, [poolData, tokenVolumeDataByMint]);

  const isStableQuote = React.useMemo(() => {
    return 0.99 < quoteTokenVolumeData?.price && quoteTokenVolumeData?.price < 1.01;
  }, [quoteTokenVolumeData]);
  const [showUSDPrice, setShowUSDPrice] = React.useState(false);

  const tokenPrice = React.useMemo(() => {
    if (showUSDPrice) {
      return tokenVolumeData?.price;
    }
    return tokenVolumeData?.price / quoteTokenVolumeData?.price;
  }, [showUSDPrice, tokenVolumeData, quoteTokenVolumeData]);

  const tokenPriceChange = React.useMemo(() => {
    if (showUSDPrice) {
      return tokenVolumeData?.priceChange24h;
    }
    return tokenVolumeData?.priceChange24h - quoteTokenVolumeData?.priceChange24h;
  }, [showUSDPrice, tokenVolumeData, quoteTokenVolumeData]);

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

  const groupData = React.useMemo(
    () => groupsByGroupPk[poolData.groupPk.toBase58()],
    [groupsByGroupPk, poolData.groupPk]
  );

  const mfiCreated = React.useMemo(() => {
    if (!groupData) return false;
    return mfiAddresses.includes(groupData.admin.toBase58());
  }, [groupData]);

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
                className="rounded-full border h-[48px] w-[48px] object-cover"
              />{" "}
              <div className="flex flex-col space-y-0.5">
                <h2>{`${poolData.tokenSummary.tokenSymbol}/${poolData.quoteSummary.tokenSymbol}`}</h2>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="text-muted-foreground text-sm">{shortenAddress(poolData.groupPk)}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{poolData.groupPk.toBase58()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </Link>
            <div className="font-medium text-xs flex flex-col gap-1 items-center ml-auto self-start">
              {groupData && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="w-[20px] h-[20px] rounded-full object-cover bg-muted cursor-pointer">
                        {mfiCreated ? (
                          <Link href="https://x.com/marginfi" target="_blank">
                            <Image
                              src="https://storage.googleapis.com/mrgn-public/mrgn-icon-small.jpg"
                              width={20}
                              height={20}
                              alt="marginfi"
                              className="rounded-full"
                            />
                          </Link>
                        ) : (
                          <Link href={`https://solscan.io/address/${groupData.admin.toBase58()}`} target="_blank">
                            <Image
                              src={
                                "data:image/svg+xml;utf8," +
                                encodeURIComponent(minidenticon(groupData.admin.toBase58()))
                              }
                              alt="minidenticon"
                              width={20}
                              height={20}
                              className="rounded-full"
                            />
                          </Link>
                        )}
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {mfiCreated ? (
                        <p>
                          Pool created by{" "}
                          <Link
                            href="https://x.com/marginfi"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:no-underline"
                          >
                            marginfi
                          </Link>
                        </p>
                      ) : (
                        <p>
                          Pool created by{" "}
                          <Link
                            href={`https://solscan.io/address/${groupData.admin.toBase58()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:no-underline"
                          >
                            {shortenAddress(groupData.admin)}
                          </Link>
                        </p>
                      )}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 pb-6">
        {tokenVolumeData && (
          <dl className="grid grid-cols-2 gap-1.5 text-sm text-muted-foreground w-full mt-2">
            <dt>Price</dt>
            <dd
              className={`text-right text-primary tracking-wide flex items-center justify-end gap-1 ${
                !isStableQuote && "cursor-pointer"
              }`}
              onClick={() => !isStableQuote && setShowUSDPrice(!showUSDPrice)}
            >
              {dynamicNumeralFormatter(tokenPrice, {
                ignoreMinDisplay: true,
              })}{" "}
              {showUSDPrice ? "USD" : poolData.tokenSummary.tokenSymbol}
              {!isStableQuote && <IconSwitchHorizontal size={14} className="cursor-pointer" />}
              {tokenPriceChange && (
                <span className={cn("text-xs ml-1", tokenPriceChange > 0 ? "text-mrgn-green" : "text-mrgn-error")}>
                  {tokenPriceChange > 0 && "+"}
                  {percentFormatter.format(tokenPriceChange / 100)}
                </span>
              )}
            </dd>
            <dt className="">24hr vol</dt>
            <dd className="text-right text-primary tracking-wide">
              $
              {dynamicNumeralFormatter(tokenVolumeData.volume24h, {
                maxDisplay: 1000,
              })}
              {tokenVolumeData.volumeChange24h && (
                <span
                  className={cn(
                    "text-xs ml-2",
                    tokenVolumeData.volumeChange24h > 0 ? "text-mrgn-green" : "text-mrgn-error"
                  )}
                >
                  {tokenVolumeData.volumeChange24h > 0 && "+"}
                  {percentFormatter.format(tokenVolumeData.volumeChange24h / 100)}
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
                  {dynamicNumeralFormatter(
                    poolData.quoteSummary.bankData.totalDepositsUsd + poolData.tokenSummary.bankData.totalDepositsUsd,
                    {
                      maxDisplay: 1000,
                    }
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
