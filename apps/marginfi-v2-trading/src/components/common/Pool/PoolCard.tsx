import React from "react";

import Image from "next/image";
import Link from "next/link";

import { usdFormatter, percentFormatter, numeralFormatter } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

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
                className="rounded-full border"
              />{" "}
              <div className="flex flex-col space-y-1">
                <h2>{bank.meta.tokenName}</h2>
                <span className="text-muted-foreground text-sm">{bank.meta.tokenSymbol}</span>
              </div>
            </Link>
            <div className="font-medium text-xs flex flex-col gap-1 items-center">
              <Link href="https://x.com/marginfi" target="_blank">
                <Image
                  src="https://pbs.twimg.com/profile_images/1791110026456633344/VGViq-CJ_400x400.jpg"
                  width={32}
                  height={32}
                  alt="marginfi"
                  className="rounded-full"
                />
              </Link>
            </div>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid grid-cols-2 gap-1.5 text-sm text-muted-foreground w-full mt-2">
          {tokenData?.price && (
            <>
              <dt className="">Price</dt>
              <dd className="text-right text-primary tracking-wide">
                {tokenData.price > 0.01 ? usdFormatter.format(tokenData.price) : `$${tokenData.price.toExponential(2)}`}
                {tokenData?.priceChange24h && (
                  <span
                    className={cn(
                      "text-xs ml-2",
                      tokenData.priceChange24h > 0 ? "text-mrgn-success" : "text-mrgn-error"
                    )}
                  >
                    {tokenData.priceChange24h > 0 && "+"}
                    {percentFormatter.format(tokenData.priceChange24h / 100)}
                  </span>
                )}
              </dd>
            </>
          )}
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
          <dt>Open long</dt>
          <dd className="text-right text-primary tracking-wide">
            {usdFormatter.format(bank.info.state.totalDeposits * bank.info.state.price)}
          </dd>
          <dt>Open short</dt>
          <dd className="text-right text-primary tracking-wide">
            {usdFormatter.format(bank.info.state.totalBorrows * bank.info.state.price)}
          </dd>
        </dl>
      </CardContent>
      <CardFooter>
        <div className="flex items-center gap-3 w-full">
          <Link href={`/pools/${bank.address.toBase58()}`} className="w-full">
            <Button variant="outline" className="w-full">
              View
            </Button>
          </Link>
          <Link href={`/trade/${bank.address.toBase58()}?poolsLink=true`} className="w-full">
            <Button className="w-full">Trade</Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  );
};
