import React from "react";

import Image from "next/image";
import Link from "next/link";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { tokenPriceFormatter, percentFormatter, usdFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";

import { useTradeStoreV2 } from "~/store";

import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

import { ArenaPoolSummary } from "~/store/tradeStoreV2";

type PoolListItemProps = {
  poolData: ArenaPoolSummary;
  last?: boolean;
};

export const PoolListItem = ({ poolData, last }: PoolListItemProps) => {
  const [tokenDataByMint] = useTradeStoreV2((state) => [state.tokenDataByMint]);
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

  return (
    <div className={cn("grid grid-cols-7 py-2 w-full items-center", !last && "border-b pb-3 mb-2")}>
      <div className="flex items-center gap-2">
        <Image
          src={poolData.tokenSummary.tokenLogoUri}
          alt={poolData.tokenSummary.tokenSymbol}
          width={32}
          height={32}
          className="rounded-full bg-background"
        />
        <h2>{poolData.tokenSummary.tokenSymbol}</h2>
      </div>
      {tokenData && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex flex-col">
              {tokenPrice}
              {isLstQuote && (
                <span className="text-xs text-muted-foreground block">{tokenPriceFormatter(tokenData.price)} USD</span>
              )}
            </div>
            <span className={cn("text-xs", tokenData.priceChange24h > 0 ? "text-mrgn-success" : "text-mrgn-error")}>
              {!isLstQuote && (
                <>
                  {tokenData.priceChange24h > 0 && "+"}
                  {percentFormatter.format(tokenData.priceChange24h / 100)}
                </>
              )}
            </span>
          </div>
          <div>
            ${numeralFormatter(tokenData.volume24h)}
            {tokenData.volumeChange24h && (
              <span
                className={cn("text-xs ml-2", tokenData.volumeChange24h > 0 ? "text-mrgn-success" : "text-mrgn-error")}
              >
                {tokenData.volumeChange24h > 0 && "+"}
                {percentFormatter.format(tokenData.volumeChange24h / 100)}
              </span>
            )}
          </div>
          <div>${numeralFormatter(tokenData.marketcap)}</div>
          <div>
            {poolData.tokenSummary.bankData.totalDeposits &&
              `$${numeralFormatter(poolData.tokenSummary.bankData.availableLiquidity)}`}
          </div>
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
    </div>
  );
};
