import React from "react";
import { Row, flexRender } from "@tanstack/react-table";

import { useUiStore } from "~/store";

import { TableCell, TableRow } from "~/components/ui/table";

import { getPositionCell } from "./AssetCells";
import { AssetListModel } from "../utils";
import { cn, PoolTypes } from "@mrgnlabs/mrgn-utils";

export const AssetRow = (row: Row<AssetListModel>) => {
  const isPosition = React.useMemo(
    () => row.original.position.walletAmount || row.original.position.positionAmount,
    [row.original.position]
  );
  const [assetListSearch, poolFilter] = useUiStore((state) => [state.assetListSearch, state.poolFilter]);

  const isStakedActivating = row.original.asset.stakePool && !row.original.asset.stakePool?.isActive;

  if (
    assetListSearch.length > 1 &&
    !row.original.asset.name.toLowerCase().includes(assetListSearch.toLowerCase()) &&
    !row.original.asset.symbol.toLowerCase().includes(assetListSearch.toLowerCase())
  ) {
    return null;
  }

  const visibleCells = row.getVisibleCells().filter((cell) => {
    // Filter out rate column for native stake pool
    if (poolFilter === PoolTypes.NATIVE_STAKE && cell.column.id === "rate") {
      return false;
    }
    return true;
  });

  return (
    <React.Fragment key={row.id}>
      <TableRow key={row.id} className={cn(isStakedActivating && "opacity-50")}>
        {visibleCells.map((cell, idx) => (
          <TableCell className={cn(!isPosition ? "pb-2 rounded-md" : "rounded-t-md")} key={cell.id}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>

      {isPosition && (
        <TableRow>
          <TableCell showPadding={true} className={cn("rounded-b-md", "pb-2")} colSpan={visibleCells.length}>
            {getPositionCell(row.original.position)}
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
};
