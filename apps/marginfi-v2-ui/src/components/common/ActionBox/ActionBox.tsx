import React from "react";

import { numeralFormatter, WSOL_MINT } from "@mrgnlabs/mrgn-common";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { useMrgnlendStore, useUiStore } from "~/store";
import { MarginfiActionParams, closeBalance, executeLendingAction, usePrevious } from "~/utils";
import { LendingModes } from "~/types";
import { useWalletContext } from "~/hooks/useWalletContext";

import { MrgnLabeledSwitch } from "~/components/common/MrgnLabeledSwitch";
import { ActionBoxTokens } from "~/components/common/ActionBox/ActionBoxTokens";
import { LSTDialog, LSTDialogVariants } from "~/components/common/AssetList";

import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { IconWallet } from "~/components/ui/icons";

import { ActionBoxActions } from "./ActionBoxActions";
import { ActionBoxPreview } from "./ActionBoxPreview";

type ActionBoxProps = {
  requestedAction?: ActionType;
  isDialog?: boolean;
};

export const ActionBox = ({ requestedAction, isDialog }: ActionBoxProps) => {
  const [
    mfiClient,
    nativeSolBalance,
    setIsRefreshingStore,
    fetchMrgnlendState,
    selectedAccount,
    extendedBankInfos,
    isInitialized,
  ] = useMrgnlendStore((state) => [
    state.marginfiClient,
    state.nativeSolBalance,
    state.setIsRefreshingStore,
    state.fetchMrgnlendState,
    state.selectedAccount,
    state.extendedBankInfos,
    state.initialized,
  ]);
  const [lendingMode, setLendingMode, selectedTokenBank, setSelectedTokenBank] = useUiStore((state) => [
    state.lendingMode,
    state.setLendingMode,
    state.selectedTokenBank,
    state.setSelectedTokenBank,
  ]);

  const [actionMode, setActionMode] = React.useState<ActionType>();

  const { walletContextState } = useWalletContext();

  const [isLoading, setIsLoading] = React.useState(false);
  const [isLSTDialogOpen, setIsLSTDialogOpen] = React.useState(false);
  const [lstDialogVariant, setLSTDialogVariant] = React.useState<LSTDialogVariants | null>(null);
  const [hasLSTDialogShown, setHasLSTDialogShown] = React.useState<LSTDialogVariants[]>([]);
  const [lstDialogCallback, setLSTDialogCallback] = React.useState<(() => void) | null>(null);

  const [amount, setAmount] = React.useState<number | null>(null);

  const amountInputRef = React.useRef<HTMLInputElement>(null);

  const hasActivePositions = React.useMemo(
    () => extendedBankInfos.find((bank) => bank.isActive),
    [extendedBankInfos, selectedTokenBank]
  );
  const selectedBank = React.useMemo(
    () =>
      selectedTokenBank
        ? extendedBankInfos.find((bank) => bank?.address?.equals && bank?.address?.equals(selectedTokenBank)) ?? null
        : null,
    [extendedBankInfos, selectedTokenBank]
  );
  const isDust = React.useMemo(() => selectedBank?.isActive && selectedBank?.position.isDust, [selectedBank]);
  const showCloseBalance = React.useMemo(() => actionMode === ActionType.Withdraw && isDust, [actionMode, isDust]);
  const maxAmount = React.useMemo(() => {
    if (!selectedBank || !isInitialized) {
      return 0;
    }

    switch (actionMode) {
      case ActionType.Deposit:
        return selectedBank.userInfo.maxDeposit;
      case ActionType.Withdraw:
        return selectedBank.userInfo.maxWithdraw;
      case ActionType.Borrow:
        return selectedBank.userInfo.maxBorrow;
      case ActionType.Repay:
        return selectedBank.userInfo.maxRepay;
      default:
        return 0;
    }
  }, [selectedBank, actionMode, isInitialized]);
  const isInputDisabled = React.useMemo(() => maxAmount === 0 && !showCloseBalance, [maxAmount, showCloseBalance]);
  const walletAmount = React.useMemo(
    () =>
      selectedBank?.info.state.mint?.equals && selectedBank?.info.state.mint?.equals(WSOL_MINT)
        ? selectedBank?.userInfo.tokenAccount.balance + nativeSolBalance
        : selectedBank?.userInfo.tokenAccount.balance,
    [nativeSolBalance, selectedBank]
  );
  const hasActivePosition = React.useMemo(
    () =>
      selectedBank?.isActive &&
      ((selectedBank.position.isLending && lendingMode === LendingModes.LEND) ||
        (!selectedBank.position.isLending && lendingMode === LendingModes.BORROW)),
    [selectedBank, lendingMode]
  );

  const actionModePrev = usePrevious(actionMode);
  React.useEffect(() => {
    if (actionModePrev !== null && actionModePrev !== actionMode) {
      setAmount(0);
    }
  }, [actionModePrev, actionMode]);

  React.useEffect(() => {
    setAmount(0);
  }, [lendingMode, selectedTokenBank]);

  React.useEffect(() => {
    if (!requestedAction) {
      if (lendingMode === LendingModes.LEND) {
        setActionMode(ActionType.Deposit);
      } else {
        setActionMode(ActionType.Borrow);
      }
    }
  }, [lendingMode, setActionMode]);

  React.useEffect(() => {
    if (requestedAction) {
      setActionMode(requestedAction);
    }
  }, [requestedAction, setActionMode]);

  React.useEffect(() => {
    if (
      actionMode === ActionType.Withdraw &&
      !(selectedBank?.isActive && selectedBank?.position?.isLending && lendingMode === LendingModes.LEND)
    ) {
      setSelectedTokenBank(null);
    } else if (
      actionMode === ActionType.Repay &&
      !(selectedBank?.isActive && !selectedBank?.position?.isLending && lendingMode === LendingModes.BORROW)
    ) {
      setSelectedTokenBank(null);
    }
  }, [selectedBank, actionMode, setActionMode]);

  const executeLendingActionCb = React.useCallback(
    async ({
      mfiClient,
      actionType: currentAction,
      bank,
      amount: borrowOrLendAmount,
      nativeSolBalance,
      marginfiAccount,
      walletContextState,
    }: MarginfiActionParams) => {
      setIsLoading(true);
      await executeLendingAction({
        mfiClient,
        actionType: currentAction,
        bank,
        amount: borrowOrLendAmount,
        nativeSolBalance,
        marginfiAccount,
        walletContextState,
      });

      setIsLoading(false);
      setAmount(0);

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

  const handleCloseBalance = React.useCallback(async () => {
    try {
      if (!selectedBank || !selectedAccount) {
        throw new Error();
      }
      await closeBalance({ marginfiAccount: selectedAccount, bank: selectedBank });
    } catch (error) {
      return;
    }

    setAmount(0);

    try {
      setIsRefreshingStore(true);
      await fetchMrgnlendState();
    } catch (error: any) {
      console.log("Error while reloading state");
      console.log(error);
    }
  }, [selectedBank, selectedAccount, fetchMrgnlendState, setIsRefreshingStore]);

  const handleLendingAction = React.useCallback(async () => {
    if (!actionMode || !selectedBank || !selectedAccount || !amount) {
      return;
    }

    const action = async () => {
      executeLendingActionCb({
        mfiClient,
        actionType: actionMode,
        bank: selectedBank,
        amount: amount,
        nativeSolBalance,
        marginfiAccount: selectedAccount,
        walletContextState,
      });
    };

    if (
      actionMode === ActionType.Deposit &&
      (selectedBank.meta.tokenSymbol === "SOL" || selectedBank.meta.tokenSymbol === "stSOL") &&
      !hasLSTDialogShown.includes(selectedBank.meta.tokenSymbol as LSTDialogVariants)
    ) {
      setHasLSTDialogShown((prev) => [...prev, selectedBank.meta.tokenSymbol as LSTDialogVariants]);
      setLSTDialogVariant(selectedBank.meta.tokenSymbol as LSTDialogVariants);
      setIsLSTDialogOpen(true);
      setLSTDialogCallback(() => action);

      return;
    }

    await action();

    if (
      actionMode === ActionType.Withdraw &&
      (selectedBank.meta.tokenSymbol === "SOL" || selectedBank.meta.tokenSymbol === "stSOL") &&
      !hasLSTDialogShown.includes(selectedBank.meta.tokenSymbol as LSTDialogVariants)
    ) {
      setHasLSTDialogShown((prev) => [...prev, selectedBank.meta.tokenSymbol as LSTDialogVariants]);
      setLSTDialogVariant(selectedBank.meta.tokenSymbol as LSTDialogVariants);
      return;
    }
  }, [
    actionMode,
    selectedBank,
    selectedAccount,
    amount,
    hasLSTDialogShown,
    executeLendingActionCb,
    mfiClient,
    nativeSolBalance,
    walletContextState,
  ]);

  const handleInputChange = React.useCallback(
    (newAmount: number) => {
      if (newAmount > maxAmount) {
        setAmount(maxAmount);
      } else {
        setAmount(newAmount);
      }
    },
    [maxAmount]
  );

  return (
    <>
      <div className="bg-background p-4 flex flex-col items-center gap-4">
        <div className="space-y-6 text-center w-full flex flex-col items-center">
          {!isDialog && (
            <>
              <div className="flex w-[150px] h-[42px]">
                <MrgnLabeledSwitch
                  labelLeft="Lend"
                  labelRight="Borrow"
                  checked={lendingMode === LendingModes.BORROW}
                  onClick={() => {
                    setSelectedTokenBank(null);
                    setLendingMode(lendingMode === LendingModes.LEND ? LendingModes.BORROW : LendingModes.LEND);
                  }}
                />
              </div>

              <p className="text-muted-foreground">Supply. Earn interest. Borrow. Repeat.</p>
            </>
          )}
        </div>
        <div className="p-6 bg-background-gray text-white w-full max-w-[480px] rounded-xl">
          <div className="flex flex-row items-baseline justify-between">
            {hasActivePositions && !isDialog ? (
              <div className="text-lg font-normal mb-3">
                {lendingMode === LendingModes.LEND ? "You supply" : "You borrow"}
              </div>
            ) : (
              <div />
            )}
            {selectedBank && (
              <div className="inline-flex gap-2 items-baseline mb-3">
                <div className="h-3.5">
                  <IconWallet size={16} />
                </div>
                <span className="text-sm font-normal">
                  {(walletAmount && walletAmount > 0.01
                    ? numeralFormatter(walletAmount)
                    : walletAmount == 0
                    ? "0"
                    : "< 0.01"
                  ).concat(" ", selectedBank?.meta.tokenSymbol)}
                </span>
                <button
                  className="text-xs ml-1 h-5 py-1 px-1.5 flex flex-row items-center justify-center border rounded-full border-muted-foreground/30 text-muted-foreground cursor-pointer hover:bg-muted-foreground/30 transition-colors"
                  onClick={() => setAmount(maxAmount)}
                >
                  MAX
                </button>
              </div>
            )}
          </div>
          <div className="bg-background text-3xl rounded-lg flex justify-between items-center p-4 font-medium mb-5">
            <ActionBoxTokens
              actionMode={actionMode}
              isDialog={isDialog}
              currentTokenBank={selectedTokenBank}
              setCurrentTokenBank={setSelectedTokenBank}
            />
            <Input
              type="number"
              ref={amountInputRef}
              max={50}
              value={amount!}
              disabled={isInputDisabled}
              onChange={(e) => handleInputChange(Number(e.target.value))}
              placeholder="0"
              className="bg-transparent w-full text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium"
            />
          </div>

          <ActionBoxActions
            amount={amount ?? 0}
            maxAmount={maxAmount}
            showCloseBalance={showCloseBalance ?? false}
            handleAction={() => (showCloseBalance ? handleCloseBalance() : handleLendingAction())}
            isLoading={isLoading}
            selectedBank={selectedBank}
            actionMode={actionMode}
          />

          {selectedBank && (
            <ActionBoxPreview
              marginfiAccount={selectedAccount}
              selectedBank={selectedBank}
              actionAmount={amount}
              actionMode={actionMode}
            />
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
