import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  usdFormatter,
  tokenPriceFormatter,
  percentFormatter,
  numeralFormatter,
  shortenAddress,
} from "@mrgnlabs/mrgn-common";

import { cn } from "~/utils";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

import type { GroupData } from "~/store/tradeStore";

type TVWidgetTopBarProps = {
  groupData: GroupData;
};

export const TVWidgetTopBar = ({ groupData }: TVWidgetTopBarProps) => {
  return (
    <dl className="hidden items-center gap-2 text-sm w-full lg:flex">
      <dt className="text-muted-foreground">Mint address</dt>
      <dd className="flex items-center gap-1">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <span>{shortenAddress(groupData.pool.token.info.state.mint)}</span>
            </TooltipTrigger>
            <TooltipContent>
              <p>{groupData.pool.token.info.state.mint.toBase58()}</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </dd>
      {groupData.pool.token.tokenData && (
        <>
          <dt className="border-primary/50 text-muted-foreground lg:border-l lg:ml-4 lg:pl-4">Price</dt>
          <dd className="flex items-center gap-1">
            {groupData.pool.token.info.oraclePrice.priceRealtime.price.toNumber() > 0.00001
              ? tokenPriceFormatter.format(groupData.pool.token.info.oraclePrice.priceRealtime.price.toNumber())
              : `$${groupData.pool.token.info.oraclePrice.priceRealtime.price.toExponential(2)}`}
            <span
              className={cn(
                "flex items-center gap-1",
                groupData.pool.token.tokenData.priceChange24hr > 1 ? "text-mrgn-success" : "text-mrgn-error"
              )}
            >
              {groupData.pool.token.tokenData.priceChange24hr > 1 && "+"}
              {percentFormatter.format(groupData.pool.token.tokenData.priceChange24hr / 100)}
            </span>
          </dd>
          <dt className="border-primary/50 text-muted-foreground lg:border-l lg:ml-4 lg:pl-4">Market cap</dt>
          <dd className="flex items-center gap-1">${numeralFormatter(groupData.pool.token.tokenData.marketCap)}</dd>
          <dt className="border-primary/50 text-muted-foreground lg:border-l lg:ml-4 lg:pl-4">Vol 24hr</dt>
          <dd className="flex items-center gap-1">
            ${numeralFormatter(groupData.pool.token.tokenData.volume24hr)}
            {groupData.pool.token.tokenData.volumeChange24hr && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  groupData.pool.token.tokenData.volumeChange24hr > 1 ? "text-mrgn-success" : "text-mrgn-error"
                )}
              >
                {groupData.pool.token.tokenData.volumeChange24hr > 1 && "+"}
                {percentFormatter.format(groupData.pool.token.tokenData.volumeChange24hr / 100)}
              </span>
            )}
          </dd>
        </>
      )}
    </dl>
  );
};
