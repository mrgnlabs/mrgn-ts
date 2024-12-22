import React from "react";

import { useIsMobile, cn } from "@mrgnlabs/mrgn-utils";

import { ArenaPoolV2, ArenaPoolV2Extended, GroupStatus } from "~/types/trade-store.types";
import { useExtendedPools } from "~/hooks/useExtendedPools";
import { usePositionsData } from "~/hooks/usePositionsData";

import { PositionListItem } from "./PositionListItem";
import { PositionCard } from "~/components/common/Portfolio";
import { Table, TableBody, TableHead, TableCell, TableHeader, TableRow } from "~/components/ui/table";

export const PositionList = ({ activePool }: { activePool: ArenaPoolV2 }) => {
  const isMobile = useIsMobile();
  const extendedPools = useExtendedPools();
  const positionsData = usePositionsData({ groupPk: activePool.groupPk });

  const activePoolExtended = extendedPools.find((pool) => pool.groupPk.equals(activePool.groupPk));

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

  if (isMobile && positionsData && activePoolExtended) {
    return (
      <div className="space-y-2 px-2">
        <p className="flex items-center text-sm">
          <span
            className={cn(
              "flex w-2.5 h-2.5 rounded-full mr-2",
              activePoolExtended.tokenBank.isActive && activePoolExtended.tokenBank.position.isLending
                ? "bg-mrgn-green"
                : "bg-mrgn-error"
            )}
          ></span>
          Open{" "}
          {activePoolExtended.tokenBank.isActive && activePoolExtended.tokenBank.position.isLending
            ? "long "
            : "short "}
          position
        </p>
        <PositionCard arenaPool={activePoolExtended} size="sm" />
      </div>
    );
  }

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
            <TableHead className="w-[14%]">PNL</TableHead>
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
