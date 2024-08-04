import React from "react";

import Image from "next/image";
import Link from "next/link";

import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { numeralFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { getTokenImageURL } from "~/utils";
import { useTradeStore } from "~/store";

import { LpActionButtons } from "~/components/common/Portfolio";
import { Table, TableBody, TableHead, TableCell, TableHeader, TableRow } from "~/components/ui/table";
import { ActiveGroup } from "~/store/tradeStore";

export const LpPositionList = () => {
  const [marginfiAccounts, portfolio] = useTradeStore((state) => [state.marginfiAccounts, state.portfolio]);

  if (!portfolio || !portfolio.lpPositions.length) {
    return null;
  }

  return (
    <>
      <h2 className="font-medium text-2xl mt-10 mb-4">LP Positions</h2>
      <div className="rounded-xl">
        <Table className="min-w-[600px] overflow-auto">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[20%]">Pool</TableHead>
              <TableHead className="w-[20%]">Token Size</TableHead>
              <TableHead className="w-[20%]">USDC Size</TableHead>
              <TableHead className="w-[20%]">USD Value</TableHead>
              <TableHead className="w-[20%]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {portfolio.lpPositions.map((group, i) => {
              const marginfiAccount = marginfiAccounts
                ? marginfiAccounts[group.client.group.address.toBase58()]
                : undefined;

              console.log(marginfiAccounts);

              return (
                <TableRow key={i} className="even:bg-white/50 hover:even:bg-white/50">
                  <TableCell>
                    <Link
                      href={`/pools/${group.client.group.address.toBase58()}`}
                      className="flex items-center gap-3 transition-colors hover:text-mrgn-chartreuse"
                    >
                      <div className="flex">
                        <Image
                          src={getTokenImageURL(group.pool.token.info.state.mint.toBase58())}
                          width={24}
                          height={24}
                          alt={group.pool.token.meta.tokenSymbol}
                          className="rounded-full shrink-0 z-20"
                        />
                        <Image
                          src={getTokenImageURL(group.pool.quoteTokens[0].info.state.mint.toBase58())}
                          width={24}
                          height={24}
                          alt={group.pool.quoteTokens[0].meta.tokenSymbol}
                          className="rounded-full shrink-0 ml-[-12px] z-10"
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
                        group.pool.token.isActive
                          ? group.pool.token.position.usdValue
                          : 0 + (group.pool.quoteTokens[0].isActive ? group.pool.quoteTokens[0].position.usdValue : 0)
                      )}
                  </TableCell>

                  <TableCell className="text-right">
                    {marginfiAccounts && (
                      <LpActionButtons
                        marginfiAccount={marginfiAccount}
                        activeGroup={{
                          token: group.pool.token,
                          usdc: group.pool.quoteTokens[0],
                        }}
                      />
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </>
  );
};
