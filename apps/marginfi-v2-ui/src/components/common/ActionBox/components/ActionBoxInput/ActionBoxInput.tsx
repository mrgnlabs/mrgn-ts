import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { RepayType, YbxType, formatAmount } from "~/utils";
import { useActionBoxStore } from "~/hooks/useActionBoxStore";
import { useConnection } from "~/hooks/useConnection";
import { useMrgnlendStore, useUiStore } from "~/store";

import { Input } from "~/components/ui/input";
import { ActionBoxTokens } from "~/components/common/ActionBox/components";

import { InputHeader, YbxInput, InputAction } from "./Components";
import { LoopInput } from "./Components/LoopInput";

type ActionBoxInputProps = {
  walletAmount: number | undefined;
  amountRaw: string;
  maxAmount: number;
  showCloseBalance?: boolean;
  isDialog?: boolean;
  isMini?: boolean;
};

export const ActionBoxInput = ({
  walletAmount,
  maxAmount,
  showCloseBalance,
  isDialog,
  isMini = false,
}: ActionBoxInputProps) => {
  const [isActionBoxInputFocussed, setIsActionBoxInputFocussed] = useUiStore((state) => [
    state.isActionBoxInputFocussed,
    state.setIsActionBoxInputFocussed,
  ]);
  const [
    actionMode,
    repayMode,
    ybxMode,
    selectedBank,
    selectedRepayBank,
    amountRaw,
    repayAmountRaw,
    selectedStakingAccount,
    setAmountRaw,
    setRepayAmountRaw,
    setLoopingAmountRaw,
    setSelectedBank,
    setRepayBank,
    setSelectedStakingAccount,
    setRepayMode,
    setLstMode,
    setYbxMode,
    setActionMode,
  ] = useActionBoxStore(isDialog)((state) => [
    state.actionMode,
    state.repayMode,
    state.ybxMode,
    state.selectedBank,
    state.selectedRepayBank,
    state.amountRaw,
    state.repayAmountRaw,
    state.selectedStakingAccount,
    state.setAmountRaw,
    state.setRepayAmountRaw,
    state.setLoopingAmountRaw,
    state.setSelectedBank,
    state.setRepayBank,
    state.setSelectedStakingAccount,
    state.setRepayMode,
    state.setLstMode,
    state.setYbxMode,
    state.setActionMode,
  ]);
  const [selectedAccount] = useMrgnlendStore((state) => [state.selectedAccount]);
  const { connection } = useConnection();

  const amountInputRef = React.useRef<HTMLInputElement>(null);

  const showYbxInput = React.useMemo(
    () => actionMode === ActionType.MintYBX && (ybxMode === YbxType.AddCollat || ybxMode == YbxType.WithdrawCollat),
    [actionMode, ybxMode]
  );

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const isInputDisabled = React.useMemo(
    () => (maxAmount === 0 && !showCloseBalance) || !!selectedStakingAccount,
    [maxAmount, showCloseBalance, selectedStakingAccount]
  );

  const isRepayWithCollat = React.useMemo(
    () => actionMode === ActionType.Repay && repayMode === RepayType.RepayCollat,
    [actionMode, repayMode]
  );

  const isLoopMode = React.useMemo(() => actionMode === ActionType.Loop, [actionMode]);

  const inputAmount = React.useMemo(() => {
    if (isRepayWithCollat) {
      return repayAmountRaw;
    } else {
      return amountRaw;
    }
  }, [repayAmountRaw, amountRaw, isRepayWithCollat]);

  const formatAmountCb = React.useCallback(
    (newAmount: string, bank: ExtendedBankInfo | null) => {
      return formatAmount(newAmount, maxAmount, bank, numberFormater);
    },
    [maxAmount, numberFormater]
  );

  const handleInputChange = React.useCallback(
    (newAmount: string) => {
      if (actionMode === ActionType.Loop) {
        if (selectedAccount)
          setLoopingAmountRaw(selectedAccount, formatAmountCb(newAmount, selectedRepayBank), connection);
      } else if (isRepayWithCollat) {
        if (selectedAccount)
          setRepayAmountRaw(selectedAccount, formatAmountCb(newAmount, selectedRepayBank), connection);
      } else {
        setAmountRaw(formatAmountCb(newAmount, selectedBank));
      }
    },
    [
      actionMode,
      isRepayWithCollat,
      selectedAccount,
      setLoopingAmountRaw,
      formatAmountCb,
      selectedRepayBank,
      connection,
      setRepayAmountRaw,
      setAmountRaw,
      selectedBank,
    ]
  );

  return (
    <>
      {/* Contains 'max' button and input title */}
      <InputHeader
        isDialog={isDialog}
        isMini={isMini}
        changeRepayType={(type) => setRepayMode(type)}
        changeLstType={(type) => setLstMode(type)}
        changeYbxType={(type) => setYbxMode(type)}
        changeActionType={(type) => setActionMode(type)}
      />
      {showYbxInput ? (
        <YbxInput
          isDialog={isDialog}
          maxAmount={maxAmount}
          setAmountRaw={(amount) => setAmountRaw(formatAmountCb(amount, selectedBank))}
        />
      ) : isLoopMode ? (
        <LoopInput
          isDialog={isDialog}
          walletAmount={walletAmount}
          maxAmount={maxAmount}
          handleInputChange={handleInputChange}
          handleInputFocus={setIsActionBoxInputFocussed}
        />
      ) : (
        <div className="bg-background rounded-lg p-2.5 mb-6">
          <div className="flex justify-center gap-1 items-center font-medium text-3xl">
            <div className="w-full flex-auto max-w-[162px]">
              <ActionBoxTokens
                isDialog={isDialog}
                setRepayTokenBank={(tokenBank) => {
                  setRepayBank(tokenBank);
                }}
                setTokenBank={(tokenBank) => {
                  setSelectedBank(tokenBank);
                }}
                setStakingAccount={(account) => {
                  setSelectedStakingAccount(account);
                }}
                setLoopBank={(tokenBank) => {
                  setRepayBank(tokenBank);
                }}
              />
            </div>
            <div className="flex-auto">
              <Input
                type="text"
                ref={amountInputRef}
                inputMode="decimal"
                value={inputAmount}
                disabled={isInputDisabled}
                onChange={(e) => handleInputChange(e.target.value)}
                onFocus={() => setIsActionBoxInputFocussed(true)}
                onBlur={() => setIsActionBoxInputFocussed(false)}
                placeholder="0"
                className="bg-transparent min-w-[130px] text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium"
              />
            </div>
          </div>
          <InputAction
            walletAmount={walletAmount}
            maxAmount={maxAmount}
            isDialog={isDialog}
            onSetAmountRaw={(amount) => handleInputChange(amount)}
          />
        </div>
      )}
    </>
  );
};
