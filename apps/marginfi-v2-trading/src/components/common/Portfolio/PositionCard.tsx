import React from "react";

import Image from "next/image";
import Link from "next/link";

import { IconInfoCircle, IconSwitchHorizontal } from "@tabler/icons-react";
import { tokenPriceFormatter, percentFormatter, usdFormatter, dynamicNumeralFormatter } from "@mrgnlabs/mrgn-common";

import { cn } from "@mrgnlabs/mrgn-utils";
import { useLeveragedPositionDetails } from "~/hooks/arenaHooks";

import { PositionActionButtons } from "~/components/common/Portfolio";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

import { ArenaPoolV2Extended, GroupStatus } from "~/types/trade-store.types";
import { useMarginfiClient } from "~/hooks/useMarginfiClient";
import { useWrappedAccount } from "~/hooks/useWrappedAccount";
import { usePositionsData } from "~/hooks/usePositionsData";
import { PnlBadge, PnlLabel } from "~/components/common/pnl-display";
import { SharePosition } from "~/components/common/share-position";
import { Skeleton } from "~/components/ui/skeleton";

type PositionCardProps = {
  arenaPool: ArenaPoolV2Extended;
  size?: "sm" | "lg";
};

export const PositionCard = ({ size = "lg", arenaPool }: PositionCardProps) => {
  const [showQuotePrice, setShowQuotePrice] = React.useState(false);

  const positionData = usePositionsData({ groupPk: arenaPool.groupPk });
  const client = useMarginfiClient({ groupPk: arenaPool.groupPk });
  const { accountSummary, wrappedAccount } = useWrappedAccount({
    client,
    groupPk: arenaPool.groupPk,
    banks: [arenaPool.tokenBank, arenaPool.quoteBank],
  });

  const { positionSizeUsd, totalUsdValue, leverage } = useLeveragedPositionDetails({ pool: arenaPool });

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

  const displayedPrice = React.useMemo(() => {
    const tokenPrice = arenaPool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber();
    const quotePrice = arenaPool.quoteBank.info.oraclePrice.priceRealtime.price.toNumber();

    if (showQuotePrice) {
      return `${dynamicNumeralFormatter(tokenPrice / quotePrice)} ${arenaPool.quoteBank.meta.tokenSymbol}`;
    }

    return `$${dynamicNumeralFormatter(tokenPrice)}`;
  }, [showQuotePrice, arenaPool]);

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
              <h3>{`${arenaPool.tokenBank.meta.tokenSymbol.toUpperCase()}/${arenaPool.quoteBank.meta.tokenSymbol.toUpperCase()}`}</h3>
            </div>
          </Link>
          <div className="flex items-center gap-2">
            <PnlLabel
              pnl={positionData?.pnl}
              positionSize={positionSizeUsd}
              disableClickToChangeType={true}
              className="text-2xl"
              loader={<Skeleton className="w-[120px] ml-auto h-6 animate-pulsate" />}
            />
            {positionData?.pnl !== undefined && <PnlBadge pnl={positionData?.pnl} positionSize={positionSizeUsd} />}
          </div>
        </div>
      )}
      <div className="bg-accent/50 rounded-xl p-4">
        <dl className="w-full grid grid-cols-2 text-sm text-muted-foreground gap-1">
          {/* <dt>Token</dt>
          <dd className="text-right text-primary">
            {dynamicNumeralFormatter(arenaPool.tokenBank.position.amount)} {arenaPool.tokenBank.meta.tokenSymbol}
          </dd> */}
          <dt>Value</dt>
          <dd className="text-right text-primary">{usdFormatter.format(totalUsdValue)}</dd>
          <dt>Leverage</dt>
          <dd className="text-right text-primary">{`${leverage}x`}</dd>
          <dt>Size</dt>
          <dd className="text-right text-primary">{usdFormatter.format(positionSizeUsd)}</dd>

          <dt>Entry Price</dt>
          <dd className="text-right text-primary">${dynamicNumeralFormatter(positionData?.entryPrice ?? 0)}</dd>
          <dt>Current Price </dt>
          <dd
            className="text-right text-primary flex items-center gap-1 cursor-pointer w-full justify-end"
            onClick={() => setShowQuotePrice(!showQuotePrice)}
          >
            {displayedPrice}

            {arenaPool.quoteBank.meta.tokenSymbol !== "USDC" && <IconSwitchHorizontal size={14} />}
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
          <dt>PnL</dt>
          <dd className="text-right">
            <PnlLabel
              pnl={positionData?.pnl}
              positionSize={positionSizeUsd}
              className="text-primary"
              loader={<Skeleton className="w-[64px] ml-auto h-4 animate-pulsate" />}
            />
          </dd>
        </dl>
      </div>
      <div className="flex flex-col-reverse md:flex-row items-center justify-center md:justify-between gap-4">
        <div className="w-full flex items-center justify-center md:inline-block md:mr-auto">
          <SharePosition pool={arenaPool} />
        </div>
        {client && accountSummary && (
          <PositionActionButtons
            arenaPool={arenaPool}
            isBorrowing={arenaPool.status === GroupStatus.SHORT || arenaPool.status === GroupStatus.LONG}
            accountSummary={accountSummary}
            client={client}
            selectedAccount={wrappedAccount}
            className="justify-center md:justify-start"
          />
        )}
      </div>
    </div>
  );
};
