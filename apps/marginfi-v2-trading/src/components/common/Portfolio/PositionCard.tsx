import React from "react";

import Image from "next/image";
import Link from "next/link";

import { IconInfoCircle } from "@tabler/icons-react";
import { numeralFormatter, tokenPriceFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { cn, useIsMobile } from "@mrgnlabs/mrgn-utils";
import { useLeveragedPositionDetails } from "~/hooks/arenaHooks";

import { PositionActionButtons } from "~/components/common/Portfolio";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

import { ArenaPoolV2Extended, GroupStatus } from "~/store/tradeStoreV2";
import { useMarginfiClient } from "~/hooks/useMarginfiClient";
import { useWrappedAccount } from "~/hooks/useWrappedAccount";

type PositionCardProps = {
  arenaPool: ArenaPoolV2Extended;
  size?: "sm" | "lg";
};

export const PositionCard = ({ size = "lg", arenaPool }: PositionCardProps) => {
  const isMobile = useIsMobile();

  const client = useMarginfiClient({ groupPk: arenaPool.groupPk });
  const { accountSummary, wrappedAccount } = useWrappedAccount({
    client,
    groupPk: arenaPool.groupPk,
    banks: [arenaPool.tokenBank, arenaPool.quoteBank],
  });

  const { positionSizeUsd, totalUsdValue, leverage } = useLeveragedPositionDetails({ pool: arenaPool });
  // const { borrowBank } = useGroupBanks({ groupData: groupData });
  // const { positionSizeUsd, totalUsdValue, leverage } = useGroupPosition({ group: groupData });

  const healthColor = React.useMemo(() => {
    if (accountSummary?.healthFactor) {
      let color: string;

      if (accountSummary.healthFactor >= 0.5) {
        color = "#75BA80";
      } else if (accountSummary.healthFactor >= 0.25) {
        color = "#B8B45F";
      } else {
        color = "#CF6F6F";
      }

      return color;
    } else {
      return "#fff";
    }
  }, [accountSummary?.healthFactor]);

  // const isLstQuote = React.useMemo(() => {
  //   return groupData.pool.quoteTokens[0].meta.tokenSymbol === "LST";
  // }, [groupData]);

  const tokenPrice = React.useMemo(() => {
    // if (isLstQuote) {
    const lstPrice = arenaPool.quoteBank.info.oraclePrice.priceRealtime.price.toNumber();
    return `${tokenPriceFormatter(
      arenaPool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber() / lstPrice,
      "decimal"
    )} ${arenaPool.quoteBank.meta.tokenSymbol}`;
    // }

    // return tokenPriceFormatter(groupData.pool.token.info.oraclePrice.priceRealtime.price.toNumber());
  }, [arenaPool]);

  if (!arenaPool.tokenBank.isActive) return null;

  return (
    <div className={cn("space-y-4", size === "lg" && "bg-background border p-4 rounded-2xl")}>
      {size === "lg" && (
        <div className="flex items-center gap-4 justify-between">
          <Link
            href={`/trade/${arenaPool.groupPk.toBase58()}`}
            className="flex items-center gap-4 font-medium text-muted-foreground"
          >
            <Image
              src={arenaPool.tokenBank.meta.tokenLogoUri}
              alt={arenaPool.tokenBank.meta.tokenSymbol}
              width={56}
              height={56}
              className="rounded-full"
            />
            <div className="leading-none space-y-0.5">
              <h2 className="text-lg text-primary">{arenaPool.tokenBank.meta.tokenName}</h2>
              <h3>{`${arenaPool.tokenBank.meta.tokenSymbol}/${arenaPool.quoteBank.meta.tokenSymbol}`}</h3>
            </div>
          </Link>
        </div>
      )}
      <div className="bg-accent/50 rounded-xl p-4">
        <dl className="w-full grid grid-cols-2 text-sm text-muted-foreground gap-1">
          <dt>Token</dt>
          <dd className="text-right text-primary">
            {numeralFormatter(arenaPool.tokenBank.position.amount)} {arenaPool.tokenBank.meta.tokenSymbol}
          </dd>
          <dt>Value</dt>
          <dd className="text-right text-primary">{usdFormatter.format(totalUsdValue)} USD</dd>
          <dt>Leverage</dt>
          <dd className="text-right text-primary">{`${leverage}x`}</dd>
          <dt>Size</dt>
          <dd className="text-right text-primary">
            {positionSizeUsd < 0.01 ? "< 0.01" : usdFormatter.format(positionSizeUsd)} USD
          </dd>

          <dt>Price</dt>
          <dd className="text-right text-primary">
            {tokenPrice}
            {/* {isLstQuote && ( */}
            <>
              {isMobile ? (
                <span className="text-xs ml-1 text-muted-foreground block">
                  {tokenPriceFormatter(arenaPool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber())} USD
                </span>
              ) : (
                <span className="text-xs ml-1 text-muted-foreground">
                  ({tokenPriceFormatter(arenaPool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber())})
                </span>
              )}
            </>
            {/* )} */}
          </dd>
          {arenaPool.tokenBank.position.liquidationPrice && (
            <>
              <dt>Liquidation Price</dt>
              <dd className="text-right text-primary">
                {tokenPriceFormatter(arenaPool.tokenBank.position.liquidationPrice)}
              </dd>
            </>
          )}
          <dt className="flex items-center gap-0.5">
            Health Factor{" "}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <IconInfoCircle size={14} />
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    Health factors indicate how well-collateralized your account is. A value below 0% exposes you to
                    liquidation.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </dt>
          <dd
            className="text-right"
            style={{
              color: healthColor,
            }}
          >
            {accountSummary && percentFormatter.format(accountSummary.healthFactor)}
          </dd>
        </dl>
      </div>
      <div className="flex items-center justify-between gap-4">
        {client && accountSummary && (
          <PositionActionButtons
            arenaPool={arenaPool}
            isBorrowing={arenaPool.status === GroupStatus.SHORT || arenaPool.status === GroupStatus.LONG}
            rightAlignFinalButton={true}
            accountSummary={accountSummary}
            client={client}
            selectedAccount={wrappedAccount}
          />
        )}
      </div>
    </div>
  );
};
