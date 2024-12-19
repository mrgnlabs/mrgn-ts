import React from "react";

import Image from "next/image";
import Link from "next/link";

import { dynamicNumeralFormatter, groupedNumberFormatterDyn } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";

import { useTradeStoreV2 } from "~/store";
import { useActionBoxStore } from "~/components/action-box-v2/store";

import { ActionComplete } from "~/components/action-complete";
import { PageHeading } from "~/components/common/PageHeading";
import { PositionCard, LpPositionList } from "~/components/common/Portfolio";
import { Loader } from "~/components/common/Loader";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useExtendedPools } from "~/hooks/useExtendedPools";
import { GroupStatus } from "~/types/trade-store.types";
import { GetStaticProps } from "next";
import { StaticArenaProps, getArenaStaticProps } from "~/utils";

export const getStaticProps: GetStaticProps<StaticArenaProps> = async (context) => {
  return getArenaStaticProps(context);
};

export default function PortfolioPage({ initialData }: StaticArenaProps) {
  const [poolsFetched, fetchArenaGroups, setHydrationComplete, positionsByGroupPk] = useTradeStoreV2((state) => [
    state.poolsFetched,
    state.fetchArenaGroups,
    state.setHydrationComplete,
    state.positionsByGroupPk,
  ]);
  const extendedPools = useExtendedPools();
  const [isActionComplete, previousTxn, setIsActionComplete] = useActionBoxStore((state) => [
    state.isActionComplete,
    state.previousTxn,
    state.setIsActionComplete,
  ]);

  React.useEffect(() => {
    if (initialData) {
      fetchArenaGroups(initialData);
      setHydrationComplete();
    }
  }, [initialData, fetchArenaGroups, setHydrationComplete]);

  const shortPositions = React.useMemo(
    () => extendedPools.filter((pool) => pool.status === GroupStatus.SHORT),
    [extendedPools]
  );
  const longPositions = React.useMemo(
    () => extendedPools.filter((pool) => pool.status === GroupStatus.LONG),
    [extendedPools]
  );
  const lpPositions = React.useMemo(
    () => extendedPools.filter((pool) => pool.status === GroupStatus.LP),
    [extendedPools]
  );

  const portfolioSize = React.useMemo(() => {
    const longSize = longPositions.reduce(
      (acc, pool) => (pool.tokenBank.isActive ? acc + pool.tokenBank.position.usdValue : 0),
      0
    );
    const shortSize = shortPositions.reduce(
      (acc, pool) => (pool.tokenBank.isActive ? acc + pool.tokenBank.position.usdValue : 0),
      0
    );
    return longSize + shortSize;
  }, [longPositions, shortPositions]);

  const portfolioPnl = React.useMemo(() => {
    return Object.values(positionsByGroupPk).reduce((acc, position) => acc + position.pnl, 0);
  }, [positionsByGroupPk]);

  const portfolioCombined = React.useMemo(() => {
    return [...longPositions, ...shortPositions, ...lpPositions].sort((a, b) =>
      a.tokenBank.isActive && b.tokenBank.isActive ? a.tokenBank.position.usdValue - b.tokenBank.position.usdValue : 0
    );
  }, [longPositions, shortPositions, lpPositions]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 pt-12 min-h-[calc(100vh-100px)]">
        {!poolsFetched && <Loader label="Loading portfolio..." className="mt-8" />}
        {poolsFetched && (
          <div className="space-y-4">
            <div className="w-full max-w-4xl mx-auto px-4 md:px-0">
              <PageHeading heading="Portfolio" body={<p>Manage your positions in the arena.</p>} links={[]} />
            </div>
            {portfolioCombined.length === 0 ? (
              <p className="text-center mt-4">
                You do not have any open positions.
                <br className="md:hidden" />{" "}
                <Link href="/" className="border-b border-primary transition-colors hover:border-transparent">
                  Explore the pools
                </Link>{" "}
                and start trading!
              </p>
            ) : (
              <div className="max-w-6xl mx-auto space-y-12">
                <div
                  className={cn(
                    "grid grid-cols-2 gap-4 md:gap-8 w-full",
                    portfolioCombined ? "md:grid-cols-3" : "md:grid-cols-2"
                  )}
                >
                  <StatBlock label="Portfolio Size" value={`$${dynamicNumeralFormatter(portfolioSize)}`} />
                  <StatBlock
                    label="Portfolio PnL"
                    value={`${portfolioPnl > 0 ? "+" : ""}$${dynamicNumeralFormatter(portfolioPnl)}`}
                    valueNum={portfolioPnl}
                  />
                  {portfolioCombined && portfolioCombined.length > 0 && (
                    <div className="col-span-2 md:col-span-1">
                      <StatBlock
                        label="Active pools"
                        value={
                          <div className="flex items-center gap-2">
                            {groupedNumberFormatterDyn.format(portfolioCombined.length)}
                            <ul className="flex items-center -space-x-2">
                              {portfolioCombined.slice(0, 5).map((pool, index) => (
                                <li key={index} className="rounded-full bg-white">
                                  <Image
                                    src={pool.tokenBank.meta.tokenLogoUri}
                                    alt={pool.tokenBank.meta.tokenSymbol}
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
                  {longPositions.length > 0 && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-medium">Long positions</h2>
                      <div className="space-y-8">
                        {longPositions.map((pool, index) => (
                          <PositionCard key={index} arenaPool={pool} />
                        ))}
                      </div>
                    </div>
                  )}
                  {shortPositions.length > 0 && (
                    <div className="space-y-6">
                      <h2 className="text-2xl font-medium">Short positions</h2>
                      <div className="space-y-8">
                        {shortPositions.map((pool, index) => (
                          <PositionCard key={index} arenaPool={pool} />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div>
                  <LpPositionList />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      {poolsFetched && previousTxn && (
        <ActionComplete
          isActionComplete={isActionComplete}
          setIsActionComplete={setIsActionComplete}
          previousTxn={previousTxn}
        />
      )}
    </>
  );
}

type StatProps = {
  label: JSX.Element | string;
  value: JSX.Element | string;
  subValue?: JSX.Element | string;
  valueNum?: number;
};

const StatBlock = ({ label, value, subValue, valueNum }: StatProps) => (
  <Card>
    <CardHeader className="p-4 md:p-6 pb-0 md:pb-0">
      <CardTitle className="text-base text-muted-foreground font-normal">{label}</CardTitle>
    </CardHeader>
    <CardContent className="p-4 pt-2 md:p-6 md:pt-2">
      <div className="text-xl md:text-3xl">
        <span
          className={cn(
            "text-muted-foreground",
            valueNum && valueNum > 0 && "text-mrgn-success",
            valueNum && valueNum < 0 && "text-mrgn-error"
          )}
        >
          {value}
        </span>{" "}
        {subValue && <span className="text-lg text-muted-foreground">{subValue}</span>}
      </div>
    </CardContent>
  </Card>
);
