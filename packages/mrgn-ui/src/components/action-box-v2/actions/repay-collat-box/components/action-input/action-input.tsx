import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { formatAmount } from "@mrgnlabs/mrgn-utils";

import { Input } from "~/components/ui/input";

import { BankSelect, RepayAction } from "./components";

type ActionInputProps = {
  nativeSolBalance: number;
  amountRaw: string;
  repayAmount: number;
  maxAmount: number;
  banks: ExtendedBankInfo[];
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;

  isDialog?: boolean;
  isMini?: boolean;

  setAmountRaw: (amountRaw: string, maxAmount?: number) => void;
  setSelectedBank: (bank: ExtendedBankInfo | null) => void;
  setSelectedSecondaryBank: (bank: ExtendedBankInfo | null) => void;
};

export const ActionInput = ({
  banks,
  nativeSolBalance,
  amountRaw,
  repayAmount,
  maxAmount,
  selectedBank,
  selectedSecondaryBank,
  setAmountRaw,
  setSelectedBank,
  setSelectedSecondaryBank,
}: ActionInputProps) => {
  const amountInputRef = React.useRef<HTMLInputElement>(null);

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const isInputDisabled = React.useMemo(() => maxAmount === 0, [maxAmount]);

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
    <>
      {/* Contains 'max' button and input title */}
      <div className="bg-mfi-action-box-background-dark rounded-lg p-2.5 mb-6">
        <div className="flex justify-center gap-1 items-center font-medium text-3xl">
          <div className="w-full flex-auto max-w-[162px]">
            <BankSelect
              selectedBank={selectedBank}
              selectedSecondaryBank={selectedSecondaryBank}
              setSecondaryTokenBank={(bank) => {
                setSelectedSecondaryBank(bank);
              }}
              banks={banks}
              nativeSolBalance={nativeSolBalance}
              setTokenBank={(bank) => setSelectedBank(bank)}
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
        <RepayAction
          maxAmount={maxAmount}
          onSetAmountRaw={(amount) => handleInputChange(amount)}
          amountRaw={amountRaw}
          repayAmount={repayAmount}
          selectedBank={selectedBank}
          selectedSecondaryBank={selectedSecondaryBank}
        />
      </div>
    </>
  );
};
