import React from "react";

import Image from "next/image";
import Link from "next/link";

import { numeralFormatter, tokenPriceFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { getTokenImageURL, cn } from "~/utils";
import { useTradeStore } from "~/store";

import { PositionActionButtons } from "~/components/common/Portfolio";

import type { GroupData } from "~/store/tradeStore";
import { useGroupBanks, useGroupPosition } from "~/hooks/arenaHooks";

type PositionCardProps = {
  groupData: GroupData;
  isLong: boolean;
};

export const PositionCard = ({ groupData, isLong }: PositionCardProps) => {
  const { borrowBank, depositBank } = useGroupBanks({ group: groupData });
  const { positionSizeUsd, positionSizeToken, totalUsdValue, leverage } = useGroupPosition({ group: groupData });

  if (!groupData.pool.token.isActive) return null;

  return (
    <div className="bg-background border p-4 rounded-2xl space-y-4">
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
              ? tokenPriceFormatter.format(groupData.pool.token.info.oraclePrice.priceRealtime.price.toNumber())
              : `$${groupData.pool.token.info.oraclePrice.priceRealtime.price.toNumber().toExponential(2)}`}
            {groupData.pool.token.tokenData && (
              <span
                className={cn(
                  "ml-1",
                  groupData.pool.token.tokenData.priceChange24hr > 0 ? "text-mrgn-success" : "text-mrgn-error"
                )}
              >
                {percentFormatter.format(groupData.pool.token.tokenData.priceChange24hr / 100)}
              </span>
            )}
          </dd>
          {groupData.pool.token.position.liquidationPrice && (
            <>
              <dt>Liquidation Price</dt>
              <dd className="text-right text-primary">
                {tokenPriceFormatter.format(groupData.pool.token.position.liquidationPrice)}
              </dd>
            </>
          )}
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
