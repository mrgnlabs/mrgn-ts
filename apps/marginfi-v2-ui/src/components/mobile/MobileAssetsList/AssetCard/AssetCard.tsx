import React, { FC, useCallback, useMemo, useState } from "react";
import { WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ExtendedBankInfo, ActiveBankInfo, ActionType, getCurrentAction } from "@mrgnlabs/marginfi-v2-ui-state";
import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { useMrgnlendStore, useUiStore } from "~/store";
import { executeLendingAction, closeBalance, MarginfiActionParams } from "~/utils";
import { useAssetItemData } from "~/hooks/useAssetItemData";
import { useWalletContext } from "~/hooks/useWalletContext";
import { LSTDialogVariants } from "~/components/common/AssetList";
import { AssetCardStats } from "./AssetCardStats";
import { AssetCardActions } from "./AssetCardActions";
import { AssetCardPosition } from "./AssetCardPosition";
import { AssetCardHeader } from "./AssetCardHeader";
import { LendingModes } from "~/types";

export const AssetCard: FC<{
  bank: ExtendedBankInfo;
  activeBank?: ActiveBankInfo;
  nativeSolBalance: number;
  isInLendingMode: boolean;
  isConnected: boolean;
  marginfiAccount: MarginfiAccountWrapper | null;
  inputRefs?: React.MutableRefObject<Record<string, HTMLInputElement | null>>;
  showLSTDialog?: (variant: LSTDialogVariants, callback?: () => void) => void;
}> = ({ bank, activeBank, nativeSolBalance, isInLendingMode, marginfiAccount, inputRefs, showLSTDialog }) => {
  const { rateAP, assetWeight, isBankFilled, isBankHigh, bankCap } = useAssetItemData({ bank, isInLendingMode });
  const [mfiClient, fetchMrgnlendState] = useMrgnlendStore((state) => [state.marginfiClient, state.fetchMrgnlendState]);
  const setIsRefreshingStore = useMrgnlendStore((state) => state.setIsRefreshingStore);
  const [lendingMode, isFilteredUserPositions] = useUiStore((state) => [
    state.lendingMode,
    state.isFilteredUserPositions,
  ]);
  const [hasLSTDialogShown, setHasLSTDialogShown] = useState<LSTDialogVariants[]>([]);
  const { walletContextState } = useWalletContext();

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

  const executeLendingActionCb = useCallback(
    async (
      amount: number,
      {
        mfiClient,
        actionType: currentAction,
        bank,
        nativeSolBalance,
        marginfiAccount,
        walletContextState,
      }: Omit<MarginfiActionParams, "amount">
    ) => {
      await executeLendingAction({
        mfiClient,
        actionType: currentAction,
        bank,
        amount,
        nativeSolBalance,
        marginfiAccount,
        walletContextState,
      });

      // -------- Refresh state
      try {
        setIsRefreshingStore(true);
        await fetchMrgnlendState();
      } catch (error: any) {
        console.log("Error while reloading state");
        console.log(error);
      }
    },
    [fetchMrgnlendState, setIsRefreshingStore]
  );

  const handleLendingAction = useCallback(
    async (borrowOrLendAmount: number) => {
      if (
        currentAction === ActionType.Deposit &&
        (bank.meta.tokenSymbol === "SOL" || bank.meta.tokenSymbol === "stSOL") &&
        !hasLSTDialogShown.includes(bank.meta.tokenSymbol as LSTDialogVariants) &&
        showLSTDialog
      ) {
        setHasLSTDialogShown((prev) => [...prev, bank.meta.tokenSymbol as LSTDialogVariants]);
        showLSTDialog(bank.meta.tokenSymbol as LSTDialogVariants, async () => {
          await executeLendingActionCb(borrowOrLendAmount, {
            mfiClient,
            actionType: currentAction,
            bank,
            nativeSolBalance,
            marginfiAccount,
            walletContextState,
          });
        });
        return;
      }

      await executeLendingActionCb(borrowOrLendAmount, {
        mfiClient,
        actionType: currentAction,
        bank,
        nativeSolBalance,
        marginfiAccount,
        walletContextState,
      });

      if (
        currentAction === ActionType.Withdraw &&
        (bank.meta.tokenSymbol === "SOL" || bank.meta.tokenSymbol === "stSOL") &&
        !hasLSTDialogShown.includes(bank.meta.tokenSymbol as LSTDialogVariants) &&
        showLSTDialog
      ) {
        setHasLSTDialogShown((prev) => [...prev, bank.meta.tokenSymbol as LSTDialogVariants]);
        showLSTDialog(bank.meta.tokenSymbol as LSTDialogVariants);
        return;
      }
    },
    [
      currentAction,
      bank,
      hasLSTDialogShown,
      showLSTDialog,
      executeLendingActionCb,
      mfiClient,
      nativeSolBalance,
      marginfiAccount,
      walletContextState,
    ]
  );

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
      <AssetCardActions
        bank={bank}
        inputRefs={inputRefs}
        isBankFilled={isBankFilled}
        isInLendingMode={isInLendingMode}
        currentAction={currentAction}
        onCloseBalance={handleCloseBalance}
        onBorrowOrLend={handleLendingAction}
      />
    </div>
  );
};
