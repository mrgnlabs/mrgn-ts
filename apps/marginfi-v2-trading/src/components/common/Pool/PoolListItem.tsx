import React from "react";

import Image from "next/image";
import Link from "next/link";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { tokenPriceFormatter, percentFormatter, usdFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";

import { useTradeStore } from "~/store";
import { getTokenImageURL, cn } from "~/utils";

import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

import { GroupData } from "~/store/tradeStore";

type PoolListItemProps = {
  groupData: GroupData;
  last?: boolean;
};

export const PoolListItem = ({ groupData, last }: PoolListItemProps) => {
  return (
    <div className={cn("grid grid-cols-7 py-2 w-full items-center", !last && "border-b pb-3 mb-2")}>
      <div className="flex items-center gap-2">
        <Image
          src={getTokenImageURL(groupData.pool.token.info.state.mint.toBase58())}
          alt={groupData.pool.token.meta.tokenSymbol}
          width={32}
          height={32}
          className="rounded-full bg-background"
        />
        <h2>{groupData.pool.token.meta.tokenSymbol}</h2>
      </div>
      {groupData.pool.token.tokenData && (
        <>
          <div>
            {tokenPriceFormatter(groupData.pool.token.tokenData.price)}{" "}
            <span
              className={cn(
                "text-xs ml-2",
                groupData.pool.token.tokenData.priceChange24hr > 0 ? "text-mrgn-success" : "text-mrgn-error"
              )}
            >
              {groupData.pool.token.tokenData.priceChange24hr > 0 && "+"}
              {percentFormatter.format(groupData.pool.token.tokenData.priceChange24hr / 100)}
            </span>
          </div>
          <div>
            ${numeralFormatter(groupData.pool.token.tokenData.volume24hr)}
            {groupData.pool.token.tokenData.volumeChange24hr && (
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
          </div>
          <div>${numeralFormatter(groupData.pool.token.tokenData.marketCap)}</div>
          <div>{groupData.pool.poolData && `$${numeralFormatter(groupData.pool.poolData.totalLiquidity)}`}</div>
        </>
      )}
      <div className="pl-5">
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
      <div className="flex items-center gap-2 justify-end">
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
    </div>
  );
};
