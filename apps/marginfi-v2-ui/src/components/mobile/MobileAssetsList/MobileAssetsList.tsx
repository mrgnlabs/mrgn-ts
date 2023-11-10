import React, { FC, useCallback, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { FormControl, MenuItem, SelectChangeEvent, Skeleton, Typography } from "@mui/material";
import { useMrgnlendStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useWeb3AuthWallet } from "~/hooks/useWeb3AuthWallet";
import { MrgnContainedSwitch, MrgnLabeledSwitch, MrgnTooltip } from "~/components/common";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

import { AssetCard } from "./AssetCard";
import { LSTDialog, LSTDialogVariants } from "~/components/common/AssetList";
import { SORT_OPTIONS_MAP, SortAssetOption, SortType, sortApRate, sortTvl } from "./MobileAssetsList.utils";
import { cn } from "~/utils/themeUtils";

export const MobileAssetsList: FC = () => {
  const [isFiltered, setIsFiltered] = useState(false);
  const [sortOption, setSortOption] = useState<SortAssetOption>(SORT_OPTIONS_MAP.TVL_DESC);
  const togglePositions = () => setIsFiltered((previousState) => !previousState);

  const { connected } = useWalletContext();
  const { setIsOpenAuthDialog } = useWeb3AuthWallet();
  const [isStoreInitialized, extendedBankInfos, nativeSolBalance, selectedAccount] = useMrgnlendStore((state) => [
    state.initialized,
    state.extendedBankInfos,
    state.nativeSolBalance,
    state.selectedAccount,
  ]);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [isInLendingMode, setIsInLendingMode] = useState(true);
  const [isLSTDialogOpen, setIsLSTDialogOpen] = useState(false);
  const [lstDialogVariant, setLSTDialogVariant] = useState<LSTDialogVariants | null>(null);
  const [lstDialogCallback, setLSTDialogCallback] = useState<(() => void) | null>(null);

  const sortBanks = useCallback(
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

  const globalBanks = useMemo(() => {
    const filteredBanks =
      extendedBankInfos &&
      extendedBankInfos.filter((b) => !b.info.state.isIsolated).filter((b) => (isFiltered ? b.isActive : true));

    if (isStoreInitialized && sortOption && filteredBanks) {
      return sortBanks(filteredBanks);
    } else {
      return filteredBanks;
    }
  }, [isStoreInitialized, extendedBankInfos, sortOption, isFiltered, sortBanks]);

  const isolatedBanks = useMemo(() => {
    const filteredBanks =
      extendedBankInfos &&
      extendedBankInfos.filter((b) => b.info.state.isIsolated).filter((b) => (isFiltered ? b.isActive : true));

    if (isStoreInitialized && sortOption && filteredBanks) {
      return sortBanks(filteredBanks);
    } else {
      return filteredBanks;
    }
  }, [isStoreInitialized, extendedBankInfos, sortOption, isFiltered, sortBanks]);

  const handleSortChange = (event: SelectChangeEvent) => {
    setSortOption(SORT_OPTIONS_MAP[event.target.value as SortType]);
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <div className="flex w-[150px] h-[42px]">
          <MrgnLabeledSwitch
            labelLeft="Lend"
            labelRight="Borrow"
            checked={!isInLendingMode}
            onClick={() => setIsInLendingMode(!isInLendingMode)}
          />
        </div>
      </div>
      <div className="flex justify-between items-center align-center">
        <div
          className={cn("flex items-center gap-1", !connected && "opacity-50")}
          onClick={(e) => {
            e.stopPropagation();
            setIsOpenAuthDialog(true);
          }}
        >
          <MrgnContainedSwitch
            checked={isFiltered}
            onChange={togglePositions}
            inputProps={{ "aria-label": "controlled" }}
          />
          <div>Filter my positions</div>
        </div>
        <div>
          <Select
            value={sortOption.value}
            onValueChange={(value) => setSortOption(SORT_OPTIONS_MAP[value as SortType])}
          >
            <SelectTrigger className="bg-background-gray">
              <SelectValue placeholder="Order by" />
            </SelectTrigger>
            <SelectContent className="bg-background-gray" sideOffset={8} align="end">
              {Object.values(SORT_OPTIONS_MAP).map((option) => (
                <SelectItem key={option.value} value={option.value} className="py-2">
                  <div className="flex items-center gap-2 pr-4 uppercase">
                    <option.Icon className="w-[18px] h-[18px]" />
                    {isInLendingMode || !option.borrowLabel ? option.label : option.borrowLabel}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="pb-8">
        <div className="w-full">
          <Typography className="font-aeonik font-normal flex items-center text-2xl text-white pt-2 pb-3">
            Global pool
          </Typography>
          {isStoreInitialized && globalBanks ? (
            globalBanks.length > 0 ? (
              <div className="flex flew-row flex-wrap gap-6 justify-center items-center pt-2">
                {globalBanks.map((bank) => (
                  <AssetCard
                    key={bank.meta.tokenSymbol}
                    nativeSolBalance={nativeSolBalance}
                    bank={bank}
                    isInLendingMode={isInLendingMode}
                    isConnected={connected}
                    marginfiAccount={selectedAccount}
                    inputRefs={inputRefs}
                    showLSTDialog={(variant: LSTDialogVariants, onClose?: () => void) => {
                      setLSTDialogVariant(variant);
                      setIsLSTDialogOpen(true);
                      if (onClose) {
                        setLSTDialogCallback(() => onClose);
                      }
                    }}
                  />
                ))}
              </div>
            ) : (
              <Typography color="#868E95" className="font-aeonik font-[300] text-sm flex gap-1" gutterBottom>
                No {isInLendingMode ? "lending" : "borrowing"} {isFiltered ? "positions" : "pools"} found.
              </Typography>
            )
          ) : (
            <Skeleton sx={{ bgcolor: "grey.900" }} variant="rounded" width={390} height={215} />
          )}
        </div>
        <div className="w-full">
          <Typography className="font-aeonik font-normal flex gap-2 items-center text-2xl text-white pt-2 pb-3">
            Isolated pool
            <MrgnTooltip
              title={
                <>
                  <Typography color="inherit" style={{ fontFamily: "Aeonik Pro" }}>
                    Isolated pools are risky ⚠️
                  </Typography>
                  Assets in isolated pools cannot be used as collateral. When you borrow an isolated asset, you cannot
                  borrow other assets. Isolated pools should be considered particularly risky. As always, remember that
                  marginfi is a decentralized protocol and all deposited funds are at risk.
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
                {isolatedBanks.map((bank, i) => (
                  <AssetCard
                    key={bank.meta.tokenSymbol}
                    nativeSolBalance={nativeSolBalance}
                    bank={bank}
                    isInLendingMode={isInLendingMode}
                    isConnected={connected}
                    marginfiAccount={selectedAccount}
                    inputRefs={inputRefs}
                  />
                ))}
              </div>
            ) : (
              <Typography color="#868E95" className="font-aeonik font-[300] text-sm flex gap-1" gutterBottom>
                No {isInLendingMode ? "lending" : "borrowing"} {isFiltered ? "positions" : "pools"} found.
              </Typography>
            )
          ) : (
            <Skeleton sx={{ bgcolor: "grey.900" }} variant="rounded" width={390} height={215} />
          )}
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
