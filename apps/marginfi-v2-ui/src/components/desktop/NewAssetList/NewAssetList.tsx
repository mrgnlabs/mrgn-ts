import React from "react";

import Image from "next/image";

import { getCoreRowModel, ColumnDef, flexRender, useReactTable } from "@tanstack/react-table";

import { useHotkeys } from "react-hotkeys-hook";

import { ExtendedBankInfo, ActiveBankInfo, ExtendedBankMetadata, Emissions } from "@mrgnlabs/marginfi-v2-ui-state";

import { useMrgnlendStore, useUserProfileStore, useUiStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";

import { LoadingAsset, AssetRow } from "~/components/desktop/AssetsList/AssetRow";
import {
  LSTDialog,
  LSTDialogVariants,
  AssetListFilters,
  sortApRate,
  sortTvl,
  STABLECOINS,
  LSTS,
} from "~/components/common/AssetList";
import { Portfolio } from "~/components/common/Portfolio";
import { LendingModes } from "~/types";
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "~/components/ui/table";
import { NewAssetRowHeader } from "./NewAssetRowHeader";
import { NewAssetRow } from "./NewAssetRow";
import { HeaderWrapper } from "./components";
import { PriceBias, getPriceWithConfidence } from "@mrgnlabs/marginfi-client-v2";
import { aprToApy, nativeToUi, usdFormatter } from "@mrgnlabs/mrgn-common";
import { getTokenImageURL, isBankOracleStale } from "~/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { Badge } from "@mui/material";
import { IconAlertTriangle, IconPyth, IconSwitchboard } from "~/components/ui/icons";
import Link from "next/link";
import { getAsset, getAssetPrice, getBankCap, getRate } from "./AssetListUtils";

interface AssetListModel {
  asset: React.JSX.Element;
  price: React.JSX.Element;
  rate: React.JSX.Element;
  weight: React.JSX.Element;
  bankCap: React.JSX.Element;
  utilization: React.JSX.Element;
  walletAmount: React.JSX.Element;
}

interface BankCap {
  bankCap: number;
  isBankFilled: boolean;
  isBankHigh: boolean;
}

interface AssetPrice {
  assetPrice: number;
  assetPriceOffset: number;
}

const makeData = (data: ExtendedBankInfo[], isInLendingMode: boolean) => {
  return data.map(
    (bank) =>
      ({
        asset: getAsset(bank.meta),
        price: getAssetPrice(bank),
        rate: getRate(bank, isInLendingMode),
        bankCap: getBankCap(bank, isInLendingMode, false),
      } as AssetListModel)
  );
};

const generateColumns = (isInLendingMode: boolean) => {
  const columns: ColumnDef<AssetListModel>[] = [
    {
      accessorFn: (row) => row.asset,
      id: "asset",
      cell: (info) => info.getValue(),
      header: () => <HeaderWrapper>Asset</HeaderWrapper>,
      footer: (props) => props.column.id,
    },
    {
      accessorFn: (row) => row.price,
      id: "price",
      cell: (info) => info.getValue(),
      header: () => (
        <HeaderWrapper
          infoTooltip={
            <div className="flex flex-col items-start gap-1 text-left">
              <h4 className="text-base">Realtime prices</h4>
              <span className="font-normal">Powered by Pyth and Switchboard.</span>
            </div>
          }
        >
          Price
        </HeaderWrapper>
      ),
      footer: (props) => props.column.id,
    },
    {
      accessorFn: (row) => row.rate,
      id: "rate",
      cell: (info) => info.getValue(),
      header: () => (
        <HeaderWrapper
          infoTooltip={
            <div className="flex flex-col items-start gap-1 text-left">
              <h4 className="text-base">APY</h4>
              <span style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
                {isInLendingMode
                  ? "What you'll earn on deposits over a year. This includes compounding."
                  : "What you'll pay for your borrows over a year. This includes compounding."}
              </span>
            </div>
          }
        >
          APY
        </HeaderWrapper>
      ),
      footer: (props) => props.column.id,
    },
    {
      accessorFn: (row) => row.weight,
      id: "weight",
      cell: (info) => info.getValue(),
      header: () => (
        <HeaderWrapper
          infoTooltip={
            <div className="flex flex-col items-start gap-1 text-left">
              <h4 className="text-base">{isInLendingMode ? "Weight" : "LTV"}</h4>
              <span style={{ fontFamily: "Aeonik Pro", fontWeight: 400 }}>
                {isInLendingMode
                  ? "How much your assets count for collateral, relative to their USD value. The higher the weight, the more collateral you can borrow against it."
                  : "How much you can borrow against your free collateral. The higher the LTV, the more you can borrow against your free collateral."}
              </span>
            </div>
          }
        >
          {isInLendingMode ? "Weight" : "LTV"}
        </HeaderWrapper>
      ),
      footer: (props) => props.column.id,
    },
    {
      accessorFn: (row) => row.bankCap,
      id: "bankCap",
      cell: (info) => info.getValue(),
      header: () => (
        <HeaderWrapper
          infoTooltip={
            isInLendingMode ? (
              <div className="flex flex-col items-start gap-1 text-left">
                <h4 className="text-base">Global deposit cap</h4>
                Each marginfi pool has global deposit and borrow limits, also known as caps. This is the total amount
                that all users combined can deposit or borrow of a given token.
              </div>
            ) : undefined
          }
        >
          {isInLendingMode ? "Global limit" : "Total Borrows"}
        </HeaderWrapper>
      ),
      footer: (props) => props.column.id,
    },
    {
      accessorFn: (row) => row.utilization,
      id: "utilization",
      cell: (info) => info.getValue(),
      header: () => (
        <HeaderWrapper
          infoTooltip={
            <div className="flex flex-col items-start gap-1 text-left">
              <h4 className="text-base">Pool utilization</h4>
              What percentage of supplied tokens have been borrowed. This helps determine interest rates. This is not
              based on the global pool limits, which can limit utilization.
            </div>
          }
        >
          Utilization
        </HeaderWrapper>
      ),
      footer: (props) => props.column.id,
    },
    {
      accessorFn: (row) => row.walletAmount,
      id: "walletAmount",
      cell: (info) => info.getValue(),
      header: () => <HeaderWrapper>Wallet Amt.</HeaderWrapper>,
      footer: (props) => props.column.id,
    },
  ];

  return columns;
};

export const NewAssetsList = () => {
  const { connected, walletAddress } = useWalletContext();
  const [isStoreInitialized, extendedBankInfos, nativeSolBalance, selectedAccount] = useMrgnlendStore((state) => [
    state.initialized,
    state.extendedBankInfos,
    state.nativeSolBalance,
    state.selectedAccount,
  ]);
  const [lendZoomLevel, showBadges, setShowBadges] = useUserProfileStore((state) => [
    state.lendZoomLevel,
    state.showBadges,
    state.setShowBadges,
  ]);
  const [lendingMode, setLendingMode, poolFilter, isFilteredUserPositions, sortOption] = useUiStore((state) => [
    state.lendingMode,
    state.setLendingMode,
    state.poolFilter,
    state.isFilteredUserPositions,
    state.sortOption,
  ]);

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

  const globalBanks = React.useMemo(() => {
    const filteredBanks =
      extendedBankInfos &&
      extendedBankInfos
        .filter((b) => !b.info.state.isIsolated)
        .filter((b) => (isFilteredUserPositions ? b.isActive : true));

    if (isStoreInitialized && sortOption && filteredBanks) {
      return sortBanks(filteredBanks);
    } else {
      return filteredBanks;
    }
  }, [isStoreInitialized, extendedBankInfos, sortOption, isFilteredUserPositions, sortBanks]);

  const isolatedBanks = React.useMemo(() => {
    const filteredBanks =
      extendedBankInfos &&
      extendedBankInfos
        .filter((b) => b.info.state.isIsolated)
        .filter((b) => (isFilteredUserPositions ? b.isActive : true));

    if (isStoreInitialized && sortOption && filteredBanks) {
      return sortBanks(filteredBanks);
    } else {
      return filteredBanks;
    }
  }, [isStoreInitialized, extendedBankInfos, sortOption, isFilteredUserPositions, sortBanks]);

  const activeBankInfos = React.useMemo(
    () => extendedBankInfos.filter((balance) => balance.isActive),
    [extendedBankInfos]
  ) as ActiveBankInfo[];

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
        setLendingMode(lendingMode === LendingModes.LEND ? LendingModes.BORROW : LendingModes.LEND);
        setIsHotkeyMode(false);
        setShowBadges(false);
      }
    },
    { enableOnFormTags: true }
  );

  const tableData = React.useMemo(() => {
    const data = makeData(extendedBankInfos, isInLendingMode);
    console.log({ data });
    return data;
  }, [extendedBankInfos, isInLendingMode]);

  const tableColumns = React.useMemo(() => {
    return generateColumns(isInLendingMode);
  }, [isInLendingMode]);

  const table = useReactTable<AssetListModel>({
    data: tableData,
    columns: tableColumns,
    getRowCanExpand: () => true,
    getCoreRowModel: getCoreRowModel(),
    // getExpandedRowModel: getExpandedRowModel(),
  });

  return (
    <>
      <AssetListFilters />
      <div className="col-span-full">
        <Table>
          <TableCaption>
            <div className="font-aeonik font-normal h-full w-full flex items-center text-2xl text-white pt-4 mt-4 pb-2 gap-1">
              Global <span className="block">pool</span>
            </div>
          </TableCaption>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
            {/* <NewAssetRowHeader isInLendingMode={isInLendingMode} isGlobalPool={true} /> */}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => {
              return (
                <React.Fragment key={row.id}>
                  <tr>
                    {/* first row is a normal row */}
                    {row.getVisibleCells().map((cell) => {
                      return <td key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</td>;
                    })}
                  </tr>
                  {row.getIsExpanded() && (
                    <tr>
                      {/* 2nd row is a custom 1 cell row */}
                      <td colSpan={row.getVisibleCells().length}>{/* {renderSubComponent({ row })} */}</td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
            {table.getRowModel().rows.map((row) => (
              <TableRow key={row.id}>
                {row.getVisibleCells().map((cell, idx) => (
                  <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
          {/* <TableBody>
            {globalBanks.length ? (
              globalBanks.map((bank, i) => {
                if (poolFilter === "stable" && !STABLECOINS.includes(bank.meta.tokenSymbol)) return null;
                if (poolFilter === "lst" && !LSTS.includes(bank.meta.tokenSymbol)) return null;

                // check to see if bank is in open positions
                const userPosition = activeBankInfos.filter(
                  (activeBankInfo) => activeBankInfo.meta.tokenSymbol === bank.meta.tokenSymbol
                );

                if (isFilteredUserPositions && !userPosition.length) return null;

                return isStoreInitialized ? (
                  <NewAssetRow
                    key={bank.meta.tokenSymbol}
                    nativeSolBalance={nativeSolBalance}
                    bank={bank}
                    isInLendingMode={isInLendingMode}
                    isConnected={connected}
                    marginfiAccount={selectedAccount}
                    inputRefs={inputRefs}
                    hasHotkey={true}
                    showHotkeyBadges={showBadges}
                    badgeContent={`${i + 1}`}
                    activeBank={userPosition[0]}
                    showLSTDialog={(variant: LSTDialogVariants, onClose?: () => void) => {
                      setLSTDialogVariant(variant);
                      setIsLSTDialogOpen(true);
                      if (onClose) {
                        setLSTDialogCallback(() => onClose);
                      }
                    }}
                  />
                ) : (
                  <LoadingAsset
                    key={bank.meta.tokenSymbol}
                    isInLendingMode={isInLendingMode}
                    bankMetadata={bank.meta}
                  />
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={4} className="border-none">
                  <div className="font-aeonik font-normal text-lg text-input">No global banks found.</div>
                </TableCell>
              </TableRow>
            )}
          </TableBody> */}
        </Table>

        {/* <TableContainer>
          {poolFilter !== "isolated" && (
            <>
              <div className="font-aeonik font-normal h-full w-full flex items-center text-2xl text-white pt-4 mt-4 pb-2 gap-1">
                Global <span className="block">pool</span>
              </div>
              <Table
                className="table-fixed"
                style={{
                  borderCollapse: "separate",
                  borderSpacing: "0px 0px",
                }}
              >
                <TableHead>
                  <AssetRowHeader isInLendingMode={isInLendingMode} isGlobalPool={true} />
                </TableHead>

                <TableBody>
                  {globalBanks.length ? (
                    globalBanks.map((bank, i) => {
                      if (poolFilter === "stable" && !STABLECOINS.includes(bank.meta.tokenSymbol)) return null;
                      if (poolFilter === "lst" && !LSTS.includes(bank.meta.tokenSymbol)) return null;

                      // check to see if bank is in open positions
                      const userPosition = activeBankInfos.filter(
                        (activeBankInfo) => activeBankInfo.meta.tokenSymbol === bank.meta.tokenSymbol
                      );

                      if (isFilteredUserPositions && !userPosition.length) return null;

                      return isStoreInitialized ? (
                        <AssetRow
                          key={bank.meta.tokenSymbol}
                          nativeSolBalance={nativeSolBalance}
                          bank={bank}
                          isInLendingMode={isInLendingMode}
                          isConnected={connected}
                          marginfiAccount={selectedAccount}
                          inputRefs={inputRefs}
                          hasHotkey={true}
                          showHotkeyBadges={showBadges}
                          badgeContent={`${i + 1}`}
                          activeBank={userPosition[0]}
                          showLSTDialog={(variant: LSTDialogVariants, onClose?: () => void) => {
                            setLSTDialogVariant(variant);
                            setIsLSTDialogOpen(true);
                            if (onClose) {
                              setLSTDialogCallback(() => onClose);
                            }
                          }}
                        />
                      ) : (
                        <LoadingAsset
                          key={bank.meta.tokenSymbol}
                          isInLendingMode={isInLendingMode}
                          bankMetadata={bank.meta}
                        />
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="border-none">
                        <div className="font-aeonik font-normal text-lg text-input">No global banks found.</div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}
          {poolFilter !== "stable" && poolFilter !== "lst" && (
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
                      <div className="flex flex-col gap-2">
                        <h4 className="flex items-center gap-1 text-base">
                          <IconAlertTriangle /> Isolated pools are risky
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
              <Table className="table-fixed" style={{ borderCollapse: "separate", borderSpacing: "0px 0px" }}>
                <TableHead>
                  <AssetRowHeader isInLendingMode={isInLendingMode} isGlobalPool={false} />
                </TableHead>
                <TableBody>
                  {isolatedBanks.length ? (
                    isolatedBanks.map((bank) => {
                      const activeBank = activeBankInfos.filter(
                        (activeBankInfo) => activeBankInfo.meta.tokenSymbol === bank.meta.tokenSymbol
                      );

                      if (isFilteredUserPositions && !activeBank.length) return null;

                      return isStoreInitialized ? (
                        <AssetRow
                          key={bank.meta.tokenSymbol}
                          nativeSolBalance={nativeSolBalance}
                          bank={bank}
                          isInLendingMode={isInLendingMode}
                          isConnected={connected}
                          marginfiAccount={selectedAccount}
                          activeBank={activeBank[0]}
                          inputRefs={inputRefs}
                          hasHotkey={false}
                        />
                      ) : (
                        <LoadingAsset
                          key={bank.meta.tokenSymbol}
                          isInLendingMode={isInLendingMode}
                          bankMetadata={bank.meta}
                        />
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="border-none">
                        <div className="font-aeonik font-normal text-lg text-input">No isolated banks found.</div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </>
          )}
        </TableContainer> */}
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
