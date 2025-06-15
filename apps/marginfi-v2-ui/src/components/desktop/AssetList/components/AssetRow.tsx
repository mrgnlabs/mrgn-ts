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
        className={cn("cursor-pointer group hover:bg-background-gray", isStakedActivating && "opacity-50")}
        onClick={(e) => {
          // don't navigate if clicking on a button, inside a button, or a dialog overlay
          if (
            e.target instanceof HTMLButtonElement ||
            (e.target as Element).closest("button") ||
            (e.target as Element).hasAttribute("data-state")
          ) {
            return;
          }

          router.push(`/banks/${row.original.asset.address.toBase58()}`);
          document.body.scrollTo({ top: 0 });
        }}
      >
        {visibleCells.map((cell, idx) => (
          <TableCell
            className={cn(
              "group",
              !isPosition && "pb-2",
              idx === 0 && "rounded-l-md",
              idx === visibleCells.length - 1 && "rounded-r-md"
            )}
            key={cell.id}
          >
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
