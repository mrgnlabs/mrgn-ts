import React from "react";

import Image from "next/image";
import Link from "next/link";

import { numeralFormatter, tokenPriceFormatter, percentFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import type { GroupData } from "~/store/tradeStore";
import { Button } from "~/components/ui/button";
import { IconExternalLink } from "@tabler/icons-react";

type AdminPoolCardProps = {
  groupData: GroupData;
  last?: boolean;
};

export const AdminPoolCard = ({ groupData, last }: AdminPoolCardProps) => {
  return (
    <div className={cn("grid grid-cols-7 py-2 w-full items-center", !last && "border-b pb-3 mb-2")}>
      <div className="flex items-center gap-2">
        <Image
          src={groupData.pool.token.meta.tokenLogoUri}
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
            {tokenPriceFormatter(groupData.pool.token.info.oraclePrice.priceRealtime.price.toNumber())}{" "}
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
        <Link
          href={`https://solscan.io/account/${groupData.client.group.admin}`}
          className="flex items-center gap-1.5"
          target="_blank"
          rel="noopener noreferrer"
        >
          {shortenAddress(groupData.client.group.admin || "")}{" "}
          <IconExternalLink size={15} className="-translate-y-[1px]" />
        </Link>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <Link href={`/admin/${groupData.client.group.address.toBase58()}`} className="w-full">
          <Button variant="default" className="w-full">
            Details
          </Button>
        </Link>
      </div>
    </div>
  );
};
