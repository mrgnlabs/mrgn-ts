import React from "react";

import Image from "next/image";
import Link from "next/link";

import { shortenAddress, usdFormatter, percentFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { IconTrendingDown, IconTrendingUp } from "@tabler/icons-react";

import { getTokenImageURL, cn } from "~/utils";
import { useTradeStore } from "~/store";

import { Button } from "~/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "~/components/ui/card";

import type { TokenData } from "~/types";

type PoolCardProps = {
  bank: ExtendedBankInfo;
};

export const PoolCard = ({ bank }: PoolCardProps) => {
  const [collateralBanks] = useTradeStore((state) => [state.collateralBanks]);
  const [tokenData, setTokenData] = React.useState<TokenData | null>(null);

  const totalDeposits = React.useMemo(() => {
    const collateralBank = collateralBanks[bank.address.toBase58()];
    const collateralDeposits = collateralBank
      ? collateralBank.info.state.totalDeposits * collateralBank.info.state.price
      : 0;
    const tokenDeposits = bank.info.state.totalDeposits * bank.info.state.price;

    return tokenDeposits + collateralDeposits;
  }, [collateralBanks, bank]);

  const totalBorrows = React.useMemo(() => {
    const collateralBank = collateralBanks[bank.address.toBase58()];
    const collateralBorrows = collateralBank
      ? collateralBank.info.state.totalBorrows * collateralBank.info.state.price
      : 0;
    const tokenBorrows = bank.info.state.totalBorrows * bank.info.state.price;

    return tokenBorrows + collateralBorrows;
  }, [collateralBanks, bank]);

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
    <Card>
      <CardHeader>
        <CardTitle>
          <div className="flex items-center gap-2 justify-between">
            <Link href={`/pools/${bank.address.toBase58()}`} className="flex items-center gap-3">
              <Image
                src={getTokenImageURL(bank.meta.tokenSymbol)}
                width={48}
                height={48}
                alt={bank.meta.tokenName}
                className="rounded-full"
              />{" "}
              <div className="flex flex-col space-y-1">
                <h2>{bank.meta.tokenName}</h2>
                <span className="text-muted-foreground text-sm">{bank.meta.tokenSymbol}</span>
              </div>
            </Link>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-2.5 text-sm text-muted-foreground w-full mt-2">
          <dt className="">Price</dt>
          <dd className="text-right text-primary tracking-wide">
            {usdFormatter.format(bank.info.oraclePrice.priceRealtime.price.toNumber())}
            {tokenData?.priceChange24h && (
              <span
                className={cn("text-xs ml-2", tokenData.priceChange24h > 0 ? "text-mrgn-success" : "text-mrgn-error")}
              >
                {tokenData.priceChange24h > 0 && "+"}
                {percentFormatter.format(tokenData.priceChange24h / 100)}
              </span>
            )}
          </dd>
          {tokenData?.volume24h && (
            <>
              <dt className="">24hr vol</dt>
              <dd className="text-right text-primary tracking-wide">
                ${numeralFormatter(tokenData.volume24h)}
                {tokenData?.volumeChange24h && (
                  <span
                    className={cn(
                      "text-xs ml-2",
                      tokenData.volumeChange24h > 0 ? "text-mrgn-success" : "text-mrgn-error"
                    )}
                  >
                    {tokenData.volumeChange24h > 0 && "+"}
                    {percentFormatter.format(tokenData.volumeChange24h / 100)}
                  </span>
                )}
              </dd>
            </>
          )}
          <dt className="">Open long</dt>
          <dd className="text-right text-primary tracking-wide">{usdFormatter.format(totalDeposits)}</dd>
          <dt className="">Open short</dt>
          <dd className="text-right text-primary tracking-wide">{usdFormatter.format(totalBorrows)}</dd>
        </dl>
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-3 w-full">
          <Link href={`/pools/${bank.address.toBase58()}`} className="w-full">
            <Button variant="secondary" className="w-full">
              View
            </Button>
          </Link>
          <Link href={`/trade/${bank.address.toBase58()}?poolsLink=true`} className="w-full">
            <Button variant="secondary" className="w-full">
              Trade
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
};
