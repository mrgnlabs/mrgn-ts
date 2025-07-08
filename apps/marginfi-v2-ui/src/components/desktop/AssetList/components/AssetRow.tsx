import React from "react";
import { useRouter } from "next/router";

import { Row, flexRender } from "@tanstack/react-table";

import { cn } from "@mrgnlabs/mrgn-utils";

import { TableCell, TableRow } from "~/components/ui/table";

import { getPositionCell } from "./AssetCells";
import { AssetListModel } from "../utils";

export const AssetRow = (row: Row<AssetListModel>) => {
  const router = useRouter();
  const prefetchTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);
  const isPosition = React.useMemo(
    () =>
      row.original.position.walletAmount || row.original.position.positionAmount || row.original.position.stakedAmount,
    [row.original.position]
  );
  const isStakedActivating = row.original.asset.stakePool && !row.original.asset.stakePool?.isActive;

  const visibleCells = row.getVisibleCells();

  return (
    <React.Fragment key={row.id}>
      <TableRow
        key={row.id}
        className={cn("cursor-pointer group hover:bg-background-gray", isStakedActivating && "opacity-50")}
        onMouseOver={() => {
          prefetchTimeoutRef.current = setTimeout(() => {
            console.log("prefetching", row.original.asset.address.toBase58());
            router.prefetch(`/banks/${row.original.asset.address.toBase58()}`);
          }, 500);
        }}
        onMouseOut={() => {
          if (prefetchTimeoutRef.current) {
            clearTimeout(prefetchTimeoutRef.current);
            prefetchTimeoutRef.current = null;
          }
        }}
        onClick={(e) => {
          // disable asset row link for action box interaction
          if (
            e.target instanceof HTMLButtonElement ||
            e.target instanceof HTMLAnchorElement ||
            (e.target as Element).closest(".mfi-action-box") ||
            (e.target as Element).classList.contains("mfi-action-box") ||
            (e.target as Element).closest(".mfi-action-box-action") ||
            (e.target as Element).classList.contains("mfi-action-box-action") ||
            (e.target as Element).closest(".dialog-overlay") ||
            (e.target as Element).classList.contains("dialog-overlay")
          ) {
            return;
          }

          // Trigger loading style on the asset cell link
          const rowElement = e.currentTarget;
          const assetLink = rowElement.querySelector('a[href*="/banks/"]');
          if (assetLink) {
            const symbolDiv = assetLink.querySelector("div");
            if (symbolDiv) {
              symbolDiv.textContent = "Loading...";
              symbolDiv.classList.add("group-hover:text-white");
              assetLink.classList.add("animate-pulsate");
            }
          }

          router.push(
            `/banks/${row.original.asset.address.toBase58()}`,
            `/banks/${row.original.asset.address.toBase58()}`,
            {
              shallow: true,
            }
          );
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
