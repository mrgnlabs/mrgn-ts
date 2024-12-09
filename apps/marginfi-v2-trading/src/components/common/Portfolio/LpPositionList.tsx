import React from "react";

import Image from "next/image";
import Link from "next/link";

import { numeralFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { Desktop, Mobile } from "@mrgnlabs/mrgn-utils";

import { LpActionButtons } from "~/components/common/Portfolio";
import { Table, TableBody, TableHead, TableCell, TableHeader, TableRow } from "~/components/ui/table";
import { useExtendedPools } from "~/hooks/useExtendedPools";
import { GroupStatus } from "~/store/tradeStoreV2";

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
      <h2 className="font-medium text-2xl mt-10 mb-4">LP Positions</h2>
      <Desktop>
        <div className="rounded-xl">
          <Table className="min-w-[600px] overflow-auto">
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="w-[20%]">Pool</TableHead>
                <TableHead className="w-[20%]">Token Size</TableHead>
                <TableHead className="w-[20%]">Quote Size</TableHead>
                <TableHead className="w-[20%]">Total (USD)</TableHead>
                <TableHead className="w-[20%]"></TableHead>
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
                    </TableCell>
                    <TableCell>
                      {pool.tokenBank.isActive
                        ? pool.tokenBank.position.amount < 0.01
                          ? "0.01"
                          : numeralFormatter(pool.tokenBank.position.amount)
                        : 0}
                      {" " + pool.tokenBank.meta.tokenSymbol}
                    </TableCell>
                    <TableCell>
                      {pool.quoteBank.isActive
                        ? pool.quoteBank.position.amount < 0.01
                          ? "0.01"
                          : numeralFormatter(pool.quoteBank.position.amount)
                        : 0}
                      {" " + pool.quoteBank.meta.tokenSymbol}
                    </TableCell>
                    <TableCell>
                      {(pool.tokenBank.isActive || pool.quoteBank.isActive) &&
                        usdFormatter.format(
                          (pool.tokenBank.isActive ? pool.tokenBank.position.usdValue : 0) +
                            (pool.quoteBank.isActive ? pool.quoteBank.position.usdValue : 0)
                        )}
                    </TableCell>

                    <TableCell className="text-right">
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
