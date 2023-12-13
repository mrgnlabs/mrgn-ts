import React, { FC, useMemo } from "react";
import { WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, ActiveBankInfo, ActionType, getCurrentAction } from "@mrgnlabs/marginfi-v2-ui-state";

import { useUiStore } from "~/store";
import { LendingModes } from "~/types";

import { useAssetItemData } from "~/hooks/useAssetItemData";

import { AssetCardStats } from "./AssetCardStats";
import { AssetCardActions } from "./AssetCardActions";
import { AssetCardPosition } from "./AssetCardPosition";
import { AssetCardHeader } from "./AssetCardHeader";

export const AssetCard: FC<{
  bank: ExtendedBankInfo;
  activeBank?: ActiveBankInfo;
  nativeSolBalance: number;
  isInLendingMode: boolean;
}> = ({ bank, activeBank, nativeSolBalance, isInLendingMode }) => {
  const { rateAP, assetWeight, isBankFilled, isBankHigh, bankCap } = useAssetItemData({ bank, isInLendingMode });
  const [lendingMode, isFilteredUserPositions] = useUiStore((state) => [
    state.lendingMode,
    state.isFilteredUserPositions,
  ]);

  const totalDepositsOrBorrows = useMemo(
    () =>
      isInLendingMode
        ? bank.info.state.totalDeposits
        : Math.max(
            0,
            Math.min(bank.info.state.totalDeposits, bank.info.rawBank.config.borrowLimit.toNumber()) - bank.info.state.totalBorrows
          ),
    [isInLendingMode, bank.info]
  );

  const userBalance = useMemo(
    () =>
      bank.info.state.mint.equals(WSOL_MINT)
        ? bank.userInfo.tokenAccount.balance + nativeSolBalance
        : bank.userInfo.tokenAccount.balance,
    [bank.info.state.mint, bank.userInfo.tokenAccount, nativeSolBalance]
  );

  const currentAction: ActionType = useMemo(() => getCurrentAction(isInLendingMode, bank), [isInLendingMode, bank]);

  return (
    <div
      className="bg-[#1A1F22] rounded-xl px-[12px] py-[16px] flex flex-col gap-[16px] w-full min-w-[300px] flex-1"
      data-asset-row={bank.meta.tokenSymbol.toLowerCase()}
    >
      <AssetCardHeader bank={bank} isInLendingMode={isInLendingMode} rateAP={rateAP} />
      <AssetCardStats
        bank={bank}
        assetWeight={assetWeight}
        totalDepositsOrBorrows={totalDepositsOrBorrows}
        userBalance={userBalance}
        isInLendingMode={isInLendingMode}
        isBankFilled={isBankFilled}
        isBankHigh={isBankHigh}
        bankCap={bankCap.toNumber()}
      />
      {activeBank?.position &&
        (isFilteredUserPositions || activeBank?.position.isLending === (lendingMode === LendingModes.LEND)) && (
          <AssetCardPosition activeBank={activeBank} />
        )}
      <AssetCardActions bank={bank} currentAction={currentAction} />
    </div>
  );
};
