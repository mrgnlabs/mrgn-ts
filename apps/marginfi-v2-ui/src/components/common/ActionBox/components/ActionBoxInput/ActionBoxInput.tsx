import React from "react";
import { PublicKey } from "@solana/web3.js";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

import { RepayType, StakeData } from "~/utils";

import { Input } from "~/components/ui/input";
import { ActionBoxTokens } from "~/components/common/ActionBox/components";

import { InputHeader } from "./Components";

type ActionBoxInputProps = {
  actionMode: ActionType;
  repayMode: RepayType;

  selectedBank: ExtendedBankInfo | null;
  selectedTokenBank: PublicKey | null;
  selectedStakingAccount: StakeData | null;

  walletAmount: number | undefined;
  amountRaw: string;
  maxAmount: number;

  showCloseBalance?: boolean;
  isDialog?: boolean;
  showLendingHeader?: boolean;

  onSetTokenBank: (bank: PublicKey | null) => void;
  onSetAmountRaw: (amount: string) => void;
  changeRepayType: (repayType: RepayType) => void;
};

export const ActionBoxInput = ({
  actionMode,
  repayMode,
  selectedBank,
  selectedTokenBank,
  selectedStakingAccount,
  walletAmount,
  amountRaw,
  maxAmount,
  showCloseBalance,
  isDialog,
  onSetTokenBank,
  onSetAmountRaw,
  changeRepayType,
}: ActionBoxInputProps) => {
  const amountInputRef = React.useRef<HTMLInputElement>(null);

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const isInputDisabled = React.useMemo(
    () => (maxAmount === 0 && !showCloseBalance) || !!selectedStakingAccount,
    [maxAmount, showCloseBalance, selectedStakingAccount]
  );

  const handleInputChange = React.useCallback(
    (newAmount: string) => {
      let formattedAmount: string, amount: number;
      // Remove commas from the formatted string
      const newAmountWithoutCommas = newAmount.replace(/,/g, "");
      let decimalPart = newAmountWithoutCommas.split(".")[1];
      const mintDecimals = selectedBank?.info.state.mintDecimals ?? 9;

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
        onSetAmountRaw(numberFormater.format(maxAmount));
      } else {
        onSetAmountRaw(formattedAmount);
      }
    },
    [maxAmount, onSetAmountRaw, selectedBank, numberFormater]
  );

  return (
    <>
      {/* Contains 'max' button and input title */}
      <InputHeader
        actionMode={actionMode}
        isDialog={isDialog}
        selectedBank={selectedBank}
        repayMode={repayMode}
        selectedStakingAccount={selectedStakingAccount}
        walletAmount={walletAmount}
        maxAmount={maxAmount}
        onSetAmountRaw={(amount) => onSetAmountRaw(amount)}
        changeRepayType={(type) => changeRepayType(type)}
      />
      <div className="bg-background text-3xl rounded-lg flex justify-center gap-1 items-center p-4 font-medium mb-5">
        <div className="w-full flex-auto max-w-[162px]">
          <ActionBoxTokens
            isDialog={isDialog}
            currentTokenBank={selectedTokenBank}
            setCurrentTokenBank={(tokenBank) => {
              onSetTokenBank(tokenBank);
              onSetAmountRaw("");
            }}
            actionMode={actionMode}
          />
        </div>
        <div className="flex-auto">
          <Input
            type="text"
            ref={amountInputRef}
            inputMode="numeric"
            value={amountRaw}
            disabled={isInputDisabled}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="0"
            className="bg-transparent min-w-[130px] text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium"
          />
        </div>
      </div>
    </>
  );
};
