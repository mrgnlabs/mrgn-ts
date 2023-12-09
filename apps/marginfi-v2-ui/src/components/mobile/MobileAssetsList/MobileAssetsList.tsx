import React from "react";

import Image from "next/image";

import { ExtendedBankInfo, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { Skeleton, Typography } from "@mui/material";

import { useMrgnlendStore, useUiStore } from "~/store";

import { MrgnTooltip } from "~/components/common";
import {
  LSTDialog,
  LSTDialogVariants,
  AssetListFilters,
  sortApRate,
  sortTvl,
  STABLECOINS,
  LSTS,
} from "~/components/common/AssetList";
import { AssetCard } from "~/components/mobile/MobileAssetsList/AssetCard";

import { LendingModes, UserMode } from "~/types";
import { useWalletContext } from "~/hooks/useWalletContext";
import { Portfolio } from "~/components/common/Portfolio";

export const MobileAssetsList = () => {
  const { connected, walletAddress } = useWalletContext();

  const [isStoreInitialized, extendedBankInfos, nativeSolBalance] = useMrgnlendStore((state) => [
    state.initialized,
    state.extendedBankInfos,
    state.nativeSolBalance,
  ]);

  const [userMode, lendingMode, isFilteredUserPositions, sortOption, poolFilter] = useUiStore((state) => [
    state.userMode,
    state.lendingMode,
    state.isFilteredUserPositions,
    state.sortOption,
    state.poolFilter,
  ]);

  const isInLendingMode = React.useMemo(() => lendingMode === LendingModes.LEND, [lendingMode]);
  const [isLSTDialogOpen, setIsLSTDialogOpen] = React.useState(false);
  const [lstDialogVariant, setLSTDialogVariant] = React.useState<LSTDialogVariants | null>(null);
  const [lstDialogCallback, setLSTDialogCallback] = React.useState<(() => void) | null>(null);

  const activeBankInfos = React.useMemo(
    () => extendedBankInfos.filter((balance) => balance.isActive),
    [extendedBankInfos]
  ) as ActiveBankInfo[];

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

  return (
    <>
      <AssetListFilters />
      {userMode === UserMode.PRO && (
        <div className="pb-2">
          {poolFilter !== "isolated" && (
            <div className="w-full">
              <Typography className="font-aeonik font-normal flex items-center text-2xl text-white pt-2 pb-3">
                Global pool
              </Typography>
              {isStoreInitialized && globalBanks ? (
                globalBanks.length > 0 ? (
                  <div className="space-y-5 justify-center items-center pt-2">
                    {globalBanks.map((bank) => {
                      if (poolFilter === "stable" && !STABLECOINS.includes(bank.meta.tokenSymbol)) return null;
                      if (poolFilter === "lst" && !LSTS.includes(bank.meta.tokenSymbol)) return null;

                      const activeBank = activeBankInfos.filter(
                        (activeBankInfo) => activeBankInfo.meta.tokenSymbol === bank.meta.tokenSymbol
                      );

                      return (
                        <AssetCard
                          key={bank.meta.tokenSymbol}
                          nativeSolBalance={nativeSolBalance}
                          bank={bank}
                          isInLendingMode={isInLendingMode}
                          activeBank={activeBank[0]}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <Typography color="#868E95" className="font-aeonik font-[300] text-sm flex gap-1" gutterBottom>
                    No {isInLendingMode ? "lending" : "borrowing"} {isFilteredUserPositions ? "positions" : "pools"}{" "}
                    found.
                  </Typography>
                )
              ) : (
                <div className="flex flew-row flex-wrap gap-5 justify-center items-center pt-2">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton
                      key={i}
                      className="bg-background-gray rounded-xl min-w-[300px] w-full flex-1"
                      variant="rounded"
                      height={208}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
          {poolFilter !== "stable" && poolFilter !== "lst" && (
            <div className="w-full">
              <Typography className="font-aeonik font-normal flex gap-2 items-center text-2xl text-white pt-2 pb-3">
                Isolated pools
                <MrgnTooltip
                  title={
                    <>
                      <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                        Isolated pools are risky ⚠️
                      </Typography>
                      Assets in isolated pools cannot be used as collateral. When you borrow an isolated asset, you
                      cannot borrow other assets. Isolated pools should be considered particularly risky. As always,
                      remember that marginfi is a decentralized protocol and all deposited funds are at risk.
                    </>
                  }
                  placement="top"
                >
                  <Image src="/info_icon.png" alt="info" height={16} width={16} />
                </MrgnTooltip>
              </Typography>

              {isStoreInitialized && globalBanks ? (
                isolatedBanks.length > 0 ? (
                  <div className="flex flew-row flex-wrap gap-6 justify-center items-center pt-2">
                    {isolatedBanks.map((bank, i) => {
                      const activeBank = activeBankInfos.filter(
                        (activeBankInfo) => activeBankInfo.meta.tokenSymbol === bank.meta.tokenSymbol
                      );

                      return (
                        <AssetCard
                          key={bank.meta.tokenSymbol}
                          nativeSolBalance={nativeSolBalance}
                          bank={bank}
                          isInLendingMode={isInLendingMode}
                          activeBank={activeBank[0]}
                        />
                      );
                    })}
                  </div>
                ) : (
                  <Typography color="#868E95" className="font-aeonik font-[300] text-sm flex gap-1" gutterBottom>
                    No {isInLendingMode ? "lending" : "borrowing"} {isFilteredUserPositions ? "positions" : "pools"}{" "}
                    found.
                  </Typography>
                )
              ) : (
                <div className="flex flew-row flex-wrap gap-5 justify-center items-center pt-2">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton
                      key={i}
                      className="bg-background-gray rounded-xl min-w-[300px] w-full"
                      variant="rounded"
                      height={208}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {walletAddress && <Portfolio />}

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
