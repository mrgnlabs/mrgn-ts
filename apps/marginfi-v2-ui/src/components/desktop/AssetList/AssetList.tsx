import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";

import { getCoreRowModel, flexRender, useReactTable, SortingState, getSortedRowModel } from "@tanstack/react-table";
import { IconExternalLink, IconPlus, IconSearch } from "@tabler/icons-react";

import { cn, LendingModes, PoolTypes } from "@mrgnlabs/mrgn-utils";
import { useWallet } from "@mrgnlabs/mrgn-ui";

import { useUiStore } from "~/store";

import { Table, TableBody, TableHead, TableHeader, TableRow, TableCell } from "~/components/ui/table";
import { Skeleton } from "~/components/ui/skeleton";

import { AssetListModel, generateColumns, getColumnVisibility } from "./utils";
import { AssetRow, AssetListNav, LSTDialog, LSTDialogVariants, AssetListHeader } from "./components";
import { EmodeExploreWrapper } from "~/components/common/emode/components";
import { Button } from "~/components/ui/button";
import { TokenFilters } from "~/store/uiStore";
import { STABLECOINS, LSTS, MEMES } from "~/config/constants";

import { AssetListData } from "~/hooks/use-asset-data.hooks";
import { IconEmode } from "~/components/ui/icons";

type AssetListProps = {
  data: AssetListData;
};

