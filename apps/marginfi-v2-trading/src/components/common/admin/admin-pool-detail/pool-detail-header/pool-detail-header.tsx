import React from "react";

import Image from "next/image";
import Link from "next/link";

import { percentFormatter, numeralFormatter, tokenPriceFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";
import { IconExternalLink } from "@tabler/icons-react";

import { GroupData } from "~/store/tradeStore";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

type AdminPoolDetailHeaderProps = {
  activeGroup: GroupData;
};

export const AdminPoolDetailHeader = ({ activeGroup }: AdminPoolDetailHeaderProps) => {
  return (
    <div className="px-4 pb-10 lg:px-8 lg:py-10 lg:bg-background lg:border lg:rounded-xl">
      <div className="flex flex-col lg:flex-row items-center justify-between gap-8">
        <div className="flex flex-row items-center justify-center gap-4 px-8 w-full lg:w-1/4 xl:w-1/2">
          <Image
            src={activeGroup.pool.token.meta.tokenLogoUri}
            alt={activeGroup.pool.token.meta.tokenSymbol}
            width={72}
            height={72}
            className="bg-background border rounded-full"
          />
          <div className="flex flex-col items-left">
            <h1 className="text-lg font-medium  flex items-center py-1 ">{activeGroup.pool.token.meta.tokenName}</h1>
            <p className="text-sm text-muted-foreground lg:mt-0">{activeGroup.pool.token.meta.tokenSymbol}</p>
            <p className="text-sm text-muted-foreground">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Link
                      href={`https://solscan.io/token/${activeGroup.pool.token.info.state.mint.toBase58()}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary text-xs flex items-center gap-1"
                    >
                      {shortenAddress(activeGroup.pool.token.info.state.mint.toBase58())}
                      <IconExternalLink size={12} />
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{activeGroup.pool.token.info.state.mint.toBase58()}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </p>
          </div>
        </div>
        <div className="w-full space-y-10">
          {activeGroup.pool.token.tokenData && (
            <div className="grid w-full max-w-md mx-auto gap-1 lg:gap-16 lg:max-w-none lg:grid-cols-3">
              <div className="grid grid-cols-2 lg:block">
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="text-sm text-right lg:text-left lg:text-2xl">
                  {tokenPriceFormatter(activeGroup.pool.token.info.oraclePrice.priceRealtime.price.toNumber())}
                  <span
                    className={cn(
                      "text-sm ml-1",
                      activeGroup.pool.token.tokenData.priceChange24hr > 0 ? "text-mrgn-success" : "text-mrgn-error"
                    )}
                  >
                    {activeGroup.pool.token.tokenData.priceChange24hr > 0 && "+"}
                    {percentFormatter.format(activeGroup.pool.token.tokenData.priceChange24hr / 100)}
                  </span>
                </p>
              </div>
              <div className="grid grid-cols-2 lg:block">
                <p className="text-sm text-muted-foreground">24hr Volume</p>
                <p className="text-sm text-right lg:text-left lg:text-2xl">
                  ${numeralFormatter(activeGroup.pool.token.tokenData.volume24hr)}
                  <span
                    className={cn(
                      "text-sm ml-1",
                      activeGroup.pool.token.tokenData.volumeChange24hr > 0 ? "text-mrgn-success" : "text-mrgn-error"
                    )}
                  >
                    {activeGroup.pool.token.tokenData.volumeChange24hr > 0 && "+"}
                    {percentFormatter.format(activeGroup.pool.token.tokenData.volumeChange24hr / 100)}
                  </span>
                </p>
              </div>
              <div className="grid grid-cols-2 lg:block">
                <p className="text-sm text-muted-foreground">Market cap</p>
                <p className="text-sm text-right lg:text-left lg:text-2xl">
                  ${numeralFormatter(activeGroup.pool.token.tokenData.marketCap)}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
