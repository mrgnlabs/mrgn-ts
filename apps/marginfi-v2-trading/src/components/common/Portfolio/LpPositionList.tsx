import React from "react";
import Link from "next/link";
import Image from "next/image";

import { aprToApy, numeralFormatter, percentFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { Desktop, Mobile } from "@mrgnlabs/mrgn-utils";

import { LpActionButtons } from "~/components/common/Portfolio";
import { Table, TableBody, TableHead, TableCell, TableHeader, TableRow } from "~/components/ui/table";
import { useExtendedPools } from "~/hooks/useExtendedPools";
import { GroupStatus } from "~/types/trade-store.types";
import { Button } from "~/components/ui/button";
import { IconExternalLink } from "@tabler/icons-react";

export const LpPositionList = () => {
  const extendedPools = useExtendedPools();

  const lpPositions = React.useMemo(() => {
    return extendedPools.filter((pool) => pool.status === GroupStatus.LP);
  }, [extendedPools]);

  if (!lpPositions.length) {
    return null;
  }

  return (
    <>
      <div className="flex items-center justify-between pt-4 pb-6">
        <div className="space-y-2">
          <h2 className="font-medium text-2xl">Providing Liquidity</h2>
          <p className="text-muted-foreground text-sm">
            Provide liquidity to trading pools and earn yield.{" "}
            <Link href="https://docs.mrgn.xyz" className="border-b">
              <IconExternalLink size={14} className="inline-block mr-0.5 relative -translate-y-[1px]" />
              Learn more
            </Link>
          </p>
        </div>
        <Link href="/yield">
          <Button variant="secondary" size="sm">
            View all pools
          </Button>
        </Link>
      </div>
      <Desktop>
        <div className="rounded-xl">
          <Table className="min-w-[600px] overflow-auto">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Pool</TableHead>
                <TableHead>Base Token</TableHead>
                <TableHead>Quote Token</TableHead>
                <TableHead>Total Size (USD)</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lpPositions.map((pool, i) => {
                return (
                  <TableRow key={i} className="even:bg-white/50 hover:even:bg-white/50">
                    <TableCell>
                      <Link
                        href={`/trade/${pool.groupPk.toBase58()}`}
                        className="flex items-center gap-3 transition-colors shrink-0"
                      >
                        <div className="flex shrink-0">
                          <Image
                            src={pool.tokenBank.meta.tokenLogoUri}
                            width={24}
                            height={24}
                            alt={pool.tokenBank.meta.tokenSymbol}
                            className="rounded-full shrink-0 z-20 bg-background w-[24px] h-[24px] object-cover"
                          />
                          <Image
                            src={pool.quoteBank.meta.tokenLogoUri}
                            width={24}
                            height={24}
                            alt={pool.quoteBank.meta.tokenSymbol}
                            className="rounded-full shrink-0 ml-[-12px] z-10 bg-background w-[24px] h-[24px] object-cover"
                          />
                        </div>{" "}
                        {`${pool.tokenBank.meta.tokenSymbol}/${pool.quoteBank.meta.tokenSymbol} `}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {pool.tokenBank.isActive
                          ? pool.tokenBank.position.amount < 0.01
                            ? "0.01"
                            : numeralFormatter(pool.tokenBank.position.amount)
                          : 0}
                        {" " + pool.tokenBank.meta.tokenSymbol}
                        <div className="text-xs text-mrgn-green">
                          {percentFormatter.format(aprToApy(pool.tokenBank.info.state.lendingRate))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {pool.quoteBank.isActive
                          ? pool.quoteBank.position.amount < 0.01
                            ? "0.01"
                            : numeralFormatter(pool.quoteBank.position.amount)
                          : 0}
                        {" " + pool.quoteBank.meta.tokenSymbol}
                        <div className="text-xs text-mrgn-green">
                          {percentFormatter.format(aprToApy(pool.quoteBank.info.state.lendingRate))}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {(pool.tokenBank.isActive || pool.quoteBank.isActive) &&
                        usdFormatter.format(
                          (pool.tokenBank.isActive ? pool.tokenBank.position.usdValue : 0) +
                            (pool.quoteBank.isActive ? pool.quoteBank.position.usdValue : 0)
                        )}
                    </TableCell>

                    <TableCell>
                      <LpActionButtons activePool={pool} />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </Desktop>
      <Mobile>
        <div className="space-y-8">
          {lpPositions.map((pool, i) => {
            return (
              <div key={i} className="bg-background border border-border rounded-lg p-4 space-y-4">
                <Link
                  href={`/trade/${pool.groupPk.toBase58()}`}
                  className="flex items-center gap-3 transition-colors shrink-0"
                >
                  <div className="flex shrink-0">
                    <Image
                      src={pool.tokenBank.meta.tokenLogoUri}
                      width={24}
                      height={24}
                      alt={pool.tokenBank.meta.tokenSymbol}
                      className="rounded-full shrink-0 z-20 bg-background"
                    />
                    <Image
                      src={pool.quoteBank.meta.tokenLogoUri}
                      width={24}
                      height={24}
                      alt={pool.quoteBank.meta.tokenSymbol}
                      className="rounded-full shrink-0 ml-[-12px] z-10 bg-background"
                    />
                  </div>{" "}
                  {`${pool.tokenBank.meta.tokenSymbol}/${pool.quoteBank.meta.tokenSymbol} `}
                </Link>
                <div>
                  <div className="bg-accent rounded-lg p-2">
                    <p className="flex justify-between gap-2 text-muted-foreground">
                      {pool.tokenBank.meta.tokenSymbol} supplied
                      <span className="text-primary">
                        {usdFormatter.format(
                          pool.tokenBank.isActive
                            ? pool.tokenBank.position.amount *
                                pool.tokenBank.info.oraclePrice.priceRealtime.price.toNumber()
                            : 0
                        )}
                      </span>
                    </p>
                    <p className="flex justify-between gap-2 text-muted-foreground">
                      {pool.quoteBank.meta.tokenSymbol} supplied
                      <span className="text-primary">
                        {usdFormatter.format(
                          pool.quoteBank.isActive
                            ? pool.quoteBank.position.amount *
                                pool.quoteBank.info.oraclePrice.priceRealtime.price.toNumber()
                            : 0
                        )}
                      </span>
                    </p>
                  </div>
                </div>
                <div>
                  <LpActionButtons size="lg" activePool={pool} />
                </div>
              </div>
            );
          })}
        </div>
      </Mobile>
    </>
  );
};
