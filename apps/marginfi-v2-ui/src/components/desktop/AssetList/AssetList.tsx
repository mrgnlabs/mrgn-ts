import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";

import { getCoreRowModel, flexRender, useReactTable, SortingState, getSortedRowModel } from "@tanstack/react-table";
import { IconExternalLink, IconInfoCircle, IconSearch } from "@tabler/icons-react";

import { cn, LendingModes, PoolTypes } from "@mrgnlabs/mrgn-utils";
import { useWallet } from "@mrgnlabs/mrgn-ui";

import { useUiStore } from "~/store";

import { Table, TableBody, TableHead, TableHeader, TableRow } from "~/components/ui/table";

import { AssetListModel, generateColumns, makeData } from "./utils";
import { AssetRow, AssetListNav, LSTDialog, LSTDialogVariants } from "./components";
import { EmodeHeader } from "~/components/common/emode/components";
import { Button } from "~/components/ui/button";
import { TokenFilters } from "~/store/uiStore";

import { useAssetData } from "~/hooks/use-asset-data.hooks";

export const AssetsList = () => {
  const { connected, walletContextState, walletAddress } = useWallet();

  const { globalPoolTableData, isolatedPoolTableData, stakedPoolTableData, emodePoolTableData, emodeGroups } =
    useAssetData();

  const [poolFilter, lendingMode, tokenFilter, setTokenFilter] = useUiStore((state) => [
    state.poolFilter,
    state.lendingMode,
    state.tokenFilter,
    state.setTokenFilter,
  ]);

  const [isLSTDialogOpen, setIsLSTDialogOpen] = React.useState(false);
  const [lstDialogVariant, setLSTDialogVariant] = React.useState<LSTDialogVariants | null>(null);
  const [lstDialogCallback, setLSTDialogCallback] = React.useState<(() => void) | null>(null);

  const isInLendingMode = React.useMemo(() => lendingMode === LendingModes.LEND, [lendingMode]);

  const [sorting, setSorting] = React.useState<SortingState>([]);

  // Memoize columns to prevent unnecessary regeneration
  const tableColumns = React.useMemo(() => {
    return generateColumns(isInLendingMode, poolFilter);
  }, [isInLendingMode, poolFilter]);

  // Get current table data based on pool filter
  const currentTableData = React.useMemo(() => {
    switch (poolFilter) {
      case PoolTypes.GLOBAL:
        return globalPoolTableData;
      case PoolTypes.ISOLATED:
        return isolatedPoolTableData;
      case PoolTypes.NATIVE_STAKE:
        return stakedPoolTableData;
      case PoolTypes.E_MODE:
        return emodePoolTableData;
      default:
        return globalPoolTableData;
    }
  }, [poolFilter, globalPoolTableData, isolatedPoolTableData, stakedPoolTableData, emodePoolTableData]);

  // Single optimized table instance
  const table = useReactTable<AssetListModel>({
    data: currentTableData,
    columns: tableColumns,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
  });

  React.useEffect(() => {
    if (poolFilter === PoolTypes.NATIVE_STAKE && tokenFilter !== TokenFilters.ALL) {
      setTokenFilter(TokenFilters.ALL);
    }
  }, [poolFilter, tokenFilter, setTokenFilter]);

  return (
    <div className="space-y-6">
      {/* <AssetListFilters /> */}
      <AssetListNav />
      {currentTableData.length > 0 && (
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{
                      width: header.column.getSize(),
                    }}
                  >
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              return <AssetRow key={row.id} {...row} />;
            })}
          </TableBody>
        </Table>
      )}
      {poolFilter === PoolTypes.NATIVE_STAKE && isInLendingMode && (
        <div className={cn("space-y-3 text-center w-full pb-4", stakedPoolTableData.length > 0 ? "pt-3" : "pt-12")}>
          <p className="text-xs text-muted-foreground">Don&apos;t see your native stake available to deposit?</p>
          <div className="flex flex-col gap-2 items-center justify-center">
            <Button variant="secondary" className="mx-auto font-normal text-[11px]" size="sm">
              <Link href="/staked-assets/create">
                <span>Create staked asset pool</span>
              </Link>
            </Button>
            <Link href="https://docs.marginfi.com/staked-collateral" target="_blank" rel="noreferrer">
              <Button
                variant="link"
                className="mx-auto font-light text-[11px] gap-1 h-5 text-muted-foreground/75 no-underline rounded-none px-0 hover:no-underline hover:text-foreground"
                size="sm"
              >
                <IconExternalLink size={12} />
                Learn more
              </Button>
            </Link>
          </div>
        </div>
      )}
      {poolFilter === PoolTypes.E_MODE && (
        <div className="space-y-6">
          <EmodeHeader emodeGroups={emodeGroups} />
          {emodePoolTableData.length > 0 ? (
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        style={{
                          width: header.column.getSize(),
                        }}
                      >
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.map((row) => {
                  return <AssetRow key={row.id} {...row} />;
                })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-muted-foreground text-center py-4">
              <span>No banks with e-mode weights found.</span>
            </div>
          )}
        </div>
      )}
      <LSTDialog
        variant={lstDialogVariant}
        open={isLSTDialogOpen}
        onClose={() => {
          setIsLSTDialogOpen(false);
          setLSTDialogVariant(null);
          if (lstDialogCallback) {
            lstDialogCallback();
            setLSTDialogCallback(null);
          }
        }}
      />
    </div>
  );
};
