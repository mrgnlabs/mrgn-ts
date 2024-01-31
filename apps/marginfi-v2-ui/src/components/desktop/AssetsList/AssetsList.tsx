import React from "react";

import Image from "next/image";

import { PublicKey } from "@solana/web3.js";
import { useHotkeys } from "react-hotkeys-hook";
import { Card, Table, TableHead, TableBody, TableContainer, TableCell, TableRow } from "@mui/material";

import { ExtendedBankInfo, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { useMrgnlendStore, useUserProfileStore, useUiStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";

import { LoadingAsset, AssetRow } from "~/components/desktop/AssetsList/AssetRow";
import {
  NewAssetBannerList,
  LSTDialog,
  LSTDialogVariants,
  AssetListFilters,
  sortApRate,
  sortTvl,
  STABLECOINS,
  LSTS,
} from "~/components/common/AssetList";
import { Portfolio } from "~/components/common/Portfolio";
import { LendingModes, UserMode } from "~/types";
import { AssetRowHeader } from "~/components/common/AssetList/AssetRowHeader";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { IconAlertTriangle } from "~/components/ui/icons";

const AssetsList = () => {
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
  const [lendingMode, setLendingMode, poolFilter, isFilteredUserPositions, sortOption, userMode] = useUiStore(
    (state) => [
      state.lendingMode,
      state.setLendingMode,
      state.poolFilter,
      state.isFilteredUserPositions,
      state.sortOption,
      state.userMode,
    ]
  );

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

  const newAssetPublicKeys = ["Guu5uBc8k1WK1U2ihGosNaCy57LSgCkpWAabtzQqrQf8"].map((address) => new PublicKey(address));

  const newAssets = globalBanks.filter(
    (bank) => bank.address && newAssetPublicKeys.some((newAssetPublicKey) => newAssetPublicKey.equals(bank.address))
  );

  return (
    <>
      {walletAddress && <Portfolio />}

      {userMode === UserMode.PRO && (
        <>
          <NewAssetBannerList banks={newAssets} />
          <AssetListFilters />
          <div className="col-span-full">
            <Card elevation={0} className="bg-[rgba(0,0,0,0)] w-full">
              <TableContainer>
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
                                Assets in isolated pools cannot be used as collateral. When you borrow an isolated
                                asset, you cannot borrow other assets. Isolated pools should be considered particularly
                                risky.
                              </p>
                              <p>
                                As always, remember that marginfi is a decentralized protocol and all deposited funds
                                are at risk.
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
              </TableContainer>
            </Card>
          </div>
        </>
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
    </>
  );
};

export { AssetsList };
