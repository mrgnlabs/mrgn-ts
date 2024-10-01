import React from "react";
import { Row, flexRender } from "@tanstack/react-table";

import { useUiStore } from "~/store";

import { TableCell, TableRow } from "~/components/ui/table";

import { getPositionCell } from "./AssetCells";
import { AssetListModel } from "../utils";
import { cn } from "@mrgnlabs/mrgn-utils";

export const AssetRow = (row: Row<AssetListModel>) => {
  const [isHovering, setIsHovering] = React.useState(false);
  const isPosition = React.useMemo(
    () => row.original.position.walletAmount || row.original.position.positionAmount,
    [row.original.position]
  );
  const [assetListSearch] = useUiStore((state) => [state.assetListSearch]);

  if (
    assetListSearch.length > 1 &&
    !row.original.asset.name.toLowerCase().includes(assetListSearch.toLowerCase()) &&
    !row.original.asset.symbol.toLowerCase().includes(assetListSearch.toLowerCase())
  ) {
    return null;
  }

  return (
    <React.Fragment key={row.id}>
      <TableRow key={row.id} onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
        {row.getVisibleCells().map((cell, idx) => (
          <TableCell
            className={cn(isHovering && "bg-background-gray", !isPosition ? "pb-2 rounded-md" : "rounded-t-md")}
            key={cell.id}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>

      {isPosition && (
        <TableRow onMouseEnter={() => setIsHovering(true)} onMouseLeave={() => setIsHovering(false)}>
          <TableCell
            showPadding={true}
            className={cn("rounded-b-md", "pb-2", isHovering && "bg-background-gray")}
            colSpan={row.getVisibleCells().length}
          >
            {getPositionCell(row.original.position)}
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
};
