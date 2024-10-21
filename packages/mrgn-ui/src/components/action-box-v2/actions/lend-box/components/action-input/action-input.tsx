import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { formatAmount } from "@mrgnlabs/mrgn-utils";

import { Input } from "~/components/ui/input";

import { LendingAction, BankSelect } from "./components";

type ActionInputProps = {
  amountRaw: string;
  nativeSolBalance: number;
  walletAmount: number | undefined;
  maxAmount: number;
  banks: ExtendedBankInfo[];
  selectedBank: ExtendedBankInfo | null;
  lendMode: ActionType;

  connected: boolean;
  showCloseBalance?: boolean;
  isDialog?: boolean;
  isMini?: boolean;

  setAmountRaw: (amount: string) => void;
  setSelectedBank: (bank: ExtendedBankInfo | null) => void;
};

export const ActionInput = ({
  banks,
  nativeSolBalance,
  walletAmount,
  maxAmount,
  showCloseBalance,
  connected,
  isDialog,

  amountRaw,
  selectedBank,
  lendMode,
  setAmountRaw,
  setSelectedBank,
}: ActionInputProps) => {
  const amountInputRef = React.useRef<HTMLInputElement>(null);

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const isInputDisabled = React.useMemo(() => maxAmount === 0 && !showCloseBalance, [maxAmount, showCloseBalance]);

  const formatAmountCb = React.useCallback(
    (newAmount: string, bank: ExtendedBankInfo | null) => {
      return formatAmount(newAmount, maxAmount, bank, numberFormater);
    },
    [maxAmount, numberFormater]
  );

  const handleInputChange = React.useCallback(
    (newAmount: string) => {
      setAmountRaw(formatAmountCb(newAmount, selectedBank));
    },
    [formatAmountCb, setAmountRaw, selectedBank]
  );

  return (
    <div className="rounded-lg p-2.5 bg-mfi-action-box-background-dark">
      <div className="flex justify-center gap-1 items-center font-medium text-3xl">
        <div className="w-full flex-auto max-w-[162px]">
          <BankSelect
            selectedBank={selectedBank}
            setSelectedBank={(bank) => {
              setSelectedBank(bank);
            }}
            isSelectable={!isDialog}
            banks={banks}
            nativeSolBalance={nativeSolBalance}
            lendMode={lendMode}
            connected={connected}
          />
        </div>
        <div className="flex-auto">
          <Input
            type="text"
            ref={amountInputRef}
            inputMode="decimal"
            value={amountRaw}
            disabled={isInputDisabled}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="0"
            className="bg-transparent shadow-none min-w-[130px] text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium"
          />
        </div>
      </div>
      <LendingAction
        walletAmount={walletAmount}
        maxAmount={maxAmount}
        onSetAmountRaw={(amount) => handleInputChange(amount)}
        selectedBank={selectedBank}
        lendMode={lendMode}
      />
    </div>
  );
};
