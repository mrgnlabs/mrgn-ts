import React from "react";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/router";

import { IconInfoCircle } from "@tabler/icons-react";
import { numeralFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";

import { useTradeStore, useUiStore } from "~/store";
import { getTokenImageURL, cn } from "~/utils";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useConnection } from "~/hooks/useConnection";

import { BankCard } from "~/components/common/Pool";
import { ActionComplete } from "~/components/common/ActionComplete";
import { Loader } from "~/components/ui/loader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

import type { TokenData } from "~/types";

export default function TradeSymbolPage() {
  const router = useRouter();
  const { connection } = useConnection();
  const { wallet } = useWalletContext();
  const [initialized, activeGroup, setActiveBank, accountSummary] = useTradeStore((state) => [
    state.initialized,
    state.activeGroup,
    state.setActiveBank,
    state.accountSummary,
  ]);
  const [previousTxn] = useUiStore((state) => [state.previousTxn]);
  const [tokenData, setTokenData] = React.useState<TokenData | null>(null);

  const healthColor = React.useMemo(() => {
    if (accountSummary.healthFactor) {
      let color: string;

      if (accountSummary.healthFactor >= 0.5) {
        color = "#75BA80"; // green color " : "#",
      } else if (accountSummary.healthFactor >= 0.25) {
        color = "#B8B45F"; // yellow color
      } else {
        color = "#CF6F6F"; // red color
      }

      return color;
    } else {
      return "#fff";
    }
  }, [accountSummary.healthFactor]);

  React.useEffect(() => {
    if (!router.query.symbol || !wallet || !connection || !initialized || activeGroup) return;
    const symbol = router.query.symbol as string;
    setActiveBank({ bankPk: new PublicKey(symbol), connection, wallet });
  }, [router.query.symbol, connection, wallet, activeGroup, initialized, setActiveBank]);

  React.useEffect(() => {
    if (!activeGroup) return;

    const fetchTokenData = async () => {
      const tokenResponse = await fetch(`/api/birdeye/token?address=${activeGroup.token.info.state.mint.toBase58()}`);

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
  }, [activeGroup]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 pt-12 z-10">
        {(!initialized || !activeGroup) && <Loader label="Loading mrgntrade..." className="mt-8" />}
        {initialized && activeGroup && activeGroup.token && (
          <div className="flex flex-col items-start gap-8 pb-16 w-full">
            <div className="grid grid-cols-9 w-full max-w-6xl mx-auto">
              <div className="col-span-3">
                <div className="h-full flex flex-col justify-center text-center items-center gap-3">
                  <Image
                    src={getTokenImageURL(activeGroup.token.meta.tokenSymbol)}
                    width={72}
                    height={72}
                    className="rounded-full"
                    alt={activeGroup.token.meta.tokenName}
                  />
                  <div className="space-y-0.5">
                    <h1 className="text-2xl font-medium">{activeGroup.token.meta.tokenName}</h1>
                    <h2 className="text-xl text-muted-foreground">{activeGroup.token.meta.tokenSymbol}</h2>
                  </div>
                </div>
              </div>
              <div className="col-span-6">
                {tokenData && (
                  <div className="grid grid-cols-3 w-full max-w-6xl mx-auto gap-8">
                    <StatBlock
                      label="Current Price"
                      value={
                        tokenData.price > 0.01
                          ? usdFormatter.format(tokenData.price)
                          : `$${tokenData.price.toExponential(2)}`
                      }
                      subValue={
                        <span className={cn(tokenData.priceChange24h > 0 ? "text-mrgn-success" : "text-mrgn-error")}>
                          {tokenData.priceChange24h > 0 && "+"}
                          {percentFormatter.format(tokenData.priceChange24h / 100)}
                        </span>
                      }
                    />
                    <StatBlock label="Market cap" value={`$${numeralFormatter(tokenData.marketCap)}`} />
                    <StatBlock
                      label="24hr vol"
                      value={`$${numeralFormatter(tokenData.volume24h)}`}
                      subValue={
                        <span className={cn(tokenData.volumeChange24h > 0 ? "text-mrgn-success" : "text-mrgn-error")}>
                          {tokenData.volumeChange24h > 0 && "+"}
                          {percentFormatter.format(tokenData.volumeChange24h / 100)}
                        </span>
                      }
                    />
                    <StatBlock
                      label={
                        <div className="flex items-center gap-2">
                          <Image
                            src={getTokenImageURL(activeGroup.token.meta.tokenSymbol)}
                            alt={activeGroup.token.meta.tokenName}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                          Total Deposits
                          <br />({activeGroup.token.meta.tokenSymbol})
                        </div>
                      }
                      value={numeralFormatter(activeGroup.token.info.state.totalDeposits)}
                      subValue={usdFormatter.format(
                        activeGroup.token.info.state.totalDeposits *
                          activeGroup.token.info.oraclePrice.priceRealtime.price.toNumber()
                      )}
                    />
                    <StatBlock
                      label={
                        <div className="flex items-center gap-2">
                          <Image
                            src={getTokenImageURL(activeGroup.usdc.meta.tokenSymbol)}
                            alt={activeGroup.usdc.meta.tokenName}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                          Total Deposits
                          <br />
                          (USDC)
                        </div>
                      }
                      value={numeralFormatter(activeGroup.usdc.info.state.totalDeposits)}
                      subValue={usdFormatter.format(
                        activeGroup.usdc.info.state.totalDeposits *
                          activeGroup.usdc.info.oraclePrice.priceRealtime.price.toNumber()
                      )}
                    />
                    <StatBlock
                      label={
                        <div className="flex items-center">
                          <div className="flex items-center">
                            <Image
                              src={getTokenImageURL(activeGroup.token.meta.tokenSymbol)}
                              alt={activeGroup.token.meta.tokenName}
                              width={24}
                              height={24}
                              className="rounded-full z-20"
                            />
                            <Image
                              src={getTokenImageURL(activeGroup.usdc.meta.tokenSymbol)}
                              alt={activeGroup.token.meta.tokenName}
                              width={24}
                              height={24}
                              className="rounded-full -translate-x-2.5 z-10"
                            />
                          </div>
                          Total Liquidity
                          <br />({activeGroup.token.meta.tokenSymbol} + USDC)
                        </div>
                      }
                      value={usdFormatter.format(
                        activeGroup.usdc.info.state.totalDeposits *
                          activeGroup.usdc.info.oraclePrice.priceRealtime.price.toNumber() +
                          activeGroup.token.info.state.totalDeposits *
                            activeGroup.token.info.oraclePrice.priceRealtime.price.toNumber()
                      )}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="bg-background-gray-dark p-6 rounded-xl w-full max-w-6xl mx-auto">
              <h2 className="font-medium text-2xl mb-4">Your position</h2>
              <dl className="flex justify-between items-center gap-2">
                <dt className="flex items-center gap-1.5 text-sm">
                  Lend/borrow health factor
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <IconInfoCircle size={16} />
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <div className="flex flex-col gap-2 pb-2">
                          <p>
                            Health factor is based off <b>price biased</b> and <b>weighted</b> asset and liability
                            values.
                          </p>
                          <div className="font-medium">
                            When your account health reaches 0% or below, you are exposed to liquidation.
                          </div>
                          <p>The formula is:</p>
                          <p className="text-sm italic text-center">{"(assets - liabilities) / (assets)"}</p>
                          <p>Your math is:</p>
                          <p className="text-sm italic text-center">{`(${usdFormatter.format(
                            accountSummary.lendingAmountWithBiasAndWeighted
                          )} - ${usdFormatter.format(
                            accountSummary.borrowingAmountWithBiasAndWeighted
                          )}) / (${usdFormatter.format(accountSummary.lendingAmountWithBiasAndWeighted)})`}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </dt>
                <dd className="text-xl md:text-2xl font-medium" style={{ color: healthColor }}>
                  {numeralFormatter(accountSummary.healthFactor * 100)}%
                </dd>
              </dl>
              <div className="h-2 bg-background-gray-light rounded-full">
                <div
                  className="h-2 rounded-full"
                  style={{
                    backgroundColor: healthColor,
                    width: `${accountSummary.healthFactor * 100}%`,
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-8 w-full mx-auto mt-8">
                <BankCard bank={activeGroup.token} />
                <BankCard bank={activeGroup.usdc} />
              </div>
            </div>
          </div>
        )}
      </div>
      {initialized && previousTxn && <ActionComplete />}
    </>
  );
}

type StatProps = {
  label: JSX.Element | string;
  value: JSX.Element | string;
  subValue?: JSX.Element | string;
};

const StatBlock = ({ label, value, subValue }: StatProps) => (
  <Card className="bg-background-gray-dark border-none">
    <CardHeader className="pb-2">
      <CardTitle className="text-sm text-muted-foreground font-normal">{label}</CardTitle>
    </CardHeader>
    <CardContent className="px-4">
      <p className="text-3xl">
        {value} {subValue && <span className="text-lg text-muted-foreground">{subValue}</span>}
      </p>
    </CardContent>
  </Card>
);
