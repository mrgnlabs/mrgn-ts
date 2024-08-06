import React from "react";

import Image from "next/image";
import Link from "next/link";

import {
  usdFormatter,
  tokenPriceFormatter,
  percentFormatter,
  numeralFormatter,
  shortenAddress,
} from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { getTokenImageURL, cn } from "~/utils";
import { useTradeStore } from "~/store";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";
import { TooltipProvider, Tooltip, TooltipContent, TooltipTrigger } from "~/components/ui/tooltip";

import type { GroupData } from "~/store/tradeStore";

type PoolCardProps = {
  groupData: GroupData;
};

export const PoolCard = ({ groupData }: PoolCardProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2 justify-between">
            <Image
              src={getTokenImageURL(groupData.pool.token.info.state.mint.toBase58())}
              width={48}
              height={48}
              alt={groupData.pool.token.meta.tokenName}
              className="rounded-full border"
            />{" "}
            <div className="flex flex-col space-y-0.5">
              <h2>{groupData.pool.token.meta.tokenSymbol}</h2>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-muted-foreground text-sm">
                      {shortenAddress(groupData.pool.token.info.state.mint)}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{groupData.pool.token.info.state.mint.toBase58()}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
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
      <CardContent>
        {groupData.pool.token.tokenData && (
          <dl className="grid grid-cols-2 gap-1.5 text-sm text-muted-foreground w-full mt-2">
            <dt className="">Price</dt>
            <dd className="text-right text-primary tracking-wide">
              {groupData.pool.token.tokenData.price > 0.00001
                ? tokenPriceFormatter.format(groupData.pool.token.tokenData.price)
                : `$${groupData.pool.token.tokenData.price.toExponential(2)}`}
              {groupData.pool.token.tokenData.priceChange24hr && (
                <span
                  className={cn(
                    "text-xs ml-2",
                    groupData.pool.token.tokenData.priceChange24hr > 0 ? "text-mrgn-success" : "text-mrgn-error"
                  )}
                >
                  {groupData.pool.token.tokenData.priceChange24hr > 0 && "+"}
                  {percentFormatter.format(groupData.pool.token.tokenData.priceChange24hr / 100)}
                </span>
              )}
            </dd>
            <dt className="">24hr vol</dt>
            <dd className="text-right text-primary tracking-wide">
              ${numeralFormatter(groupData.pool.token.tokenData.volume24hr)}
              {groupData.pool.token.tokenData?.volumeChange24hr && (
                <span
                  className={cn(
                    "text-xs ml-2",
                    groupData.pool.token.tokenData.volumeChange24hr > 0 ? "text-mrgn-success" : "text-mrgn-error"
                  )}
                >
                  {groupData.pool.token.tokenData.volumeChange24hr > 0 && "+"}
                  {percentFormatter.format(groupData.pool.token.tokenData.volumeChange24hr / 100)}
                </span>
              )}
            </dd>
            <dt>Market cap</dt>
            <dd className="text-right text-primary tracking-wide">
              ${numeralFormatter(groupData.pool.token.tokenData.marketCap)}
            </dd>
            {groupData.pool.poolData && (
              <>
                <dt>Lending pool liquidity</dt>
                <dd className="text-right text-primary tracking-wide">
                  ${numeralFormatter(groupData.pool.poolData.totalLiquidity)}
                </dd>
              </>
            )}
          </dl>
        )}
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-3 w-full">
          <Link href={`/trade/${groupData.client.group.address.toBase58()}?side=long`} className="w-full">
            <Button variant="long" className="w-full">
              Long
            </Button>
          </Link>
          <Link href={`/trade/${groupData.client.group.address.toBase58()}?side=short`} className="w-full">
            <Button variant="short" className="w-full">
              Short
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
};
