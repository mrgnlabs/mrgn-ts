import React from "react";

import Image from "next/image";
import Link from "next/link";

import { numeralFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";
import { Desktop, Mobile } from "@mrgnlabs/mrgn-utils";

import { getTokenImageURL } from "~/utils";
import { useTradeStore } from "~/store";

import { LpActionButtons } from "~/components/common/Portfolio";
import { Table, TableBody, TableHead, TableCell, TableHeader, TableRow } from "~/components/ui/table";
import { Card, CardHeader, CardContent, CardFooter } from "~/components/ui/card";

export const LpPositionList = () => {
  const [portfolio] = useTradeStore((state) => [state.portfolio]);

  if (!portfolio || !portfolio.lpPositions.length) {
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
                <TableHead className="w-[20%]">USDC Size</TableHead>
                <TableHead className="w-[20%]">Total (USD)</TableHead>
                <TableHead className="w-[20%]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {portfolio.lpPositions.map((group, i) => {
                return (
                  <TableRow key={i} className="even:bg-white/50 hover:even:bg-white/50">
                    <TableCell>
                      <Link
                        href={`/trade/${group.client.group.address.toBase58()}`}
                        className="flex items-center gap-3 transition-colors shrink-0"
                      >
                        <div className="flex shrink-0">
                          <Image
                            src={getTokenImageURL(group.pool.token.info.state.mint.toBase58())}
                            width={24}
                            height={24}
                            alt={group.pool.token.meta.tokenSymbol}
                            className="rounded-full shrink-0 z-20 bg-background"
                          />
                          <Image
                            src={getTokenImageURL(group.pool.quoteTokens[0].info.state.mint.toBase58())}
                            width={24}
                            height={24}
                            alt={group.pool.quoteTokens[0].meta.tokenSymbol}
                            className="rounded-full shrink-0 ml-[-12px] z-10 bg-background"
                          />
                        </div>{" "}
                        {`${group.pool.token.meta.tokenSymbol}/${group.pool.quoteTokens[0].meta.tokenSymbol} `}
                      </Link>
                    </TableCell>
                    <TableCell>
                      {group.pool.token.isActive
                        ? group.pool.token.position.amount < 0.01
                          ? "0.01"
                          : numeralFormatter(group.pool.token.position.amount)
                        : 0}
                    </TableCell>
                    <TableCell>
                      {group.pool.quoteTokens[0].isActive
                        ? group.pool.quoteTokens[0].position.amount < 0.01
                          ? "0.01"
                          : numeralFormatter(group.pool.quoteTokens[0].position.amount)
                        : 0}
                    </TableCell>
                    <TableCell>
                      {(group.pool.token.isActive || group.pool.quoteTokens[0].isActive) &&
                        usdFormatter.format(
                          (group.pool.token.isActive ? group.pool.token.position.usdValue : 0) +
                            (group.pool.quoteTokens[0].isActive ? group.pool.quoteTokens[0].position.usdValue : 0)
                        )}
                    </TableCell>

                    <TableCell className="text-right">
                      {group.selectedAccount && (
                        <LpActionButtons marginfiAccount={group.selectedAccount} activeGroup={group} />
                      )}
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
          {portfolio.lpPositions.map((group, i) => {
            return (
              <div key={i} className="bg-background border border-border rounded-lg p-4 space-y-4">
                <Link
                  href={`/trade/${group.client.group.address.toBase58()}`}
                  className="flex items-center gap-3 transition-colors shrink-0"
                >
                  <div className="flex shrink-0">
                    <Image
                      src={getTokenImageURL(group.pool.token.info.state.mint.toBase58())}
                      width={24}
                      height={24}
                      alt={group.pool.token.meta.tokenSymbol}
                      className="rounded-full shrink-0 z-20 bg-background"
                    />
                    <Image
                      src={getTokenImageURL(group.pool.quoteTokens[0].info.state.mint.toBase58())}
                      width={24}
                      height={24}
                      alt={group.pool.quoteTokens[0].meta.tokenSymbol}
                      className="rounded-full shrink-0 ml-[-12px] z-10 bg-background"
                    />
                  </div>{" "}
                  {`${group.pool.token.meta.tokenSymbol}/${group.pool.quoteTokens[0].meta.tokenSymbol} `}
                </Link>
                <div>
                  <div className="bg-accent rounded-lg p-2">
                    <p className="flex justify-between gap-2 text-muted-foreground">
                      {group.pool.token.meta.tokenSymbol} supplied
                      <span className="text-primary">
                        {usdFormatter.format(
                          group.pool.token.isActive
                            ? group.pool.token.position.amount *
                                group.pool.token.info.oraclePrice.priceRealtime.price.toNumber()
                            : 0
                        )}
                      </span>
                    </p>
                    <p className="flex justify-between gap-2 text-muted-foreground">
                      {group.pool.quoteTokens[0].meta.tokenSymbol} supplied
                      <span className="text-primary">
                        {usdFormatter.format(
                          group.pool.quoteTokens[0].isActive
                            ? group.pool.quoteTokens[0].position.amount *
                                group.pool.quoteTokens[0].info.oraclePrice.priceRealtime.price.toNumber()
                            : 0
                        )}
                      </span>
                    </p>
                  </div>
                </div>
                <div>
                  <LpActionButtons size="lg" marginfiAccount={group.selectedAccount || undefined} activeGroup={group} />
                </div>
              </div>
            );
          })}
        </div>
      </Mobile>
    </>
  );
};
