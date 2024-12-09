import React from "react";

import Image from "next/image";
import Link from "next/link";

import { ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { numeralFormatter, tokenPriceFormatter, usdFormatter } from "@mrgnlabs/mrgn-common";

import { useTradeStore } from "~/store";

import { PositionActionButtons } from "~/components/common/Portfolio";
import { Table, TableBody, TableHead, TableCell, TableHeader, TableRow } from "~/components/ui/table";
import { Badge } from "~/components/ui/badge";
import { GroupData } from "~/store/tradeStore";
import { PublicKey } from "@solana/web3.js";
import { PositionListItem } from "./PositionListItem";
import { ArenaPoolV2, ArenaPoolV2Extended, GroupStatus } from "~/store/tradeStoreV2";
import { useExtendedPool, useExtendedPools } from "~/hooks/useExtendedPools";

export const PositionList = ({ activePool }: { activePool: ArenaPoolV2 }) => {
  const extendedPools = useExtendedPools();

  const portfolioCombined = React.useMemo(() => {
    if (!extendedPools) return [];
    const isActiveGroupPosition = (item: ArenaPoolV2Extended) => item.groupPk.equals(activePool.groupPk);

    const longPositions = extendedPools.filter((pool) => pool.status === GroupStatus.LONG);
    const shortPositions = extendedPools.filter((pool) => pool.status === GroupStatus.SHORT);

    const activeGroupPosition = [...longPositions, ...shortPositions].find(isActiveGroupPosition);

    const sortedLongs = longPositions.filter((item) => !isActiveGroupPosition(item));
    const sortedShorts = shortPositions.filter((item) => !isActiveGroupPosition(item));

    return [...(activeGroupPosition ? [activeGroupPosition] : []), ...sortedLongs, ...sortedShorts];
  }, [extendedPools, activePool]);

  if (!portfolioCombined) return null;

  return (
    <div className="rounded-xl">
      <Table className="min-w-[1080px] overflow-auto">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-[14%]">Position</TableHead>
            <TableHead className="w-[14%]">Token</TableHead>
            <TableHead className="w-[14%]">Value</TableHead>
            <TableHead className="w-[14%]">Leverage</TableHead>
            <TableHead className="w-[14%]">Size</TableHead>
            <TableHead className="w-[14%]">Price (USD)</TableHead>
            <TableHead className="w-[14%]">Liquidation price</TableHead>
            <TableHead className="w-[14%]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {portfolioCombined.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7}>
                <p className="text-sm text-muted-foreground pt-2">No positions found</p>
              </TableCell>
            </TableRow>
          ) : (
            <></>
          )}

          {portfolioCombined.map((pool, index) => {
            return <PositionListItem key={index} arenaPool={pool} />;
          })}
        </TableBody>
      </Table>
    </div>
  );
};
