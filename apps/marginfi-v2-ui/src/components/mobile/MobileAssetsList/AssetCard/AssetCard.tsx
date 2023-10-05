import React, { FC, useCallback, useMemo } from "react";

import { WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, ActionType, getCurrentAction } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";

import { useMrgnlendStore } from "~/store";
import { borrowOrLend, closeBalance } from "~/utils";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useAssetItemData } from "~/hooks/useAssetItemData";

import { AssetCardStats } from "./AssetCardStats";
import { AssetCardActions } from "./AssetCardActions";

import { AssetCardPosition } from "./AssetCardPosition";
import { AssetCardHeader } from "./AssetCardHeader";

export const AssetCard: FC<{
  bank: ExtendedBankInfo;
  nativeSolBalance: number;
  isInLendingMode: boolean;
  isConnected: boolean;
  marginfiAccount: MarginfiAccountWrapper | null;
  inputRefs?: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
}> = ({ bank, nativeSolBalance, isInLendingMode, marginfiAccount, inputRefs }) => {
  const { rateAP, assetWeight, isBankFilled, isBankHigh, bankCap } = useAssetItemData({ bank, isInLendingMode });
  const [mfiClient, fetchMrgnlendState] = useMrgnlendStore((state) => [state.marginfiClient, state.fetchMrgnlendState]);
  const setIsRefreshingStore = useMrgnlendStore((state) => state.setIsRefreshingStore);
  const { connected } = useWalletContext();
  const totalDepositsOrBorrows = useMemo(
    () =>
      isInLendingMode
        ? bank.info.state.totalDeposits
        : Math.max(
            0,
            Math.min(bank.info.state.totalDeposits, bank.info.rawBank.config.borrowLimit) - bank.info.state.totalBorrows
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

  const handleCloseBalance = useCallback(async () => {
    try {
      await closeBalance({ marginfiAccount, bank });
    } catch (error) {
      return;
    }

    try {
      setIsRefreshingStore(true);
      await fetchMrgnlendState();
    } catch (error: any) {
      console.log("Error while reloading state");
      console.log(error);
    }
  }, [bank, marginfiAccount, fetchMrgnlendState, setIsRefreshingStore]);

  const handleBorrowOrLend = useCallback(
    async (borrowOrLendAmount: number) => {
      await borrowOrLend({ mfiClient, currentAction, bank, borrowOrLendAmount, nativeSolBalance, marginfiAccount });

      // -------- Refresh state
      try {
        setIsRefreshingStore(true);
        await fetchMrgnlendState();
      } catch (error: any) {
        console.log("Error while reloading state");
        console.log(error);
      }
    },
    [bank, currentAction, marginfiAccount, mfiClient, nativeSolBalance, fetchMrgnlendState, setIsRefreshingStore]
  );

  return (
    <div className="bg-[#1A1F22] rounded-xl px-[12px] py-[16px] flex flex-col gap-[16px] max-w-sm min-w-[300px] flex-1">
      <AssetCardHeader bank={bank} isInLendingMode={isInLendingMode} rateAP={rateAP} />
      <AssetCardStats
        bank={bank}
        assetWeight={assetWeight}
        totalDepositsOrBorrows={totalDepositsOrBorrows}
        userBalance={userBalance}
        isInLendingMode={isInLendingMode}
        isBankFilled={isBankFilled}
        isBankHigh={isBankHigh}
        bankCap={bankCap}
      />
      {bank.isActive && <AssetCardPosition activeBank={bank} />}
      <AssetCardActions
        bank={bank}
        inputRefs={inputRefs}
        isBankFilled={isBankFilled}
        isInLendingMode={isInLendingMode}
        currentAction={currentAction}
        onCloseBalance={() => handleCloseBalance()}
        onBorrowOrLend={(amount) => handleBorrowOrLend(amount)}
      />
    </div>
  );
};
