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
    <dl className="hidden items-center gap-2 text-sm w-full lg:flex">
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
      <dt className="border-primary/50 text-muted-foreground lg:border-l lg:ml-4 lg:pl-4">Oracle price</dt>
      <dd>{usdFormatter.format(activeGroup?.token?.info?.oraclePrice.priceRealtime.price.toNumber())}</dd>
      {tokenData?.volume4h && (
        <>
          <dt className="border-primary/50 text-muted-foreground lg:border-l lg:ml-4 lg:pl-4">Vol 4hr</dt>
          <dd className="flex items-center gap-1">
            ${numeralFormatter(tokenData?.volume4h)}
            {tokenData?.volumeChange4h && (
              <span
                className={cn(
                  "flex items-center gap-1",
                  tokenData?.volumeChange4h > 1 ? "text-mrgn-success" : "text-mrgn-error"
                )}
              >
                {tokenData?.volumeChange4h > 1 && "+"}
                {percentFormatter.format(tokenData?.volumeChange4h / 100)}
              </span>
            )}
          </dd>
        </>
      )}
      {tokenData?.volume24h && (
        <>
          <dt className="border-primary/50 text-muted-foreground lg:border-l lg:ml-4 lg:pl-4">Vol 24hr</dt>
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
