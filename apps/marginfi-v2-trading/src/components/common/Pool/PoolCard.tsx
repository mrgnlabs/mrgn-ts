import React from "react";

import Link from "next/link";
import Image from "next/image";

import { percentFormatter, shortenAddress, dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";
import { cn, useIsMobile } from "@mrgnlabs/mrgn-utils";
import { minidenticon } from "minidenticons";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

import { useTradeStoreV2 } from "~/store";
import { ArenaPoolSummary } from "~/types/trade-store.types";
import { mfiAddresses } from "~/utils/arenaUtils";

type PoolCardProps = {
  poolData: ArenaPoolSummary;
};

export const PoolCard = ({ poolData }: PoolCardProps) => {
  const [tokenDataByMint, groupsByGroupPk] = useTradeStoreV2((state) => [state.tokenDataByMint, state.groupsByGroupPk]);
  const isMobile = useIsMobile();

  const { tokenData, quoteTokenData } = React.useMemo(() => {
    const tokenData = tokenDataByMint[poolData.tokenSummary.mint.toBase58()];
    const quoteTokenData = tokenDataByMint[poolData.quoteSummary.mint.toBase58()];
    return { tokenData, quoteTokenData };
  }, [poolData, tokenDataByMint]);

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
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
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
              {groupData && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      {mfiCreated ? (
                        <Link href="https://x.com/marginfi" target="_blank">
                          <Image
                            src="https://pbs.twimg.com/profile_images/1791110026456633344/VGViq-CJ_400x400.jpg"
                            width={20}
                            height={20}
                            alt="marginfi"
                            className="rounded-full"
                          />
                        </Link>
                      ) : (
                        <div className="w-[20px] h-[20px] rounded-full object-cover bg-muted">
                          <Image
                            src={
                              "data:image/svg+xml;utf8," + encodeURIComponent(minidenticon(groupData.admin.toBase58()))
                            }
                            alt="minidenticon"
                            width={20}
                            height={20}
                            className="rounded-full"
                          />
                        </div>
                      )}
                    </TooltipTrigger>
                    <TooltipContent>
                      {mfiCreated ? (
                        <p>Pool created by marginfi</p>
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
        {tokenData && (
          <dl className="grid grid-cols-2 gap-1.5 text-sm text-muted-foreground w-full mt-2">
            <dt>Price</dt>
            <dd className="text-right text-primary tracking-wide">
              {dynamicNumeralFormatter(tokenData.price / quoteTokenData.price, {
                ignoreMinDisplay: true,
              })}
              {tokenData.priceChange24h && (
                <span
                  className={cn("text-xs ml-1", tokenData.priceChange24h > 0 ? "text-mrgn-success" : "text-mrgn-error")}
                >
                  {tokenData.priceChange24h > 0 && "+"}
                  {percentFormatter.format(tokenData.priceChange24h / 100)}
                </span>
              )}
            </dd>
            <dt className="">24hr vol</dt>
            <dd className="text-right text-primary tracking-wide">
              $
              {dynamicNumeralFormatter(tokenData.volume24h, {
                maxDisplay: 1000,
              })}
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
