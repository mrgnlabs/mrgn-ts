import React from "react";

import Image from "next/image";
import Link from "next/link";

import { numeralFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { getTokenImageURL, cn } from "~/utils";
import { useTradeStore } from "~/store";

import { PositionActionButtons } from "~/components/common/Portfolio";

import type { TokenData } from "~/types";

type PositionCardProps = {
  bank: ActiveBankInfo;
  isLong: boolean;
};

export const PositionCard = ({ bank, isLong }: PositionCardProps) => {
  const [marginfiClient, collateralBanks, marginfiAccounts] = useTradeStore((state) => [
    state.marginfiClient,
    state.collateralBanks,
    state.marginfiAccounts,
  ]);
  const [tokenData, setTokenData] = React.useState<TokenData | null>(null);

  const collateralBank = React.useMemo(() => {
    return collateralBanks[bank.address.toBase58()] || null;
  }, [collateralBanks, bank]);

  const isBorrowing = React.useMemo(() => {
    const borrowBank = isLong ? collateralBank : bank;
    return borrowBank.isActive && !borrowBank.position.isLending;
  }, [bank, isLong, collateralBank]);

  const marginfiAccount = React.useMemo(() => {
    return marginfiAccounts ? marginfiAccounts[bank.info.rawBank.group.toBase58()] : undefined;
  }, [marginfiAccounts, bank]);

  React.useEffect(() => {
    if (!bank) return;

    const fetchTokenData = async () => {
      const tokenResponse = await fetch(`/api/birdeye/token?address=${bank.info.state.mint.toBase58()}`);

      if (!tokenResponse.ok) {
        console.error("Failed to fetch token data");
        return;
      }

      const tokenData = await tokenResponse.json();

      if (!tokenData) {
        console.error("Failed to parse token data");
        return;
      }

      setTokenData(tokenData);
    };

    fetchTokenData();
  }, [bank]);

  return (
    <div className="bg-background-gray p-4 rounded-2xl space-y-4">
      <div className="flex items-center gap-4 justify-between">
        <Link
          href={`/pools/${bank.address.toBase58()}`}
          className="flex items-center gap-4 font-medium text-muted-foreground"
        >
          <Image
            src={getTokenImageURL(bank.meta.tokenSymbol)}
            alt={bank.meta.tokenSymbol}
            width={56}
            height={56}
            className="rounded-full"
          />
          <div className="leading-none space-y-0.5">
            <h2 className="text-lg text-primary">{bank.meta.tokenName}</h2>
            <h3>{bank.meta.tokenSymbol}</h3>
          </div>
        </Link>
      </div>
      <div className="bg-background rounded-xl p-4">
        <dl className="w-full grid grid-cols-2 text-sm text-muted-foreground gap-1">
          <dt>Size</dt>
          <dd className="text-right text-primary">
            {numeralFormatter(bank.position.amount)} {bank.meta.tokenSymbol}
          </dd>
          <dt>Price</dt>
          <dd className="text-right text-primary">
            {bank.info.oraclePrice.priceRealtime.price.toNumber() > 0.01
              ? usdFormatter.format(bank.info.oraclePrice.priceRealtime.price.toNumber())
              : `$${bank.info.oraclePrice.priceRealtime.price.toNumber().toExponential(2)}`}
            {tokenData && (
              <span className={cn("ml-1", tokenData.priceChange24h ? "text-mrgn-success" : "text-mrgn-error")}>
                {percentFormatter.format(tokenData.priceChange24h / 100)}
              </span>
            )}
          </dd>
          <dt>USD Value</dt>
          <dd className="text-right text-primary">{usdFormatter.format(bank.position.usdValue)} USD</dd>
          {bank.position.liquidationPrice && (
            <>
              <dt>Liquidation Price</dt>
              <dd className="text-right text-primary">{usdFormatter.format(bank.position.liquidationPrice)}</dd>
            </>
          )}
        </dl>
      </div>
      <div className="flex items-center justify-between gap-4">
        <PositionActionButtons
          marginfiClient={marginfiClient}
          marginfiAccount={marginfiAccount}
          isBorrowing={isBorrowing}
          bank={bank}
          collateralBank={collateralBank}
          rightAlignFinalButton={true}
        />
      </div>
    </div>
  );
};
