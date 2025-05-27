import React from "react";
import Link from "next/link";
import Image from "next/image";
import { IconInfoCircle, IconSwitchHorizontal } from "@tabler/icons-react";

import { tokenPriceFormatter, percentFormatter, usdFormatter, dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";
import { useIsMobile, cn, ArenaGroupStatus } from "@mrgnlabs/mrgn-utils";

import { useLeveragedPositionDetails } from "~/hooks/arenaHooks";
import { useArenaClient } from "~/hooks/useArenaClient";
import { useWrappedAccount } from "~/hooks/useWrappedAccount";
import { usePositionsData } from "~/hooks/usePositionsData";
import { ArenaPoolV2Extended } from "~/types";
import { PositionActionButtons } from "~/components/common/Portfolio";
import { PnlBadge, PnlLabel } from "~/components/common/pnl-display";
import { SharePosition } from "~/components/common/share-position";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

type PositionCardProps = {
  arenaPool: ArenaPoolV2Extended;
  size?: "sm" | "lg";
};

export const PositionCard = ({ size = "lg", arenaPool }: PositionCardProps) => {
  const isStableQuote = React.useMemo(() => {
    return (
      arenaPool.quoteBank.tokenData &&
      0.99 < arenaPool.quoteBank.tokenData.price &&
      arenaPool.quoteBank.tokenData.price < 1.01
    );
  }, [arenaPool.quoteBank.tokenData]);
  const [showQuotePrice, setShowQuotePrice] = React.useState(false);

  const positionData = usePositionsData({ groupPk: arenaPool.groupPk });
  const client = useArenaClient({ groupPk: arenaPool.groupPk });
  const { accountSummary, wrappedAccount } = useWrappedAccount({
    client,
    groupPk: arenaPool.groupPk,
    banks: [arenaPool.tokenBank, arenaPool.quoteBank],
  });
  const { positionSizeUsd, totalUsdValue, leverage } = useLeveragedPositionDetails({ pool: arenaPool });

  const isMobile = useIsMobile();

  const healthColor = React.useMemo(() => {
    if (accountSummary?.healthFactor) {
      let color: string;

      if (accountSummary.healthFactor.computedHealth >= 0.5) {
        color = "#7ed3a4";
      } else if (accountSummary.healthFactor.computedHealth >= 0.25) {
        color = "#ffba00";
      } else {
        color = "#f08f84";
      }

      return color;
    } else {
      return "#fff";
    }
  }, [accountSummary?.healthFactor]);

  const displayedPrice = React.useMemo(() => {
    const tokenPrice = arenaPool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber();
    const quotePrice = arenaPool.quoteBank.info.oraclePrice.priceRealtime.price.toNumber();

    if (showQuotePrice) {
      return `${dynamicNumeralFormatter(tokenPrice / quotePrice, {
        ignoreMinDisplay: true,
      })} ${arenaPool.quoteBank.meta.tokenSymbol}`;
    }

    return `${dynamicNumeralFormatter(tokenPrice, {
      ignoreMinDisplay: true,
    })} USD`;
  }, [showQuotePrice, arenaPool]);

  if (!arenaPool.tokenBank.isActive) return null;

  return (
    <div className={cn("space-y-4", size === "lg" && "bg-background/35 border p-4 rounded-2xl")}>
      {size === "lg" && (
        <div className="flex items-center gap-4 justify-between">
          <Link
            href={`/trade/${arenaPool.groupPk.toBase58()}`}
            className="flex items-center gap-3 font-medium text-muted-foreground md:gap-4"
          >
            <Image
              src={arenaPool.tokenBank.meta.tokenLogoUri}
              alt={arenaPool.tokenBank.meta.tokenSymbol}
              width={isMobile ? 48 : 56}
              height={isMobile ? 48 : 56}
              className={cn(
                "rounded-full translate-y-[2px] object-cover",
                isMobile ? "w-[48px] h-[48px]" : "w-[56px] h-[56px]"
              )}
            />
            <div className="leading-none md:space-y-0.5">
              <h2 className="text-lg text-primary">{arenaPool.tokenBank.meta.tokenName}</h2>
              <h3>{`${arenaPool.tokenBank.meta.tokenSymbol.toUpperCase()}/${arenaPool.quoteBank.meta.tokenSymbol.toUpperCase()}`}</h3>
            </div>
          </Link>
          {!process.env.NEXT_PUBLIC_HIDE_ARENA_FEATURES && (
            <div className="flex items-center gap-2">
              <PnlLabel
                pnl={positionData?.pnl ?? 0}
                positionSize={positionSizeUsd}
                showTooltip={!isMobile}
                className="text-xl md:text-2xl"
              />
              <PnlBadge pnl={positionData?.pnl ?? 0} positionSize={positionSizeUsd} className="hidden md:block" />
            </div>
          )}
        </div>
      )}
      <div className="bg-accent/50 rounded-xl p-4">
        <dl className="w-full grid grid-cols-2 text-sm text-muted-foreground gap-1">
          <dt>Value</dt>
          <dd className="text-right text-primary">{usdFormatter.format(totalUsdValue)}</dd>
          <dt>Leverage</dt>
          <dd className="text-right text-primary">{`${leverage}x`}</dd>
          <dt>Size</dt>
          <dd className="text-right text-primary">{usdFormatter.format(positionSizeUsd)}</dd>

          <dt>Entry Price</dt>
          <dd className="text-right text-primary">
            $
            {dynamicNumeralFormatter(positionData?.entryPrice ?? 0, {
              ignoreMinDisplay: true,
            })}
          </dd>
          <dt>Current Price </dt>
          <dd
            className="text-right text-primary flex items-center gap-1 cursor-pointer w-full justify-end"
            onClick={() => setShowQuotePrice(!showQuotePrice)}
          >
            {displayedPrice}

            {!isStableQuote && <IconSwitchHorizontal size={14} />}
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
            {accountSummary && percentFormatter.format(accountSummary.healthFactor.computedHealth)}
          </dd>
          {!process.env.NEXT_PUBLIC_HIDE_ARENA_FEATURES && (
            <>
              <dt>PnL</dt>
              <dd className="text-right">
                <PnlLabel pnl={positionData?.pnl ?? 0} positionSize={positionSizeUsd} className="text-primary" />
              </dd>
            </>
          )}
        </dl>
      </div>
      <div className="flex flex-col-reverse md:flex-row items-center justify-center md:justify-between gap-4">
        {!process.env.NEXT_PUBLIC_HIDE_ARENA_FEATURES && (
          <div className="w-full flex items-center justify-center md:inline-block md:mr-auto">
            {arenaPool && <SharePosition pool={arenaPool} />}
          </div>
        )}
        {client && accountSummary && arenaPool && (
          <PositionActionButtons
            arenaPool={arenaPool}
            isBorrowing={arenaPool.status === ArenaGroupStatus.SHORT || arenaPool.status === ArenaGroupStatus.LONG}
            accountSummary={accountSummary}
            client={client}
            selectedAccount={wrappedAccount}
            className="justify-center md:justify-end"
            rightAlignLastButton={!!process.env.NEXT_PUBLIC_HIDE_ARENA_FEATURES}
          />
        )}
      </div>
    </div>
  );
};
