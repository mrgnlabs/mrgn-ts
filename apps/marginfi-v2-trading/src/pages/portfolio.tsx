import React from "react";

import Image from "next/image";
import Link from "next/link";

import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { groupedNumberFormatterDyn, usdFormatter } from "@mrgnlabs/mrgn-common";

import { useTradeStore, useUiStore } from "~/store";
import { getTokenImageURL, cn } from "~/utils";

import { PageHeading } from "~/components/common/PageHeading";
import { PositionCard, LpPositionList } from "~/components/common/Portfolio";
import { ActionComplete } from "~/components/common/ActionComplete";
import { Loader } from "~/components/ui/loader";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";

export default function PortfolioPage() {
  const [initialized, portfolio] = useTradeStore((state) => [state.initialized, state.portfolio]);
  const [previousTxn] = useUiStore((state) => [state.previousTxn]);

  const totalLong = React.useMemo(() => {
    return (
      portfolio?.long.reduce(
        (acc, group) => (group.pool.token.isActive ? acc + group.pool.token.position.usdValue : 0),
        0
      ) || 0
    );
  }, [portfolio]);

  const totalShort = React.useMemo(() => {
    return (
      portfolio?.short.reduce(
        (acc, group) => (group.pool.token.isActive ? acc + group.pool.token.position.usdValue : 0),
        0
      ) || 0
    );
  }, [portfolio]);

  const portfolioCombined = React.useMemo(() => {
    if (!portfolio) return null;

    return [...portfolio.long, ...portfolio.short].sort((a, b) =>
      a.pool.token.isActive && b.pool.token.isActive
        ? a.pool.token.position.usdValue - b.pool.token.position.usdValue
        : 0
    );
  }, [portfolio]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 pt-12">
        {!initialized && <Loader label="Loading portfolio..." className="mt-8" />}
        {initialized && (
          <div className="space-y-4">
            <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
              <PageHeading heading="Portfolio" body={<p>Manage your positions in the arena.</p>} links={[]} />
            </div>
            {!portfolio || (!portfolio.long.length && !portfolio.short.length) ? (
              <p className="text-center mt-4">
                You do not have any open positions.{" "}
                <Link href="/" className="border-b border-primary transition-colors hover:border-transparent">
                  Explore the pools
                </Link>{" "}
                and start trading!
              </p>
            ) : (
              <div className="max-w-6xl mx-auto space-y-12">
                <div
                  className={cn(
                    "grid grid-cols-2 gap-8 w-full",
                    portfolioCombined ? "md:grid-cols-3" : "md:grid-col-2"
                  )}
                >
                  <StatBlock label="Total long (USD)" value={usdFormatter.format(totalLong)} />
                  <StatBlock label="Total short (USD)" value={usdFormatter.format(totalShort)} />
                  {portfolioCombined && portfolio && portfolio.long.length > 0 && portfolio.short.length && (
                    <div className="col-span-2 md:col-span-1">
                      <StatBlock
                        label="Active pools"
                        value={
                          <div className="flex items-center gap-4">
                            {groupedNumberFormatterDyn.format(portfolio.long.length + portfolio.short.length)}
                            <ul className="flex items-center -space-x-2">
                              {portfolioCombined.slice(0, 5).map((group, index) => (
                                <li className="rounded-full bg-white">
                                  <Image
                                    src={getTokenImageURL(group.pool.token.info.state.mint.toBase58())}
                                    alt={group.pool.token.meta.tokenSymbol}
                                    width={24}
                                    height={24}
                                    key={index}
                                    className="rounded-full ring-1 ring-primary"
                                  />
                                </li>
                              ))}
                            </ul>
                            {portfolioCombined?.length - 5 > 0 && (
                              <p className="text-sm text-muted-foreground">+{portfolioCombined?.length - 5} more</p>
                            )}
                          </div>
                        }
                      />
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-12 w-full md:grid-cols-2">
                  <div className="space-y-6">
                    <h2 className="text-2xl font-medium">Long positions</h2>
                    <div className="space-y-8">
                      {portfolio && portfolio.long.length > 0 ? (
                        portfolio.long.map((group, index) => (
                          <PositionCard key={index} groupData={group} isLong={true} />
                        ))
                      ) : (
                        <p className="text-muted-foreground">
                          You do not have any open long positions.{" "}
                          <Link
                            href="/"
                            className="border-b border-muted-foreground transition-colors hover:border-transparent"
                          >
                            Explore the arena pools
                          </Link>
                          .
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <h2 className="text-2xl font-medium">Short positions</h2>
                    <div className="space-y-8">
                      {portfolio && portfolio.short.length > 0 ? (
                        portfolio.short.map((group, index) => (
                          <PositionCard key={index} groupData={group} isLong={false} />
                        ))
                      ) : (
                        <p className="text-muted-foreground">
                          You do not have any open short positions.{" "}
                          <Link
                            href="/"
                            className="border-b border-muted-foreground transition-colors hover:border-transparent"
                          >
                            Explore the arena pools
                          </Link>
                          .
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <div>{/* <LpPositionList /> */}</div>
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
