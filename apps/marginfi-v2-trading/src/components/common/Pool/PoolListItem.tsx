import React from "react";

import Image from "next/image";
import Link from "next/link";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { tokenPriceFormatter, percentFormatter, usdFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";

import { useTradeStore } from "~/store";
import { getTokenImageURL, cn } from "~/utils";

import { Button } from "~/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

import type { TokenData } from "~/types";

type PoolListItemProps = {
  bank: ExtendedBankInfo;
  last?: boolean;
};

export const PoolListItem = ({ bank, last }: PoolListItemProps) => {
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
    <div className={cn("grid grid-cols-7 py-2 w-full items-center", !last && "border-b pb-3 mb-2")}>
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
        {tokenData && `$${numeralFormatter(tokenData.volume24h)}`}{" "}
        {tokenData?.volumeChange24h && (
          <span className={cn("text-xs ml-2", tokenData.volumeChange24h > 0 ? "text-mrgn-success" : "text-mrgn-error")}>
            {tokenData.volumeChange24h > 0 && "+"}
            {percentFormatter.format(tokenData.volumeChange24h / 100)}
          </span>
        )}
      </div>
      <div>{tokenData && `$${numeralFormatter(tokenData.marketcap)}`}</div>
      <div>{usdFormatter.format(totalLiquidity)}</div>
      <div className="pl-5">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link href="https://x.com/marginfi" target="_blank">
                <Image
                  src="https://pbs.twimg.com/profile_images/1791110026456633344/VGViq-CJ_400x400.jpg"
                  width={20}
                  height={20}
                  alt="marginfi"
                  className="rounded-full"
                />
              </Link>
            </TooltipTrigger>
            <TooltipContent>
              <p>Pool created by marginfi</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <div className="flex items-center gap-2 justify-end">
        <Link href={`/trade/${bank.address.toBase58()}?side=long`} className="w-full">
          <Button variant="long" className="w-full">
            Long
          </Button>
        </Link>
        <Link href={`/trade/${bank.address.toBase58()}?side=short`} className="w-full">
          <Button variant="short" className="w-full">
            Short
          </Button>
        </Link>
      </div>
    </div>
  );
};
