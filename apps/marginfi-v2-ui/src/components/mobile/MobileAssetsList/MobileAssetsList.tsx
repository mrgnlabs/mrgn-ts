import React, { FC, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useHotkeys } from "react-hotkeys-hook";
import { Card, Table, TableHead, TableBody, TableContainer, TableCell } from "@mui/material";
import { styled } from "@mui/material/styles";
import Tooltip, { TooltipProps, tooltipClasses } from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";

import { useMrgnlendStore, useUserProfileStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";
import { BorrowLendToggle } from "~/components/common/AssetList/BorrowLendToggle";
import { AssetCard } from "./AssetCard";

// import { LoadingAsset, AssetRow } from "./AssetRow";

export const MobileAssetsList: FC = () => {
  const { connected } = useWalletContext();
  const [isStoreInitialized, sortedBanks, nativeSolBalance, selectedAccount] = useMrgnlendStore((state) => [
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
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [isInLendingMode, setIsInLendingMode] = useState(true);
  const [isHotkeyMode, setIsHotkeyMode] = useState(false);

  return (
    <>
      <div className="col-span-full">
        <BorrowLendToggle isInLendingMode={isInLendingMode} setIsInLendingMode={setIsInLendingMode} />
      </div>
      <div className="col-span-full">
        <div className="font-aeonik font-normal flex items-center text-2xl text-white">Global pool</div>
        {sortedBanks
          .filter((b) => !b.info.state.isIsolated)
          .map((bank, i) =>
            isStoreInitialized ? (
              <AssetCard
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
              />
            ) : (
              // TODO add skeleton lib & component if green light
              <></>
            )
          )}
      </div>
    </>
  );
};
