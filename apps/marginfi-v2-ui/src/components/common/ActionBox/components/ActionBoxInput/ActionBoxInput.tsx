import React from "react";
import { PublicKey } from "@solana/web3.js";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { LstType, RepayType, StakeData } from "~/utils";
import { useUiStore } from "~/store";

import { Input } from "~/components/ui/input";
import { ActionBoxTokens } from "~/components/common/ActionBox/components";

import { InputHeader } from "./Components";
import { InputAction } from "./Components/InputAction";

type ActionBoxInputProps = {
  actionMode: ActionType;
  repayMode: RepayType;
  lstType: LstType;

  selectedBank: ExtendedBankInfo | null;
  selectedRepayBank: ExtendedBankInfo | null;

  selectedTokenBank: PublicKey | null;
  selectedRepayTokenBank: PublicKey | null;
  selectedStakingAccount: StakeData | null;

  blacklistRepayTokens: PublicKey[] | undefined;
  walletAmount: number | undefined;
  amountRaw: string;
  repayAmountRaw: string;
  maxAmount: number;

  showCloseBalance?: boolean;
  isDialog?: boolean;

  onSetTokenBank: (bank: PublicKey | null) => void;
  onSetTokenRepayBank: (bank: PublicKey | null) => void;
  onSetAmountRaw: (amount: string) => void;
  onSetRepayAmountRaw: (amount: string) => void;
  changeRepayType: (repayType: RepayType) => void;
  changeLstType: (lstType: LstType) => void;
};

export const ActionBoxInput = ({
  actionMode,
  repayMode,
  lstType,
  selectedBank,
  selectedRepayBank,
  selectedTokenBank,
  selectedRepayTokenBank,
  selectedStakingAccount,
  walletAmount,
  amountRaw,
  maxAmount,
  repayAmountRaw,
  showCloseBalance,
  isDialog,
  blacklistRepayTokens,
  onSetTokenBank,
  onSetTokenRepayBank,
  onSetAmountRaw,
  onSetRepayAmountRaw,
  changeRepayType,
  changeLstType,
}: ActionBoxInputProps) => {
  const [isActionBoxInputFocussed, setIsActionBoxInputFocussed] = useUiStore((state) => [
    state.isActionBoxInputFocussed,
    state.setIsActionBoxInputFocussed,
  ]);
  const amountInputRef = React.useRef<HTMLInputElement>(null);

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const isInputDisabled = React.useMemo(
    () => (maxAmount === 0 && !showCloseBalance) || !!selectedStakingAccount,
    [maxAmount, showCloseBalance, selectedStakingAccount]
  );

  const isRepayWithCollat = React.useMemo(
    () => actionMode === ActionType.Repay && repayMode === RepayType.RepayCollat,
    [actionMode, repayMode]
  );

  const inputAmount = React.useMemo(() => {
    if (isRepayWithCollat) {
      return repayAmountRaw;
    } else {
      return amountRaw;
    }
  }, [repayAmountRaw, amountRaw, isRepayWithCollat]);

  const formatAmount = React.useCallback(
    (newAmount: string, bank: ExtendedBankInfo | null) => {
      let formattedAmount: string, amount: number;
      // Remove commas from the formatted string
      const newAmountWithoutCommas = newAmount.replace(/,/g, "");
      let decimalPart = newAmountWithoutCommas.split(".")[1];
      const mintDecimals = bank?.info.state.mintDecimals ?? 9;

      if (
        (newAmount.endsWith(",") || newAmount.endsWith(".")) &&
        !newAmount.substring(0, newAmount.length - 1).includes(".")
      ) {
        amount = isNaN(Number.parseFloat(newAmountWithoutCommas)) ? 0 : Number.parseFloat(newAmountWithoutCommas);
        formattedAmount = numberFormater.format(amount).concat(".");
      } else {
        const isDecimalPartInvalid = isNaN(Number.parseFloat(decimalPart));
        if (!isDecimalPartInvalid) decimalPart = decimalPart.substring(0, mintDecimals);
        decimalPart = isDecimalPartInvalid
          ? ""
          : ".".concat(Number.parseFloat("1".concat(decimalPart)).toString().substring(1));
        amount = isNaN(Number.parseFloat(newAmountWithoutCommas)) ? 0 : Number.parseFloat(newAmountWithoutCommas);
        formattedAmount = numberFormater.format(amount).split(".")[0].concat(decimalPart);
      }

      if (amount > maxAmount) {
        return numberFormater.format(maxAmount);
      } else {
        return formattedAmount;
      }
    },
    [maxAmount, numberFormater]
  );

  const handleInputChange = React.useCallback(
    (newAmount: string) => {
      if (isRepayWithCollat) {
        onSetRepayAmountRaw(formatAmount(newAmount, selectedRepayBank));
      } else {
        onSetAmountRaw(formatAmount(newAmount, selectedBank));
      }
    },
    [formatAmount, onSetAmountRaw, onSetRepayAmountRaw, selectedBank, selectedRepayBank, isRepayWithCollat]
  );

  return (
    <>
      {/* Contains 'max' button and input title */}
      <InputHeader
        actionMode={actionMode}
        isDialog={isDialog}
        selectedBank={selectedBank}
        repayMode={repayMode}
        lstType={lstType}
        selectedStakingAccount={selectedStakingAccount}
        walletAmount={walletAmount}
        maxAmount={maxAmount}
        amountRaw={amountRaw}
        onSetAmountRaw={(amount) => handleInputChange(amount)}
        changeRepayType={(type) => changeRepayType(type)}
        changeLstType={(type) => changeLstType(type)}
      />
      <div className="bg-background rounded-lg p-2.5 mb-6">
        <div className="flex justify-center gap-1 items-center font-medium text-3xl">
          <div className="w-full flex-auto max-w-[162px]">
            <ActionBoxTokens
              isDialog={isDialog}
              repayType={repayMode}
              lstType={lstType}
              repayTokenBank={selectedRepayTokenBank}
              currentTokenBank={selectedTokenBank}
              setRepayTokenBank={(tokenBank) => {
                onSetTokenRepayBank(tokenBank);
                onSetRepayAmountRaw("");
              }}
              setCurrentTokenBank={(tokenBank) => {
                onSetTokenBank(tokenBank);
                onSetAmountRaw("");
              }}
              blacklistRepayTokens={blacklistRepayTokens}
              actionMode={actionMode}
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
          actionMode={actionMode}
          selectedBank={selectedBank}
          selectedRepayBank={selectedRepayBank}
          repayMode={repayMode}
          selectedStakingAccount={selectedStakingAccount}
          amountRaw={amountRaw}
          repayAmountRaw={repayAmountRaw}
          walletAmount={walletAmount}
          maxAmount={maxAmount}
          onSetAmountRaw={(amount) => handleInputChange(amount)}
        />
      </div>
    </>
  );
};
