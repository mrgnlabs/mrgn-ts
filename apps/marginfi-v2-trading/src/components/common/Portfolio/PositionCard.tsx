import React from "react";

import Image from "next/image";
import Link from "next/link";

import { numeralFormatter, tokenPriceFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { getTokenImageURL, cn } from "~/utils";
import { useTradeStore } from "~/store";

import { PositionActionButtons } from "~/components/common/Portfolio";

import type { GroupData } from "~/store/tradeStore";

type PositionCardProps = {
  groupData: GroupData;
  isLong: boolean;
};

export const PositionCard = ({ groupData, isLong }: PositionCardProps) => {
  const isBorrowing = React.useMemo(() => {
    const borrowBank = isLong ? groupData.pool.quoteTokens[0] : groupData.pool.token;
    return borrowBank.isActive && !borrowBank.position.isLending;
  }, [isLong, groupData]);

  const leverage = React.useMemo(() => {
    const borrowBank =
      groupData.pool.token.isActive && groupData.pool.token.position.isLending
        ? groupData.pool.quoteTokens[0]
        : groupData.pool.token;
    const depositBank = groupData.pool.token.address.equals(borrowBank.address)
      ? groupData.pool.quoteTokens[0]
      : groupData.pool.token;

    let leverage = 1;
    if (borrowBank.isActive && depositBank.isActive) {
      const borrowUsd = borrowBank.position.usdValue;
      const depositUsd = depositBank.position.usdValue;

      leverage = Math.round((borrowUsd / depositUsd + Number.EPSILON) * 100) / 100 + 1;
    }
    return numeralFormatter(leverage);
  }, [groupData]);

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
          <dt>Size</dt>
          <dd className="text-right text-primary">
            {numeralFormatter(groupData.pool.token.position.amount)} {groupData.pool.token.meta.tokenSymbol}
          </dd>
          <dt>Leverage</dt>
          <dd className="text-right text-primary">{`${leverage}x`}</dd>
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
          <dt>USD Value</dt>
          <dd className="text-right text-primary">{usdFormatter.format(groupData.pool.token.position.usdValue)} USD</dd>
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
          <PositionActionButtons
            marginfiClient={groupData.client}
            marginfiAccount={groupData.selectedAccount}
            isBorrowing={isBorrowing}
            bank={groupData.pool.token}
            collateralBank={groupData.pool.quoteTokens[0]}
            rightAlignFinalButton={true}
          />
        )}
      </div>
    </div>
  );
};
