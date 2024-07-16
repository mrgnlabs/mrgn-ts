import React from "react";

import Image from "next/image";
import Link from "next/link";

import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { groupedNumberFormatterDyn, usdFormatter } from "@mrgnlabs/mrgn-common";

import { useTradeStore, useUiStore } from "~/store";

import { PageHeading } from "~/components/common/PageHeading";
import { PositionCard } from "~/components/common/Portfolio/PositionCard";
import { ActionComplete } from "~/components/common/ActionComplete";
import { Loader } from "~/components/ui/loader";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { getTokenImageURL } from "~/utils";

export default function PortfolioPage() {
  const [initialized, banks, resetActiveGroup] = useTradeStore((state) => [
    state.initialized,
    state.banks,
    state.resetActiveGroup,
  ]);
  const [previousTxn] = useUiStore((state) => [state.previousTxn]);

  const portfolio = React.useMemo(() => {
    const activeBanks = banks.filter((bank) => bank.isActive);
    const longBanks = activeBanks.filter((bank) => bank.isActive && bank.position.isLending) as ActiveBankInfo[];
    const shortBanks = activeBanks.filter((bank) => bank.isActive && !bank.position.isLending) as ActiveBankInfo[];

    if (!longBanks.length && !shortBanks.length) return null;

    return {
      long: longBanks.sort((a, b) => a.position.usdValue - b.position.usdValue),
      short: shortBanks.sort((a, b) => a.position.usdValue - b.position.usdValue),
    };
  }, [banks]);

  const portfolioCombined = React.useMemo(() => {
    if (!portfolio) return null;

    return [...portfolio.long, ...portfolio.short].sort((a, b) => a.position.usdValue - b.position.usdValue);
  }, [portfolio]);

  const totalLong = React.useMemo(() => {
    return portfolio?.long.reduce((acc, bank) => acc + bank.position.usdValue, 0) || 0;
  }, [portfolio]);

  const totalShort = React.useMemo(() => {
    return portfolio?.short.reduce((acc, bank) => acc + bank.position.usdValue, 0) || 0;
  }, [portfolio]);

  React.useEffect(() => {
    resetActiveGroup();
  }, [resetActiveGroup]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 pt-12">
        {!initialized && <Loader label="Loading mrgntrade..." className="mt-8" />}
        {initialized && (
          <div className="space-y-4">
            <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
              <PageHeading heading="Portfolio" body={<p>Manage your mrgntrade positions.</p>} links={[]} />
            </div>
            {!portfolio || !portfolioCombined ? (
              <p className="text-center mt-4">
                You do not have any open positions.{" "}
                <Link href="/" className="border-b border-primary transition-colors hover:border-transparent">
                  Explore the pools
                </Link>{" "}
                and start trading!
              </p>
            ) : (
              <div className="max-w-6xl mx-auto space-y-12">
                <div className="grid grid-cols-2 gap-8 w-full md:grid-cols-3">
                  <StatBlock label="Total long (USD)" value={usdFormatter.format(totalLong)} />
                  <StatBlock label="Total short (USD)" value={usdFormatter.format(totalShort)} />
                  <div className="col-span-2 md:col-span-1">
                    <StatBlock
                      label="Active pools"
                      value={
                        <div className="flex items-center gap-4">
                          {groupedNumberFormatterDyn.format(portfolio.long.length + portfolio.short.length)}
                          <ul className="flex items-center -space-x-2">
                            {portfolioCombined.slice(0, 5).map((bank, index) => (
                              <Image
                                src={getTokenImageURL(bank.meta.tokenSymbol)}
                                alt={bank.meta.tokenSymbol}
                                width={24}
                                height={24}
                                key={index}
                                className="rounded-full ring-1 ring-primary"
                              />
                            ))}
                          </ul>
                          {portfolioCombined?.length - 5 > 0 && (
                            <p className="text-sm text-muted-foreground">+{portfolioCombined?.length - 5} more</p>
                          )}
                        </div>
                      }
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-12 w-full md:grid-cols-2">
                  <div className="space-y-6">
                    <h2 className="text-2xl font-medium">Long positions</h2>
                    <div className="space-y-8">
                      {portfolio.long.map((bank, index) => (
                        <PositionCard key={index} bank={bank} isLong={true} />
                      ))}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h2 className="text-2xl font-medium">Short positions</h2>
                    <div className="space-y-8">
                      {portfolio.short.map((bank, index) => (
                        <PositionCard key={index} bank={bank} isLong={false} />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
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
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base text-muted-foreground font-normal">{label}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-3xl">
        {value} {subValue && <span className="text-lg text-muted-foreground">{subValue}</span>}
      </p>
    </CardContent>
  </Card>
);
