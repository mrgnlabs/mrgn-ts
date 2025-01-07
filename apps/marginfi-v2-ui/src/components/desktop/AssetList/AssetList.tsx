import React from "react";
import Image from "next/image";
import Link from "next/link";

import { getCoreRowModel, flexRender, useReactTable, SortingState, getSortedRowModel } from "@tanstack/react-table";
import { useHotkeys } from "react-hotkeys-hook";
import { IconAlertTriangle, IconExternalLink } from "@tabler/icons-react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { LendingModes } from "@mrgnlabs/mrgn-utils";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";

import { useMrgnlendStore, useUserProfileStore, useUiStore } from "~/store";

import {
  LSTDialog,
  LSTDialogVariants,
  AssetListFilters,
  sortApRate,
  sortTvl,
  STABLECOINS,
  LSTS,
} from "~/components/common/AssetList";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Button } from "~/components/ui/button";

import { AssetListModel, generateColumns, makeData } from "./utils";
import { AssetRow } from "./components";

export const AssetsList = () => {
  const [isStoreInitialized, extendedBankInfos, nativeSolBalance, selectedAccount, fetchMrgnlendState] =
    useMrgnlendStore((state) => [
      state.initialized,
      state.extendedBankInfos,
      state.nativeSolBalance,
      state.selectedAccount,
      state.fetchMrgnlendState,
    ]);
  const [denominationUSD, setShowBadges] = useUserProfileStore((state) => [state.denominationUSD, state.setShowBadges]);
  const [poolFilter, isFilteredUserPositions, sortOption, lendingMode] = useUiStore((state) => [
    state.poolFilter,
    state.isFilteredUserPositions,
    state.sortOption,
    state.lendingMode,
  ]);
  const { connected, walletContextState } = useWallet();

  const inputRefs = React.useRef<Record<string, HTMLInputElement | null>>({});
  const [isHotkeyMode, setIsHotkeyMode] = React.useState(false);
  const [isLSTDialogOpen, setIsLSTDialogOpen] = React.useState(false);
  const [lstDialogVariant, setLSTDialogVariant] = React.useState<LSTDialogVariants | null>(null);
  const [lstDialogCallback, setLSTDialogCallback] = React.useState<(() => void) | null>(null);

  const isInLendingMode = React.useMemo(() => lendingMode === LendingModes.LEND, [lendingMode]);

  const sortBanks = React.useCallback(
    (banks: ExtendedBankInfo[]) => {
      if (sortOption.field === "APY") {
        return sortApRate(banks, isInLendingMode, sortOption.direction);
      } else if (sortOption.field === "TVL") {
        return sortTvl(banks, sortOption.direction);
      } else {
        return banks;
      }
    },
    [isInLendingMode, sortOption]
  );

  const sortedBanks = React.useMemo(() => {
    let filteredBanks = extendedBankInfos;

    if (poolFilter === "isolated") {
      filteredBanks = filteredBanks.filter((b) => b.info.state.isIsolated);
    } else if (poolFilter === "stable") {
      filteredBanks = filteredBanks.filter((b) => STABLECOINS.includes(b.meta.tokenSymbol));
    } else if (poolFilter === "lst") {
      filteredBanks = filteredBanks.filter((b) => LSTS.includes(b.meta.tokenSymbol));
    }

    if (isStoreInitialized && sortOption) {
      return sortBanks(filteredBanks);
    } else {
      return filteredBanks;
    }
  }, [isStoreInitialized, poolFilter, extendedBankInfos, sortOption, sortBanks]);

  // non isolated, non staked asset banks
  const globalBanks = React.useMemo(() => {
    return (
      sortedBanks &&
      sortedBanks
        .filter((b) => b.info.rawBank.config.assetTag !== 2 && !b.info.state.isIsolated)
        .filter((b) => (isFilteredUserPositions ? b.isActive : true))
    );
  }, [isFilteredUserPositions, sortedBanks]);

  // isolated, non staked asset banks
  const isolatedBanks = React.useMemo(() => {
    return (
      sortedBanks &&
      sortedBanks
        .filter((b) => b.info.rawBank.config.assetTag !== 2 && b.info.state.isIsolated)
        .filter((b) => (isFilteredUserPositions ? b.isActive : true))
    );
  }, [sortedBanks, isFilteredUserPositions]);

  // staked asset banks
  const stakedAssetBanks = React.useMemo(() => {
    return (
      sortedBanks &&
      sortedBanks
        .filter((b) => b.info.rawBank.config.assetTag === 2)
        .filter((b) => (isFilteredUserPositions ? b.isActive : true))
    );
  }, [sortedBanks, isFilteredUserPositions]);

  // Enter hotkey mode
  useHotkeys(
    "meta + k",
    () => {
      setIsHotkeyMode(true);
      setShowBadges(true);

      setTimeout(() => {
        setIsHotkeyMode(false);
        setShowBadges(false);
      }, 5000);
    },
    { preventDefault: true, enableOnFormTags: true }
  );

  // Handle number keys in hotkey mode
  useHotkeys(
    extendedBankInfos
      .filter((b) => !b.info.state.isIsolated)
      .map((_, i) => `${i + 1}`)
      .join(", "),
    (_, handler) => {
      if (isHotkeyMode) {
        const globalBankTokenNames = extendedBankInfos
          .filter((b) => !b.info.state.isIsolated)
          .sort(
            (a, b) => b.info.state.totalDeposits * b.info.state.price - a.info.state.totalDeposits * a.info.state.price
          )
          .map((b) => b.meta.tokenSymbol);

        const keyPressed = handler.keys?.join("");
        if (Number(keyPressed) >= 1 && Number(keyPressed) <= globalBankTokenNames.length) {
          inputRefs.current[globalBankTokenNames[Number(keyPressed) - 1]]?.querySelector("input")!.focus();
          setIsHotkeyMode(false);
          setShowBadges(false);
        }
      }
    },
    { preventDefault: false, enableOnFormTags: true }
  );

  // Toggle lending mode in hotkey mode
  useHotkeys(
    "q",
    () => {
      if (isHotkeyMode) {
        setIsHotkeyMode(false);
        setShowBadges(false);
      }
    },
    { enableOnFormTags: true }
  );

  const [sorting, setSorting] = React.useState<SortingState>([]);

  const globalPoolTableData = React.useMemo(() => {
    return makeData(
      globalBanks,
      isInLendingMode,
      denominationUSD,
      nativeSolBalance,
      selectedAccount,
      connected,
      walletContextState,
      fetchMrgnlendState
    );
  }, [
    connected,
    walletContextState,
    globalBanks,
    isInLendingMode,
    denominationUSD,
    nativeSolBalance,
    selectedAccount,
    fetchMrgnlendState,
  ]);

  const isolatedPoolTableData = React.useMemo(() => {
    return makeData(
      isolatedBanks,
      isInLendingMode,
      denominationUSD,
      nativeSolBalance,
      selectedAccount,
      connected,
      walletContextState,
      fetchMrgnlendState
    );
  }, [
    connected,
    walletContextState,
    isolatedBanks,
    isInLendingMode,
    denominationUSD,
    nativeSolBalance,
    selectedAccount,
    fetchMrgnlendState,
  ]);

  const stakedPoolTableData = React.useMemo(() => {
    return makeData(
      stakedAssetBanks,
      isInLendingMode,
      denominationUSD,
      nativeSolBalance,
      selectedAccount,
      connected,
      walletContextState,
      fetchMrgnlendState
    );
  }, [
    connected,
    walletContextState,
    stakedAssetBanks,
    isInLendingMode,
    denominationUSD,
    nativeSolBalance,
    selectedAccount,
    fetchMrgnlendState,
  ]);

  const tableColumns = React.useMemo(() => {
    return generateColumns(isInLendingMode);
  }, [isInLendingMode]);

  const globalTable = useReactTable<AssetListModel>({
    data: globalPoolTableData,
    columns: tableColumns,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
  });

  const isolatedTable = useReactTable<AssetListModel>({
    data: isolatedPoolTableData,
    columns: tableColumns,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
  });

  const stakedTable = useReactTable<AssetListModel>({
    data: stakedPoolTableData,
    columns: tableColumns,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
  });

  return (
    <>
      <AssetListFilters />
      <div className="col-span-full">
        {globalPoolTableData.length > 0 && (
          <>
            <div>
              <div className="font-normal text-2xl text-white mt-4 pt-4 pb-2 gap-1 ">Global pool</div>
            </div>
            <Table>
              <TableHeader>
                {globalTable.getHeaderGroups().map((headerGroup) => (
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
                {globalTable.getRowModel().rows.map((row) => {
                  return <AssetRow key={row.id} {...row} />;
                })}
              </TableBody>
            </Table>
          </>
        )}
        {isolatedPoolTableData.length > 0 && (
          <>
            <div className="font-aeonik font-normal h-full w-full flex items-center text-2xl text-white pt-4 pb-2 gap-2">
              <span className="gap-1 flex">
                Isolated <span className="hidden lg:block">pools</span>
              </span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Image src="/info_icon.png" alt="info" height={16} width={16} />
                  </TooltipTrigger>
                  <TooltipContent>
                    <div className="space-y-4 text-left leading-relaxed">
                      <h4 className="flex items-center gap-1.5 text-base">
                        <IconAlertTriangle size={18} /> Isolated pools are risky
                      </h4>
                      <p>
                        Assets in isolated pools cannot be used as collateral. When you borrow an isolated asset, you
                        cannot borrow other assets. Isolated pools should be considered particularly risky.
                      </p>
                      <p>
                        As always, remember that marginfi is a decentralized protocol and all deposited funds are at
                        risk.
                      </p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Table>
              <TableHeader>
                {isolatedTable.getHeaderGroups().map((headerGroup) => (
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
                {isolatedTable.getRowModel().rows.map((row) => (
                  <AssetRow key={row.id} {...row} />
                ))}
              </TableBody>
            </Table>
          </>
        )}
        {stakedPoolTableData.length > 0 && (
          <>
            <div>
              <div className="font-normal text-2xl text-white mt-4 pt-4 pb-2 gap-1 ">Staked pools</div>
            </div>
            <Table>
              <TableHeader>
                {stakedTable.getHeaderGroups().map((headerGroup) => (
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
                {stakedTable.getRowModel().rows.map((row) => {
                  return <AssetRow key={row.id} {...row} />;
                })}
              </TableBody>
            </Table>
          </>
        )}
        <div className="space-y-3 text-center w-full pt-3">
          <p className="text-xs text-muted-foreground">Don&apos;t see your native stake available to deposit?</p>
          <div className="flex flex-col gap-2 items-center justify-center">
            <Button variant="secondary" className="mx-auto font-normal text-[11px]" size="sm">
              <Link href="/staked-assets/create">
                <span>Create staked asset pool</span>
              </Link>
            </Button>
            <Button
              variant="link"
              className="mx-auto font-light text-[11px] gap-1 h-5 text-muted-foreground/75 no-underline rounded-none px-0 hover:no-underline hover:text-foreground"
              size="sm"
            >
              <IconExternalLink size={12} />
              Learn more
            </Button>
          </div>
        </div>
      </div>
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
    </>
  );
};
