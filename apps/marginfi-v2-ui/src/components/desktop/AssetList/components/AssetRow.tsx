import React from "react";
import { Row, flexRender } from "@tanstack/react-table";

import { useUiStore } from "~/store";

import { TableCell, TableRow } from "~/components/ui/table";

import { getPositionCell } from "./AssetCells";
import { AssetListModel } from "../utils";
import { cn, PoolTypes } from "@mrgnlabs/mrgn-utils";
import { WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { useWallet } from "~/components";
import { useExtendedBanks } from "@mrgnlabs/mrgn-state";

export const AssetRow = (row: Row<AssetListModel>) => {
  const isPosition = React.useMemo(
    () => row.original.position.walletAmount || row.original.position.positionAmount,
    [row.original.position]
  );
  const { walletAddress } = useWallet();
  const [assetListSearch, poolFilter] = useUiStore((state) => [state.assetListSearch, state.poolFilter]);
  const { extendedBanks } = useExtendedBanks(walletAddress);
  const solPrice = React.useMemo(() => {
    const solBank = extendedBanks.find((bank) => bank.info.state.mint.equals(WSOL_MINT));
    return solBank?.info.oraclePrice.priceRealtime.price.toNumber() || null;
  }, [extendedBanks]);

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
            {getPositionCell({ ...row.original.position, solPrice })}
          </TableCell>
        </TableRow>
      )}
    </React.Fragment>
  );
};
