import React from "react";
import { IconExternalLink } from "@tabler/icons-react";
import Link from "next/link";
import Image from "next/image";

import { percentFormatter, numeralFormatter, tokenPriceFormatter, shortenAddress } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";

import { PoolShare } from "~/components/common/Pool/PoolShare";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

import { useExtendedPool } from "~/hooks/useExtendedPools";
import { ArenaPoolV2 } from "~/types/trade-store.types";

type AdminPoolDetailHeaderProps = {
  activePool: ArenaPoolV2;
};

export const AdminPoolDetailHeader = ({ activePool }: AdminPoolDetailHeaderProps) => {
  const extendedPool = useExtendedPool(activePool);

  const fundingRate = React.useMemo(() => {
    const fundingRateShort =
      extendedPool.tokenBank.info.state.borrowingRate - extendedPool.quoteBank.info.state.lendingRate;
    const fundingRateLong =
      extendedPool.quoteBank.info.state.borrowingRate - extendedPool.tokenBank.info.state.lendingRate;
    return `${percentFormatter.format(fundingRateLong)} / ${percentFormatter.format(fundingRateShort)}`;
  }, [
    extendedPool.tokenBank.info.state.borrowingRate,
    extendedPool.tokenBank.info.state.lendingRate,
    extendedPool.quoteBank.info.state.borrowingRate,
    extendedPool.quoteBank.info.state.lendingRate,
  ]);

  return (
    <div className="px-4 pb-10 lg:px-8 lg:py-10 lg:bg-background lg:border lg:rounded-xl">
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-8">
        <div className="flex flex-col items-center justify-center gap-1 px-8">
          <div className="flex items-center justify-center gap-4">
            <Image
              src={extendedPool.tokenBank.meta.tokenLogoUri}
              alt={extendedPool.tokenBank.meta.tokenSymbol}
              width={72}
              height={72}
              className="bg-background border rounded-full"
            />
            <div className="flex flex-col items-left">
              <h1 className="text-lg font-medium flex items-center">{extendedPool.tokenBank.meta.tokenName}</h1>
              <p className="text-sm text-muted-foreground lg:mt-0">{extendedPool.tokenBank.meta.tokenSymbol}</p>
              <p className="text-sm text-muted-foreground">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Link
                        href={`https://solscan.io/token/${extendedPool.tokenBank.info.state.mint.toBase58()}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary text-xs flex items-center gap-1"
                      >
                        {shortenAddress(extendedPool.tokenBank.info.state.mint.toBase58())}
                        <IconExternalLink size={12} />
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{extendedPool.tokenBank.info.state.mint.toBase58()}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </p>
            </div>
          </div>
          <PoolShare activePool={activePool} />
        </div>
        <div className="space-y-10 lg:ml-auto">
          {extendedPool.tokenBank.tokenData && (
            <div className="grid w-full gap-1 lg:gap-8 lg:max-w-none lg:grid-cols-3">
              <div className="grid grid-cols-2 lg:block bg-muted/50 rounded-lg px-4 py-2.5 space-y-1">
                <p className="text-sm text-muted-foreground">Price</p>
                <p className="text-sm text-right lg:text-left lg:text-2xl">
                  {tokenPriceFormatter(extendedPool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber())}
                  <span
                    className={cn(
                      "text-sm ml-1",
                      extendedPool.tokenBank.tokenData.priceChange24hr > 0 ? "text-mrgn-green" : "text-mrgn-error"
                    )}
                  >
                    {extendedPool.tokenBank.tokenData.priceChange24hr > 0 && "+"}
                    {percentFormatter.format(extendedPool.tokenBank.tokenData.priceChange24hr / 100)}
                  </span>
                </p>
              </div>
              <div className="grid grid-cols-2 lg:block bg-muted/50 rounded-lg px-4 py-2.5 space-y-1">
                <p className="text-sm text-muted-foreground">24hr Volume</p>
                <p className="text-sm text-right lg:text-left lg:text-2xl">
                  ${numeralFormatter(extendedPool.tokenBank.tokenData.volume24hr)}
                  <span
                    className={cn(
                      "text-sm ml-1",
                      extendedPool.tokenBank.tokenData.volumeChange24hr > 0 ? "text-mrgn-green" : "text-mrgn-error"
                    )}
                  >
                    {extendedPool.tokenBank.tokenData.volumeChange24hr > 0 && "+"}
                    {percentFormatter.format(extendedPool.tokenBank.tokenData.volumeChange24hr / 100)}
                  </span>
                </p>
              </div>
              {/* <div className="grid grid-cols-2 lg:block">
                <p className="text-sm text-muted-foreground">Market cap</p>
                <p className="text-sm text-right lg:text-left lg:text-2xl">
                  ${numeralFormatter(extendedPool.tokenBank.tokenData.marketCap)}
                </p>
              </div> */}
              <div className="grid grid-cols-2 lg:block bg-muted/50 rounded-lg px-4 py-2.5 space-y-1">
                <p className="text-sm text-muted-foreground">Funding rate (long/short)</p>
                <p className="text-sm text-right lg:text-left lg:text-2xl">{fundingRate}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