export const AssetsList = ({ data }: AssetListProps) => {
  const { lendData, borrowData, emodeGroups, isReady } = data;
  const router = useRouter();

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

  // Create token filter sets for faster lookups
  const STABLECOIN_SET = React.useMemo(() => new Set(STABLECOINS), []);
  const LST_SET = React.useMemo(() => new Set(LSTS), []);
  const MEME_SET = React.useMemo(() => new Set(MEMES), []);

  // Generate ALL columns once - no regeneration on filter changes
  const allColumns = React.useMemo(() => {
    return generateColumns(isInLendingMode);
  }, [isInLendingMode]);

  // Get column visibility based on pool filter
  const columnVisibility = React.useMemo(() => {
    return getColumnVisibility(poolFilter);
  }, [poolFilter]);

  // Get current data based on lending mode
  const currentModeData = React.useMemo(() => {
    return isInLendingMode ? lendData : borrowData;
  }, [isInLendingMode, lendData, borrowData]);

  // Client-side filtering by pool category and token type
  const filteredTableData = React.useMemo(() => {
    let filtered = currentModeData;

    // Filter by pool category
    filtered = filtered.filter((item) => {
      const categories = item.assetCategory || [];
      switch (poolFilter) {
        case PoolTypes.E_MODE:
          return categories.includes(PoolTypes.E_MODE);
        case PoolTypes.GLOBAL:
          return categories.includes(PoolTypes.GLOBAL);
        case PoolTypes.ISOLATED:
          return categories.includes(PoolTypes.ISOLATED);
        case PoolTypes.NATIVE_STAKE:
          return categories.includes(PoolTypes.NATIVE_STAKE);
        default:
          return true;
      }
    });

    // Filter by token type
    if (tokenFilter !== TokenFilters.ALL) {
      filtered = filtered.filter((item) => {
        const symbol = item.asset?.symbol || "";
        switch (tokenFilter) {
          case TokenFilters.STABLE:
            return STABLECOIN_SET.has(symbol);
          case TokenFilters.LST:
            return LST_SET.has(symbol);
          case TokenFilters.MEME:
            return MEME_SET.has(symbol);
          default:
            return true;
        }
      });
    }

    // Check if showReduceOnlyBanks query parameter is set
    const showReduceOnlyBanks = router.query.showReduceOnlyBanks;

    // filter out reduce only banks (unless user has open position or showReduceOnlyBanks is set)
    if (!showReduceOnlyBanks) {
      filtered = filtered.filter((item) => {
        return !(item.asset.isReduceOnly && !item.position.positionAmount);
      });
    }

    return filtered;
  }, [LST_SET, MEME_SET, STABLECOIN_SET, currentModeData, poolFilter, tokenFilter, router.query.showReduceOnlyBanks]);

  // Single optimized table instance
  const table = useReactTable<AssetListModel>({
    data: filteredTableData,
    columns: allColumns,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onColumnVisibilityChange: () => {}, // No-op since visibility is controlled by poolFilter
  });

  React.useEffect(() => {
    if (poolFilter === PoolTypes.NATIVE_STAKE && tokenFilter !== TokenFilters.ALL) {
      setTokenFilter(TokenFilters.ALL);
    }
  }, [poolFilter, tokenFilter, setTokenFilter]);

  if (!isReady) {
    return (
      <div className="space-y-6">
        {/* Show actual navigation but make it appear disabled */}
        <div className="pointer-events-none opacity-50">
          <AssetListNav />
        </div>

        {/* Table skeleton */}
        <div className="space-y-4">
          {/* Show actual table headers */}
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
              {/* Skeleton rows for data */}
              {Array.from({ length: 8 }).map((_, index) => (
                <TableRow key={index}>
                  {table.getHeaderGroups()[0].headers.map((header, colIndex) => (
                    <TableCell key={colIndex} style={{ width: header.column.getSize() }} className="h-[54px]">
                      {colIndex === 0 ? (
                        // Asset column with icon and text - match exact getAssetCell structure
                        <div className="flex gap-2 justify-start items-center">
                          <div className="flex items-center gap-4 w-full">
                            <Skeleton className="size-8 rounded-full" />
                            <Skeleton className="h-3 w-1/2" />
                          </div>
                        </div>
                      ) : colIndex === table.getHeaderGroups()[0].headers.length - 1 ? (
                        // Action column
                        <div className="flex justify-end">
                          <Skeleton className="h-8 w-3/4" />
                        </div>
                      ) : (
                        // Regular data columns - right aligned like the actual data
                        <div className="flex justify-end">
                          <Skeleton className="h-3 w-16" />
                        </div>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* <AssetListFilters /> */}
      <AssetListNav />
      {poolFilter === PoolTypes.E_MODE ? (
        <AssetListHeader
          icon={<IconEmode size={38} />}
          title="marginfi e-mode"
          description={
            <>
              Banks with e-mode pairings get boosted weights.
              <br className="hidden lg:block" />{" "}
              <EmodeExploreWrapper
                trigger={
                  <span className="text-foreground border-b border-foreground/50 transition-colors cursor-pointer hover:border-transparent">
                    Explore the groups
                  </span>
                }
              />{" "}
              or{" "}
              <Link
                href="https://docs.marginfi.com/emode"
                target="_blank"
                rel="noreferrer"
                className="text-foreground border-b border-foreground/50 transition-colors hover:border-transparent"
              >
                read the docs
              </Link>{" "}
              for more information.
            </>
          }
          backgroundImage="/emode-header.png"
          actionContent={
            emodeGroups.length > 0 && (
              <div className="py-2 flex items-end gap-2.5">
                <EmodeExploreWrapper
                  trigger={
                    <Button>
                      <IconSearch size={16} />
                      Explore e-mode
                    </Button>
                  }
                />
              </div>
            )
          }
          bgFrom="from-[#161A1D]"
          bgTo="to-[#130D1B]"
        />
      ) : poolFilter === PoolTypes.NATIVE_STAKE ? (
        <AssetListHeader
          title="Native Stake Collateral"
          backgroundImage="/native-stake-header.png"
          description={
            <div className="md:max-w-[400px]">
              Collateralize your native stake on any of the validators listed below.{" "}
              <Link
                href="https://docs.marginfi.com/staked-collateral"
                target="_blank"
                rel="noreferrer"
                className="text-foreground border-b border-foreground/50 transition-colors hover:border-transparent"
              >
                Read the docs
              </Link>{" "}
              for more information.
            </div>
          }
          actionContent={
            <Link href="/staked-assets/create">
              <Button>
                <IconPlus size={16} /> List your validator
              </Button>
            </Link>
          }
          bgFrom="from-[#111518]"
          bgTo="to-[#2C363D]"
        />
      ) : null}
      {filteredTableData.length > 0 && (
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
        <div className={cn("space-y-3 text-center w-full pb-4", filteredTableData.length > 0 ? "pt-3" : "pt-12")}>
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
