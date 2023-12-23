import React from "react";

import { useUiStore } from "~/store";
import { LendingModes } from "~/types";

import { LSTDialog, LSTDialogVariants } from "~/components/common/AssetList";

export const MobileAssetsList = () => {
  const [lendingMode] = useUiStore((state) => [state.lendingMode]);

  const isInLendingMode = React.useMemo(() => lendingMode === LendingModes.LEND, [lendingMode]);
  const [isLSTDialogOpen, setIsLSTDialogOpen] = React.useState(false);
  const [lstDialogVariant, setLSTDialogVariant] = React.useState<LSTDialogVariants | null>(null);
  const [lstDialogCallback, setLSTDialogCallback] = React.useState<(() => void) | null>(null);

  return (
    <>
      {/* {walletAddress && <Portfolio />} */}
      {/* <AssetListFilters />

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
                    Assets in isolated pools cannot be used as collateral. When you borrow an isolated asset, you cannot
                    borrow other assets. Isolated pools should be considered particularly risky. As always, remember
                    that marginfi is a decentralized protocol and all deposited funds are at risk.
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
      </div> */}

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
