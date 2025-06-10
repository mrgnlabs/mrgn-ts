import React from "react";
import { useRouter } from "next/navigation";

import { Row, flexRender } from "@tanstack/react-table";

import { cn } from "@mrgnlabs/mrgn-utils";

import { TableCell, TableRow } from "~/components/ui/table";

import { getPositionCell } from "./AssetCells";
import { AssetListModel } from "../utils";

export const AssetRow = (row: Row<AssetListModel>) => {
  const router = useRouter();
  const isPosition = React.useMemo(
    () => row.original.position.walletAmount || row.original.position.positionAmount,
    [row.original.position]
  );
  const isStakedActivating = row.original.asset.stakePool && !row.original.asset.stakePool?.isActive;

  const visibleCells = row.getVisibleCells();

  return (
    <React.Fragment key={row.id}>
      <TableRow
        key={row.id}
        className={cn("cursor-pointer hover:bg-background-gray", isStakedActivating && "opacity-50")}
        onClick={(e) => {
          if (
            e.target instanceof HTMLTableRowElement ||
            e.target instanceof HTMLTableCellElement ||
            (e.target as Element).parentElement instanceof HTMLTableCellElement
          ) {
            router.push(`/banks/${row.original.asset.address.toBase58()}`);
            document.body.scrollTo({ top: 0 });
          }
        }}
      >
        {visibleCells.map((cell, idx) => (
          <TableCell className={cn("rounded-md group", !isPosition && "pb-2")} key={cell.id}>
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
