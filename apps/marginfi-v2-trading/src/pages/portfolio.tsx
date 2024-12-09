import React from "react";

import Image from "next/image";
import Link from "next/link";

import { useActionBoxStore } from "~/components/action-box-v2/store";
import { groupedNumberFormatterDyn, usdFormatter } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";

import { useTradeStoreV2 } from "~/store";

import { ActionComplete } from "~/components/action-complete";
import { PageHeading } from "~/components/common/PageHeading";
import { PositionCard, LpPositionList } from "~/components/common/Portfolio";
import { Loader } from "~/components/common/Loader";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { useExtendedPools } from "~/hooks/useExtendedPools";
import { GroupStatus } from "~/store/tradeStoreV2";

export default function PortfolioPage() {
  const [initialized] = useTradeStoreV2((state) => [state.initialized]);
  const extendedPools = useExtendedPools();
  const [isActionComplete, previousTxn, setIsActionComplete] = useActionBoxStore((state) => [
    state.isActionComplete,
    state.previousTxn,
    state.setIsActionComplete,
  ]);

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

  const totalLong = React.useMemo(() => {
    return longPositions.reduce(
      (acc, pool) => (pool.tokenBank.isActive ? acc + pool.tokenBank.position.usdValue : 0),
      0
    );
  }, [longPositions]);

  const totalShort = React.useMemo(() => {
    return shortPositions.reduce(
      (acc, pool) => (pool.tokenBank.isActive ? acc + pool.tokenBank.position.usdValue : 0),
      0
    );
  }, [shortPositions]);

  const portfolioCombined = React.useMemo(() => {
    return [...longPositions, ...shortPositions, ...lpPositions].sort((a, b) =>
      a.tokenBank.isActive && b.tokenBank.isActive ? a.tokenBank.position.usdValue - b.tokenBank.position.usdValue : 0
    );
  }, [longPositions, shortPositions, lpPositions]);

  return (
    <>
      <div className="w-full max-w-8xl mx-auto px-4 md:px-8 pb-28 pt-12 min-h-[calc(100vh-100px)]">
        {!initialized && <Loader label="Loading portfolio..." className="mt-8" />}
        {initialized && (
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
                    "grid grid-cols-2 gap-8 w-full",
                    portfolioCombined ? "md:grid-cols-3" : "md:grid-col-2"
                  )}
                >
                  <StatBlock label="Total long (USD)" value={usdFormatter.format(totalLong)} />
                  <StatBlock label="Total short (USD)" value={usdFormatter.format(totalShort)} />
                  {portfolioCombined && portfolioCombined.length > 0 && (
                    <div className="col-span-2 md:col-span-1">
                      <StatBlock
                        label="Active pools"
                        value={
                          <div className="flex items-center gap-4">
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
      {initialized && previousTxn && (
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
};

const StatBlock = ({ label, value, subValue }: StatProps) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base text-muted-foreground font-normal">{label}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className="text-3xl">
        {value} {subValue && <span className="text-lg text-muted-foreground">{subValue}</span>}
      </div>
    </CardContent>
  </Card>
);
