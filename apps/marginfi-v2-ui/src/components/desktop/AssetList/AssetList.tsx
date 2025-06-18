import React, { useMemo } from "react";
import Link from "next/link";

import { getCoreRowModel, flexRender, useReactTable, SortingState, getSortedRowModel } from "@tanstack/react-table";
import { IconExternalLink, IconInfoCircle, IconSearch } from "@tabler/icons-react";

import { cn, LendingModes, PoolTypes } from "@mrgnlabs/mrgn-utils";
import { useWallet } from "@mrgnlabs/mrgn-ui";
import { WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { EmodeTag } from "@mrgnlabs/marginfi-client-v2";

import { useUiStore } from "~/store";
import { STABLECOINS, LSTS, MEMES } from "~/config/constants";

import { Table, TableBody, TableHead, TableHeader, TableRow } from "~/components/ui/table";

import { AssetListModel, generateColumns, makeData } from "./utils";
import { AssetRow, AssetListNav, LSTDialog, LSTDialogVariants } from "./components";
import { EmodeHeader } from "~/components/common/emode/components";
import { Button } from "~/components/ui/button";
import { TokenFilters } from "~/store/uiStore";
import { IconEmode } from "~/components/ui/icons";
import {
  groupBanksByEmodeTag,
  useEmode,
  useExtendedBanks,
  useRefreshUserData,
  useUserBalances,
  useUserStakeAccounts,
  useWrappedMarginfiAccount,
  groupCollateralBanksByLiabilityBank,
  groupLiabilityBanksByCollateralBank,
} from "@mrgnlabs/mrgn-state";

export const AssetsList = () => {
  const { connected, walletContextState, walletAddress } = useWallet();
  const { extendedBanks } = useExtendedBanks(walletAddress);
  const { activeEmodePairs, emodePairs } = useEmode(walletAddress);
  const { data: stakeAccounts } = useUserStakeAccounts(walletAddress);
  const { wrappedAccount: selectedAccount } = useWrappedMarginfiAccount(walletAddress);
  const refreshUserData = useRefreshUserData(walletAddress);
  const { data: userBalances } = useUserBalances(walletAddress);

  const [groupedEmodeBanks, collateralBanksByLiabilityBank, liabilityBanksByCollateralBank] = useMemo(() => {
    return [
      groupBanksByEmodeTag(extendedBanks),
      groupCollateralBanksByLiabilityBank(extendedBanks, emodePairs),
      groupLiabilityBanksByCollateralBank(extendedBanks, emodePairs),
    ];
  }, [extendedBanks, emodePairs]);

  const [poolFilter, isFilteredUserPositions, lendingMode, tokenFilter, setTokenFilter] = useUiStore((state) => [
    state.poolFilter,
    state.isFilteredUserPositions,
    state.lendingMode,
    state.tokenFilter,
    state.setTokenFilter,
  ]);

  const [isLSTDialogOpen, setIsLSTDialogOpen] = React.useState(false);
  const [lstDialogVariant, setLSTDialogVariant] = React.useState<LSTDialogVariants | null>(null);
  const [lstDialogCallback, setLSTDialogCallback] = React.useState<(() => void) | null>(null);

  const isInLendingMode = React.useMemo(() => lendingMode === LendingModes.LEND, [lendingMode]);

  const filterBanksByTokenType = React.useCallback(
    (banks: typeof extendedBanks) => {
      if (tokenFilter === TokenFilters.STABLE) {
        return banks.filter((b) => STABLECOINS.includes(b.meta.tokenSymbol));
      } else if (tokenFilter === TokenFilters.LST) {
        return banks.filter((b) => LSTS.includes(b.meta.tokenSymbol));
      } else if (tokenFilter === TokenFilters.MEME) {
        return banks.filter((b) => MEMES.includes(b.meta.tokenSymbol));
      }
      return banks;
    },
    [tokenFilter]
  );

  const solPrice = React.useMemo(() => {
    const solBank = extendedBanks.find((bank) => bank.info.state.mint.equals(WSOL_MINT));
    return solBank?.info.oraclePrice.priceRealtime.price.toNumber() || null;
  }, [extendedBanks]);

  // non isolated, non staked asset banks
  const globalBanks = React.useMemo(() => {
    const banks = extendedBanks
      .filter((b) => b.info.rawBank.config.assetTag !== 2 && !b.info.state.isIsolated)
      .filter((b) => (isFilteredUserPositions ? b.isActive : true));

    return filterBanksByTokenType(banks);
  }, [isFilteredUserPositions, extendedBanks, filterBanksByTokenType]);

  // isolated, non staked asset banks
  const isolatedBanks = React.useMemo(() => {
    const banks = extendedBanks
      .filter((b) => b.info.rawBank.config.assetTag !== 2 && b.info.state.isIsolated)
      .filter((b) => (isFilteredUserPositions ? b.isActive : true));

    return filterBanksByTokenType(banks);
  }, [isFilteredUserPositions, extendedBanks, filterBanksByTokenType]);

  // staked asset banks
  const stakedAssetBanks = React.useMemo(() => {
    const banks = extendedBanks
      .filter((b) => b.info.rawBank.config.assetTag === 2)
      .filter((b) => (isFilteredUserPositions ? b.isActive : true));

    return filterBanksByTokenType(banks);
  }, [isFilteredUserPositions, extendedBanks, filterBanksByTokenType]);

  const emodeBanks = React.useMemo(() => {
    const banks = extendedBanks.filter((b) => b.info.state.hasEmode);
    return filterBanksByTokenType(banks);
  }, [extendedBanks, filterBanksByTokenType]);

  const [sorting, setSorting] = React.useState<SortingState>([]);

  const globalPoolTableData = React.useMemo(() => {
    return makeData(
      globalBanks,
      isInLendingMode,
      userBalances?.nativeSolBalance ?? 0,
      selectedAccount,
      connected,
      walletContextState,
      solPrice,
      refreshUserData,
      activeEmodePairs,
      collateralBanksByLiabilityBank,
      liabilityBanksByCollateralBank
    );
  }, [
    globalBanks,
    isInLendingMode,
    userBalances?.nativeSolBalance,
    selectedAccount,
    connected,
    walletContextState,
    solPrice,
    refreshUserData,
    activeEmodePairs,
    collateralBanksByLiabilityBank,
    liabilityBanksByCollateralBank,
  ]);

  const isolatedPoolTableData = React.useMemo(() => {
    return makeData(
      isolatedBanks,
      isInLendingMode,
      userBalances?.nativeSolBalance ?? 0,
      selectedAccount,
      connected,
      walletContextState,
      solPrice,
      refreshUserData,
      activeEmodePairs,
      collateralBanksByLiabilityBank,
      liabilityBanksByCollateralBank
    );
  }, [
    isolatedBanks,
    isInLendingMode,
    userBalances?.nativeSolBalance,
    selectedAccount,
    connected,
    walletContextState,
    solPrice,
    refreshUserData,
    activeEmodePairs,
    collateralBanksByLiabilityBank,
    liabilityBanksByCollateralBank,
  ]);

  const stakedPoolTableData = React.useMemo(() => {
    return makeData(
      stakedAssetBanks,
      isInLendingMode,
      userBalances?.nativeSolBalance ?? 0,
      selectedAccount,
      connected,
      walletContextState,
      solPrice,
      refreshUserData,
      activeEmodePairs
    );
  }, [
    stakedAssetBanks,
    isInLendingMode,
    userBalances?.nativeSolBalance,
    selectedAccount,
    connected,
    walletContextState,
    solPrice,
    refreshUserData,
    activeEmodePairs,
  ]);

  const emodePoolTableData = React.useMemo(() => {
    return makeData(
      emodeBanks,
      isInLendingMode,
      userBalances?.nativeSolBalance ?? 0,
      selectedAccount,
      connected,
      walletContextState,
      solPrice,
      refreshUserData,
      activeEmodePairs,
      collateralBanksByLiabilityBank,
      liabilityBanksByCollateralBank
    );
  }, [
    emodeBanks,
    isInLendingMode,
    userBalances?.nativeSolBalance,
    selectedAccount,
    connected,
    walletContextState,
    solPrice,
    refreshUserData,
    activeEmodePairs,
    collateralBanksByLiabilityBank,
    liabilityBanksByCollateralBank,
  ]);

  const tableColumns = React.useMemo(() => {
    return generateColumns(isInLendingMode, poolFilter);
  }, [isInLendingMode, poolFilter]);

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

  const eModeTable = useReactTable<AssetListModel>({
    data: emodePoolTableData,
    columns: tableColumns,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    state: {
      sorting,
    },
    onSortingChange: setSorting,
  });

  const emodeGroups = React.useMemo(() => {
    const deduped = Array.from(new Set(emodePairs.map((pair) => EmodeTag[pair.collateralBankTag])));
    return deduped
      .map((group) => emodePairs.find((pair) => EmodeTag[pair.collateralBankTag] === group))
      .filter((group) => group !== undefined);
  }, [emodePairs]);

  React.useEffect(() => {
    if (poolFilter === PoolTypes.NATIVE_STAKE && tokenFilter !== TokenFilters.ALL) {
      setTokenFilter(TokenFilters.ALL);
    }
  }, [poolFilter, tokenFilter, setTokenFilter]);

  return (
    <div className="space-y-6">
      {/* <AssetListFilters /> */}
      <AssetListNav />
      {poolFilter === PoolTypes.GLOBAL && globalPoolTableData.length > 0 && (
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
      )}
      {poolFilter === PoolTypes.ISOLATED && isolatedPoolTableData.length > 0 && (
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
      )}
      {poolFilter === PoolTypes.NATIVE_STAKE && stakedPoolTableData.length > 0 && isInLendingMode && (
        <>
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
        </>
      )}
      {poolFilter === PoolTypes.E_MODE && (
        <div className="space-y-6">
          <EmodeHeader emodeGroups={emodeGroups} />
          {emodePoolTableData.length > 0 ? (
            <Table>
              <TableHeader>
                {eModeTable.getHeaderGroups().map((headerGroup) => (
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
                {eModeTable.getRowModel().rows.map((row) => {
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
