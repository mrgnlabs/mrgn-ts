import React from "react";

import Image from "next/image";
import Link from "next/link";

import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { numeralFormatter, tokenPriceFormatter, usdFormatter, percentFormatter } from "@mrgnlabs/mrgn-common";

import { getTokenImageURL } from "~/utils";
import { useTradeStore } from "~/store";

import { PositionActionButtons } from "~/components/common/Portfolio";
import { Table, TableBody, TableHead, TableCell, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { ActiveGroup, GroupData } from "~/store/tradeStore";

export const PositionList = () => {
  const [marginfiClient, activeGroupPk, groupMap, portfolio] = useTradeStore((state) => [
    state.marginfiClient,
    state.activeGroup,
    state.groupMap,
    state.portfolio,
  ]);

  const activeGroup = React.useMemo(() => {
    return activeGroupPk ? groupMap.get(activeGroupPk.toBase58()) : undefined;
  }, [activeGroupPk, groupMap]);

  const portfolioCombined = React.useMemo(() => {
    if (!portfolio || !activeGroup) return [];

    const isActiveGroupPosition = (item: GroupData) => item.pool.token.address.equals(activeGroup.pool.token.address);

    const activeGroupPosition = [...portfolio.long, ...portfolio.short].find(isActiveGroupPosition);

    const sortedLongs = portfolio.long.filter((item) => !isActiveGroupPosition(item));
    const sortedShorts = portfolio.short.filter((item) => !isActiveGroupPosition(item));

    return [...(activeGroupPosition ? [activeGroupPosition] : []), ...sortedLongs, ...sortedShorts];
  }, [portfolio, activeGroup]);

  if (!portfolio) return null;

  return (
    <div className="rounded-xl">
      <Table className="min-w-[1080px] overflow-auto">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[14%]">Position</TableHead>
            <TableHead className="w-[14%]">Token</TableHead>
            <TableHead className="w-[14%]">Size</TableHead>
            <TableHead className="w-[14%]">Leverage</TableHead>
            <TableHead className="w-[14%]">USD Value</TableHead>
            <TableHead className="w-[14%]">Price</TableHead>
            <TableHead className="w-[14%]">Liquidation price</TableHead>
            <TableHead className="w-[14%]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {portfolio.long.length === 0 && portfolio.short.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <p className="text-sm text-muted-foreground pt-2">No positions found</p>
              </TableCell>
            </TableRow>
          ) : (
            <></>
          )}

          {portfolioCombined.map((group, index) => {
            const borrowBank =
              group.pool.token.isActive && group.pool.token.position.isLending
                ? group.pool.quoteTokens[0]
                : group.pool.token;
            const depositBank = group.pool.token.address.equals(borrowBank.address)
              ? group.pool.quoteTokens[0]
              : group.pool.token;
            const isBorrowing = borrowBank.isActive && !borrowBank.position.isLending;
            const activeGroup: ActiveGroup = {
              usdc: group.pool.quoteTokens[0],
              token: group.pool.token,
            };

            const usdValue =
              (depositBank.isActive ? depositBank.position.usdValue : 0) -
              (borrowBank.isActive ? borrowBank.position.usdValue : 0);

            let leverage = "1";
            if (borrowBank.isActive && depositBank.isActive) {
              const borrowUsd = borrowBank.position.usdValue;
              const depositUsd = depositBank.position.usdValue;

              leverage = numeralFormatter(Math.round((borrowUsd / depositUsd + Number.EPSILON) * 100) / 100 + 1);
            }

            return (
              <TableRow key={index} className="even:bg-white/50 hover:even:bg-white/50">
                <TableCell>
                  {group.pool.token.isActive && group.pool.token.position.isLending ? (
                    <Badge className="w-14 bg-success uppercase font-medium justify-center">long</Badge>
                  ) : (
                    <Badge className="w-14 bg-error uppercase font-medium justify-center">short</Badge>
                  )}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/pools/${group.client.group.address.toBase58()}`}
                    className="flex items-center gap-3 transition-colors hover:text-mrgn-chartreuse"
                  >
                    <Image
                      src={getTokenImageURL(group.pool.token.info.state.mint.toBase58())}
                      width={24}
                      height={24}
                      alt={group.pool.token.meta.tokenSymbol}
                      className="rounded-full shrink-0"
                    />{" "}
                    {group.pool.token.meta.tokenSymbol}
                  </Link>
                </TableCell>
                <TableCell>
                  {group.pool.token.isActive && group.pool.token.position.amount < 0.01
                    ? "0.01"
                    : group.pool.token.isActive
                    ? numeralFormatter(group.pool.token.position.amount)
                    : 0}
                </TableCell>
                <TableCell>{`${leverage}x`}</TableCell>
                <TableCell>{usdFormatter.format(usdValue)}</TableCell>
                <TableCell>
                  {group.pool.token.isActive &&
                  group.pool.token.info.oraclePrice.priceRealtime.price.toNumber() > 0.00001
                    ? tokenPriceFormatter.format(group.pool.token.info.oraclePrice.priceRealtime.price.toNumber())
                    : `$${
                        group.pool.token.isActive
                          ? group.pool.token.info.oraclePrice.priceRealtime.price.toExponential(2)
                          : 0
                      }`}
                </TableCell>
                <TableCell>
                  {group.pool.token.isActive && group.pool.token.position.liquidationPrice ? (
                    <>
                      {group.pool.token.position.liquidationPrice > 0.00001
                        ? tokenPriceFormatter.format(group.pool.token.position.liquidationPrice)
                        : `$${
                            group.pool.token.isActive ? group.pool.token.position.liquidationPrice.toExponential(2) : 0
                          }`}
                    </>
                  ) : (
                    "n/a"
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {group.selectedAccount && (
                    <PositionActionButtons
                      marginfiClient={marginfiClient}
                      marginfiAccount={group.selectedAccount}
                      isBorrowing={isBorrowing}
                      bank={group.pool.token as ActiveBankInfo}
                      activeGroup={activeGroup}
                      collateralBank={group.pool.quoteTokens[0] as ActiveBankInfo}
                    />
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
};
