import React, { FC, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  FormControl,
  FormHelperText,
  MenuItem,
  Select,
  SelectChangeEvent,
  Skeleton,
  Typography,
  paperClasses,
} from "@mui/material";
import { useMrgnlendStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";
import { MrgnContainedSwitch, MrgnLabeledSwitch, MrgnTooltip } from "~/components/common";

import { AssetCard } from "./AssetCard";
import { SORT_OPTIONS_MAP, SortAssetOption, sortApRate, sortTvl } from "./MobileAssetsList.utils";

export const MobileAssetsList: FC = () => {
  const [isFiltered, setIsFiltered] = useState(false);
  const [sortOption, setSortOption] = useState<SortAssetOption>();
  const togglePositions = () => setIsFiltered((previousState) => !previousState);

  const { connected } = useWalletContext();
  const [isStoreInitialized, sortedBanks, nativeSolBalance, selectedAccount] = useMrgnlendStore((state) => [
    state.initialized,
    state.extendedBankInfos,
    state.nativeSolBalance,
    state.selectedAccount,
  ]);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [isInLendingMode, setIsInLendingMode] = useState(true);

  // const test = useMemo(() => sortedBanks && sortedBanks.sort((a,b) => a.) ,[])

  const sortBanks = (banks: ExtendedBankInfo) => {
    if (sortOption.field === "APY") {
      return sortApRate(banks, isInLendingMode, sortOption.direction);
    } else if (sortOption.field === "TVL") {
      return sortTvl(banks, sortOption.direction);
    } else {
      return banks;
    }
  };

  const globalBanks = useMemo(() => {
    const filteredBanks =
      sortedBanks &&
      sortedBanks.filter((b) => !b.info.state.isIsolated).filter((b) => (isFiltered ? b.isActive : true));

    if (sortOption && filteredBanks) {
      return sortBanks(filteredBanks);
    } else {
      return filteredBanks;
    }
  }, [sortedBanks, isFiltered, sortOption]);

  const isolatedBanks = useMemo(() => {
    const filteredBanks =
      sortedBanks && sortedBanks.filter((b) => b.info.state.isIsolated).filter((b) => (isFiltered ? b.isActive : true));

    if (sortOption && filteredBanks) {
      return sortBanks(filteredBanks);
    } else {
      return filteredBanks;
    }
  }, [sortedBanks, isFiltered, sortOption]);

  const handleSortChange = (event: SelectChangeEvent) => {
    setSortOption(SORT_OPTIONS_MAP[event.target.value]);
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
        <div className="flex items-center gap-1">
          <MrgnContainedSwitch
            checked={isFiltered}
            onChange={togglePositions}
            inputProps={{ "aria-label": "controlled" }}
          />
          <div>Filter my positions</div>
        </div>
        <div>
          <FormControl sx={{ m: 1, width: "102px", height: "36px", color: "white", margin: 0 }}>
            <Select
              value={sortOption?.value ?? ""}
              onChange={handleSortChange}
              inputProps={{ "aria-label": "Without label" }}
              disableUnderline
              variant="standard"
              placeholder="Sort"
              MenuProps={{
                PaperProps: {
                  sx: {
                    backgroundColor: "#22282c",
                    color: "red",
                  },
                },
              }}
              sx={{
                color: "white",
                height: "36px",
                fontSize: "16px",
                fontWeight: 400,
                marginRight: "4px",
                padding: "8px 16px",
                borderWidth: 0,
                backgroundColor: "#22282c",
                borderRadius: "6px",
                "& .MuiSvgIcon-root": {
                  color: "white",
                  marginRight: "6px",
                },
              }}
            >
              <MenuItem value="" sx={{ color: "#A1A1A1", backgroundColor: "#22282c" }}>
                <em>None</em>
              </MenuItem>
              {Object.values(SORT_OPTIONS_MAP).map((option) => (
                <MenuItem
                  sx={{
                    color: "white",
                    backgroundColor: "#22282c",
                  }}
                  value={option.value}
                >
                  {isInLendingMode || !option.borrowLabel ? option.label : option.borrowLabel}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </div>
      </div>
      <div className="w-full">
        <Typography className="font-aeonik font-normal flex items-center text-2xl text-white pt-2 pb-3">
          Global pool
        </Typography>
        {isStoreInitialized && globalBanks ? (
          globalBanks.length > 0 ? (
            <div className="flex flew-row flex-wrap gap-6 justify-center items-center pt-2">
              {globalBanks.map((bank, i) => (
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
    </>
  );
};
