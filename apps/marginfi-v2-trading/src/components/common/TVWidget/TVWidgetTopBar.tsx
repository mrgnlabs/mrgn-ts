import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { usdFormatter, percentFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";

import { cn } from "~/utils";

import type { TokenData } from "~/types";

type TVWidgetTopBarProps = {
  tokenData: TokenData | null;
  activeGroup: {
    token: ExtendedBankInfo;
    usdc: ExtendedBankInfo;
  };
};

export const TVWidgetTopBar = ({ tokenData, activeGroup }: TVWidgetTopBarProps) => {
  return (
    <dl className="flex items-center gap-2 text-sm">
      {tokenData?.price && (
        <>
          <dt className="text-muted-foreground">Market price</dt>
          <dd className="flex items-center gap-1">
            {tokenData.price > 0.01 ? usdFormatter.format(tokenData?.price) : `$${tokenData?.price.toExponential(2)}`}
            {tokenData?.priceChange24h && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  tokenData?.priceChange24h > 1 ? "text-mrgn-success" : "text-mrgn-error"
                )}
              >
                {tokenData?.priceChange24h > 1 && "+"}
                {percentFormatter.format(tokenData?.priceChange24h / 100)}
              </span>
            )}
          </dd>
        </>
      )}
      <dt className="ml-4 border-l border-primary/50 pl-4 text-muted-foreground">Oracle price</dt>
      <dd>{usdFormatter.format(activeGroup?.token?.info?.oraclePrice.priceRealtime.price.toNumber())}</dd>
      {tokenData?.marketCap && (
        <>
          <dt className="ml-4 border-l border-primary/50 pl-4 text-muted-foreground">Market cap</dt>
          <dd>${numeralFormatter(tokenData?.marketCap)}</dd>
        </>
      )}
      {tokenData?.volume24h && (
        <>
          <dt className="ml-4 border-l border-primary/50 pl-4 text-muted-foreground">Vol 24hr</dt>
          <dd className="flex items-center gap-1">
            ${numeralFormatter(tokenData?.volume24h)}
            {tokenData?.volumeChange24h && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  tokenData?.volumeChange24h > 1 ? "text-mrgn-success" : "text-mrgn-error"
                )}
              >
                {tokenData?.volumeChange24h > 1 && "+"}
                {percentFormatter.format(tokenData?.volumeChange24h / 100)}
              </span>
            )}
          </dd>
        </>
      )}
    </dl>
  );
};
