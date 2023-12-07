import React from "react";

import { usdFormatter } from "@mrgnlabs/mrgn-common";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { WSOL_MINT, numeralFormatter } from "@mrgnlabs/mrgn-common";
import { ChevronDownIcon } from "@radix-ui/react-icons";
import { useMrgnlendStore, useUiStore } from "~/store";
import { MarginfiActionParams, closeBalance, executeLendingAction } from "~/utils";
import { LendingModes } from "~/types";
import { useWalletContext } from "~/hooks/useWalletContext";

import { MrgnLabeledSwitch } from "~/components/common/MrgnLabeledSwitch";
import { ActionBoxTokens } from "~/components/common/ActionBox/ActionBoxTokens";

import { Input } from "~/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { IconWallet } from "~/components/ui/icons";

import { ActionBoxActions } from "./ActionBoxActions";

export const ActionBox = () => {
  const [mfiClient, nativeSolBalance, setIsRefreshingStore, fetchMrgnlendState, selectedAccount] = useMrgnlendStore(
    (state) => [
      state.marginfiClient,
      state.nativeSolBalance,
      state.setIsRefreshingStore,
      state.fetchMrgnlendState,
      state.selectedAccount,
    ]
  );
  const [lendingMode, setLendingMode, selectedToken, setSelectedToken] = useUiStore((state) => [
    state.lendingMode,
    state.setLendingMode,
    state.selectedToken,
    state.setSelectedToken,
  ]);
  const { walletContextState } = useWalletContext();
  const [selectedMode, setSelectMode] = React.useState<ActionType>();
  const [preview, setPreview] = React.useState<{ key: string; value: string }[]>([]);
  const [amount, setAmount] = React.useState<number | null>(null);
  const amountInputRef = React.useRef<HTMLInputElement>(null);

  const isDust = React.useMemo(() => selectedToken?.isActive && selectedToken?.position.isDust, [selectedToken]);
  const showCloseBalance = React.useMemo(() => selectedMode === ActionType.Withdraw && isDust, [selectedMode, isDust]);
  const maxAmount = React.useMemo(() => {
    switch (selectedMode) {
      case ActionType.Deposit:
        return selectedToken?.userInfo.maxDeposit;
      case ActionType.Withdraw:
        return selectedToken?.userInfo.maxWithdraw;
      case ActionType.Borrow:
        return selectedToken?.userInfo.maxBorrow;
      case ActionType.Repay:
        return selectedToken?.userInfo.maxRepay;
    }
  }, [selectedToken, selectedMode]);
  const isInputDisabled = React.useMemo(() => maxAmount === 0 && !showCloseBalance, [maxAmount, showCloseBalance]);
  const walletAmount = React.useMemo(
    () =>
      selectedToken?.info.state.mint.equals(WSOL_MINT)
        ? selectedToken?.userInfo.tokenAccount.balance + nativeSolBalance
        : selectedToken?.userInfo.tokenAccount.balance,
    [selectedToken]
  );
  const hasActivePosition = React.useMemo(
    () =>
      selectedToken?.isActive &&
      ((!selectedToken.isLending && lendingMode === LendingModes.LEND) ||
        (selectedToken.isLending && lendingMode === LendingModes.BORROW)),
    [selectedToken, lendingMode]
  );

  React.useEffect(() => {
    if (lendingMode === LendingModes.LEND) {
      setSelectMode(ActionType.Deposit);
    } else if (lendingMode === LendingModes.BORROW) {
      setSelectMode(ActionType.Borrow);
    }
  }, [lendingMode, setSelectMode, selectedToken]);

  React.useEffect(() => {
    if (!selectedToken || !amount) {
      setPreview([]);
      return;
    }

    setPreview([
      {
        key: "Your deposited amount",
        value: `${amount} ${selectedToken.meta.tokenSymbol}`,
      },
      {
        key: "Liquidation price",
        value: usdFormatter.format(amount),
      },
      {
        key: "Some propertya",
        value: "--",
      },
      {
        key: "Some propertyb",
        value: "--",
      },
    ]);
  }, [selectedToken, amount]);

  React.useEffect(() => {
    if (!selectedToken || !amountInputRef.current) return;
    setAmount(0);
    amountInputRef.current.focus();
  }, [selectedToken]);

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
      await executeLendingAction({
        mfiClient,
        actionType: currentAction,
        bank,
        amount: borrowOrLendAmount,
        nativeSolBalance,
        marginfiAccount,
        walletContextState,
      });

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
      await closeBalance({ marginfiAccount: selectedAccount, bank: selectedToken });
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
  }, [selectedToken, selectedAccount, fetchMrgnlendState, setIsRefreshingStore]);

  const handleLendingAction = React.useCallback(async () => {
    // TODO implement LST dialog

    await executeLendingActionCb({
      mfiClient,
      actionType: selectedMode,
      bank: selectedToken,
      amount: amount,
      nativeSolBalance,
      marginfiAccount: selectedAccount,
      walletContextState,
    });
  }, [
    selectedMode,
    selectedToken,
    executeLendingActionCb,
    mfiClient,
    amount,
    nativeSolBalance,
    selectedAccount,
    walletContextState,
  ]);

  return (
    <div className="bg-background p-4 flex flex-col items-center gap-4">
      <div className="space-y-6 text-center w-full flex flex-col items-center">
        <div className="flex w-[150px] h-[42px]">
          <MrgnLabeledSwitch
            labelLeft="Lend"
            labelRight="Borrow"
            checked={lendingMode === LendingModes.BORROW}
            onClick={() => {
              setLendingMode(lendingMode === LendingModes.LEND ? LendingModes.BORROW : LendingModes.LEND);
            }}
          />
        </div>
        <p className="text-muted-foreground">Supply. Earn interest. Borrow. Repeat.</p>
      </div>
      <div className="p-6 bg-background-gray text-white w-full max-w-[480px] rounded-xl">
        <div className="flex flex-row items-baseline justify-between">
          {hasActivePosition ? (
            <Select
              value={selectedMode}
              disabled={!hasActivePosition}
              onValueChange={(value) => {
                setSelectMode(value as ActionType);
              }}
            >
              <SelectTrigger
                className="w-[160px] h-[35px] rounded-[100px] bg-background-gray-light border-none mb-3"
                icon={<ChevronDownIcon className="h-5 w-5 opacity-70" />}
              >
                <div className="flex items-center gap-2 text-lg">
                  <SelectValue className="text-lg" defaultValue={LendingModes.LEND} placeholder="Select pools" />
                </div>
              </SelectTrigger>

              {lendingMode === LendingModes.LEND ? (
                <SelectContent>
                  <SelectItem value={ActionType.Deposit}>You supply</SelectItem>
                  <SelectItem value={ActionType.Withdraw}>You withdraw</SelectItem>
                </SelectContent>
              ) : (
                <SelectContent>
                  <SelectItem value={ActionType.Borrow}>You borrow</SelectItem>
                  <SelectItem value={ActionType.Repay}>You repay</SelectItem>
                </SelectContent>
              )}
            </Select>
          ) : (
            <p className="text-lg mb-3">You {lendingMode === LendingModes.LEND ? "supply" : "borrow"}</p>
          )}
          {selectedToken && (
            <div className="inline-flex gap-2 items-baseline">
              <div className="h-3.5">
                <IconWallet size={16} />
              </div>
              <span className="text-sm font-normal">
                {(walletAmount > 0.01 ? numeralFormatter(walletAmount) : "< 0.01").concat(
                  " ",
                  selectedToken?.meta.tokenSymbol
                )}
              </span>
              <div onClick={() => setAmount(maxAmount)} className="text-base font-bold cursor-pointer">
                MAX
              </div>
            </div>
          )}
        </div>
        <div className="bg-background text-3xl rounded-lg flex justify-between items-center p-4 font-medium mb-5">
          <ActionBoxTokens currentToken={selectedToken} setCurrentToken={setSelectedToken} />
          <Input
            type="number"
            ref={amountInputRef}
            value={amount!}
            disabled={isInputDisabled}
            onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="0"
            className="bg-transparent w-full text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-3xl font-medium"
          />
        </div>
        <ActionBoxActions
          selectedMode={selectedMode}
          amount={amount}
          maxAmount={maxAmount}
          showCloseBalance={showCloseBalance}
          handleAction={() => (showCloseBalance ? handleCloseBalance() : handleLendingAction())}
        />
        {selectedToken !== null && amount !== null && preview.length > 0 && (
          <dl className="grid grid-cols-2 text-muted-foreground gap-y-2 mt-4 text-sm">
            {preview.map((item) => (
              <React.Fragment key={item.key}>
                <dt>{item.key}</dt>
                <dd className="text-white font-medium text-right">{item.value}</dd>
              </React.Fragment>
            ))}
          </dl>
        )}
      </div>
    </div>
  );
};
