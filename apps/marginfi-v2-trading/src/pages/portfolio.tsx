import React from "react";

import Image from "next/image";
import Link from "next/link";

import { toPng } from "html-to-image";
import { dynamicNumeralFormatter, groupedNumberFormatterDyn, usdFormatter } from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";
import { IconCopy, IconDownload } from "@tabler/icons-react";

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
import { Dialog, DialogContent, DialogTrigger } from "~/components/ui/dialog";
import { IconArena } from "~/components/ui/icons";
import { Button } from "~/components/ui/button";

export const getStaticProps: GetStaticProps<StaticArenaProps> = async (context) => {
  return getArenaStaticProps(context);
};

export default function PortfolioPage({ initialData }: StaticArenaProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [poolsFetched, fetchArenaGroups, setHydrationComplete] = useTradeStoreV2((state) => [
    state.poolsFetched,
    state.fetchArenaGroups,
    state.setHydrationComplete,
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

  const captureImage = () => {
    if (!cardRef.current) return;
    toPng(cardRef.current)
      .then((dataUrl) => {
        // Copy to clipboard on desktop
        if (navigator.clipboard) {
          fetch(dataUrl)
            .then((res) => res.blob())
            .then((blob) => navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]))
            .then(() => alert("Image copied to clipboard!"));
        }

        // Trigger native share on mobile
        if (navigator.share) {
          navigator.share({
            title: "Check out my trade!",
            text: "My trade position and PnL",
            files: [new File([dataUrl], "trade.png", { type: "image/png" })],
          });
        }
      })
      .catch((err) => console.error("Error capturing image:", err));
  };

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
                    "grid grid-cols-2 gap-8 w-full",
                    portfolioCombined ? "md:grid-cols-3" : "md:grid-col-2"
                  )}
                >
                  <StatBlock label="Total long (USD)" value={`$${dynamicNumeralFormatter(totalLong)}`} />
                  <StatBlock label="Total short (USD)" value={`$${dynamicNumeralFormatter(totalShort)}`} />
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

        <Dialog>
          <DialogTrigger asChild>
            <button className="mt-16">Share My Position</button>
          </DialogTrigger>
          <DialogContent>
            <div ref={cardRef} className="w-[480px] h-[250px] relative">
              <Image src="/sharing/share-position-bg.png" alt="arena bg" width={480} height={250} />
              <div className="absolute top-0 left-0 w-full h-full">
                {/* <div className="p-2 flex items-center gap-2 font-orbitron text-xl font-medium">
                  <IconArena size={32} />
                  The Arena
                </div> */}
                <div className="p-2 pt-14 pr-6 flex flex-col items-end justify-end w-full gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">PnL</span>
                    <div className="flex items-center gap-2 bg-success/20 rounded-full py-0.5 px-1 text-xs text-success">
                      +12%
                    </div>
                  </div>
                  <span className="text-mrgn-success text-4xl">+$123.45</span>
                </div>
                <dl className="absolute bottom-0 left-0 pb-2 px-6 w-full grid grid-cols-2 gap-1">
                  <dt className="text-sm text-muted-foreground">Leverage</dt>
                  <dd className="text-base font-medium text-right">2.75x</dd>
                  <dt className="text-sm text-muted-foreground">Size</dt>
                  <dd className="text-base font-medium text-right">$100</dd>
                  <dt className="text-sm text-muted-foreground">Entry price</dt>
                  <dd className="text-base font-medium text-right">$0.0034</dd>
                </dl>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full">
              <Button variant="outline" onClick={captureImage} className="w-full">
                <IconCopy size={16} />
                Copy
              </Button>
              <Button variant="outline" onClick={captureImage} className="w-full">
                <IconDownload size={16} />
                Download
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
