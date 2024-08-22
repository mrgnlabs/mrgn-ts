import React from "react";

import Image from "next/image";
import Link from "next/link";

import { IconInfoCircle } from "@tabler/icons-react";
import { numeralFormatter, tokenPriceFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { getTokenImageURL, cn } from "~/utils";
import { useGroupBanks, useGroupPosition } from "~/hooks/arenaHooks";

import { PositionActionButtons } from "~/components/common/Portfolio";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

import type { GroupData } from "~/store/tradeStore";

type PositionCardProps = {
  groupData: GroupData;
  size?: "sm" | "lg";
};

export const PositionCard = ({ size = "lg", groupData }: PositionCardProps) => {
  const { borrowBank } = useGroupBanks({ group: groupData });
  const { positionSizeUsd, totalUsdValue, leverage } = useGroupPosition({ group: groupData });

  const healthColor = React.useMemo(() => {
    if (groupData.accountSummary.healthFactor) {
      let color: string;

      if (groupData.accountSummary.healthFactor >= 0.5) {
        color = "#75BA80";
      } else if (groupData.accountSummary.healthFactor >= 0.25) {
        color = "#B8B45F";
      } else {
        color = "#CF6F6F";
      }

      return color;
    } else {
      return "#fff";
    }
  }, [groupData]);

  if (!groupData.pool.token.isActive) return null;

  return (
    <div className={cn("space-y-4", size === "lg" && "bg-background border p-4 rounded-2xl")}>
      {size === "lg" && (
        <div className="flex items-center gap-4 justify-between">
          <Link
            href={`/trade/${groupData.client.group.address.toBase58()}`}
            className="flex items-center gap-4 font-medium text-muted-foreground"
          >
            <Image
              src={getTokenImageURL(groupData.pool.token.info.state.mint.toBase58())}
              alt={groupData.pool.token.meta.tokenSymbol}
              width={56}
              height={56}
              className="rounded-full"
            />
            <div className="leading-none space-y-0.5">
              <h2 className="text-lg text-primary">{groupData.pool.token.meta.tokenName}</h2>
              <h3>{groupData.pool.token.meta.tokenSymbol}</h3>
            </div>
          </Link>
        </div>
      )}
      <div className="bg-accent/50 rounded-xl p-4">
        <dl className="w-full grid grid-cols-2 text-sm text-muted-foreground gap-1">
          <dt>Token</dt>
          <dd className="text-right text-primary">
            {numeralFormatter(groupData.pool.token.position.amount)} {groupData.pool.token.meta.tokenSymbol}
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
            {groupData.pool.token.info.oraclePrice.priceRealtime.price.toNumber() > 0.00001
              ? tokenPriceFormatter(groupData.pool.token.info.oraclePrice.priceRealtime.price.toNumber())
              : `$${groupData.pool.token.info.oraclePrice.priceRealtime.price.toNumber().toExponential(2)}`}
          </dd>
          {groupData.pool.token.position.liquidationPrice && (
            <>
              <dt>Liquidation Price</dt>
              <dd className="text-right text-primary">
                {tokenPriceFormatter(groupData.pool.token.position.liquidationPrice)}
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
            {percentFormatter.format(groupData.accountSummary.healthFactor)}
          </dd>
        </dl>
      </div>
      <div className="flex items-center justify-between gap-4">
        {groupData.client && groupData.selectedAccount && (
          <PositionActionButtons activeGroup={groupData} isBorrowing={!!borrowBank} rightAlignFinalButton={true} />
        )}
      </div>
    </div>
  );
};
