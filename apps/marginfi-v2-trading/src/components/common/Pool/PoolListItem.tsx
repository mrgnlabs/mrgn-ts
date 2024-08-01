import React from "react";

import Image from "next/image";
import Link from "next/link";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { tokenPriceFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { useTradeStore } from "~/store";
import { getTokenImageURL, cn } from "~/utils";

import { Button } from "~/components/ui/button";

import type { TokenData } from "~/types";

type PoolListItemProps = {
  bank: ExtendedBankInfo;
};

export const PoolListItem = ({ bank }: PoolListItemProps) => {
  const [collateralBanks] = useTradeStore((state) => [state.collateralBanks]);
  const [tokenData, setTokenData] = React.useState<TokenData | null>(null);

  const collateralBank = React.useMemo(() => {
    return collateralBanks[bank.address.toBase58()];
  }, [collateralBanks, bank]);

  const totalLiquidity = React.useMemo(() => {
    if (!collateralBank || !bank) return 0;
    const collaterDeposits =
      collateralBank.info.state.totalDeposits * collateralBank.info.oraclePrice.priceRealtime.price.toNumber();
    const tokenDeposits = bank.info.state.totalDeposits * bank.info.oraclePrice.priceRealtime.price.toNumber();
    return collaterDeposits + tokenDeposits;
  }, [collateralBank, bank]);

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
    <div className="grid grid-cols-8 py-2">
      <div className="flex items-center gap-2">
        <Image
          src={getTokenImageURL(bank.info.state.mint.toBase58())}
          alt={bank.meta.tokenSymbol}
          width={32}
          height={32}
          className="rounded-full bg-background"
        />
        <h2>{bank.meta.tokenSymbol}</h2>
      </div>
      <div>
        {tokenData && tokenPriceFormatter.format(tokenData.price)}{" "}
        {tokenData?.priceChange24h && (
          <span className={cn("text-xs ml-2", tokenData.priceChange24h > 0 ? "text-mrgn-success" : "text-mrgn-error")}>
            {tokenData.priceChange24h > 0 && "+"}
            {percentFormatter.format(tokenData.priceChange24h / 100)}
          </span>
        )}
      </div>
      <div>
        {tokenData && usdFormatter.format(tokenData.volume24h)}{" "}
        {tokenData?.volumeChange24h && (
          <span className={cn("text-xs ml-2", tokenData.volumeChange24h > 0 ? "text-mrgn-success" : "text-mrgn-error")}>
            {tokenData.volumeChange24h > 0 && "+"}
            {percentFormatter.format(tokenData.volumeChange24h / 100)}
          </span>
        )}
      </div>
      <div>{usdFormatter.format(totalLiquidity)}</div>
      <div></div>
      <div className="flex items-center gap-2">
        <Link href={`/trade/${bank.address.toBase58()}?side=long`}>
          <Button>Long</Button>
        </Link>
        <Link href={`/trade/${bank.address.toBase58()}?side=short`}>
          <Button>Short</Button>
        </Link>
      </div>
    </div>
  );
};
