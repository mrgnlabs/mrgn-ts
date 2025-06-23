import React from "react";
import { Row, flexRender } from "@tanstack/react-table";

import { cn } from "@mrgnlabs/mrgn-utils";

import { TableCell, TableRow } from "~/components/ui/table";

import { getPositionCell } from "./AssetCells";
import { AssetListModel } from "../utils";

export const AssetRow = (row: Row<AssetListModel>) => {
  const isPosition = React.useMemo(
    () => row.original.position.walletAmount || row.original.position.positionAmount,
    [row.original.position]
  );
  const isStakedActivating = row.original.asset.stakePool && !row.original.asset.stakePool?.isActive;

  const visibleCells = row.getVisibleCells();

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
            {getPositionCell({ ...row.original.position })}
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
};
