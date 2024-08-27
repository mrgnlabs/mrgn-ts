import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { formatAmount } from "@mrgnlabs/mrgn-utils";

import { Input } from "~/components/ui/input";

import { useRepayCollatBoxStore } from "../../store";
import { RepayCollatTokens } from "./RepayCollatTokens";
import { RepayCollatAction } from "./RepayCollatAction";

type RepayCollatBoxInputProps = {
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;
  amountRaw: string;
  maxAmount: number;
  isDialog?: boolean;
  isMini?: boolean;
};

export const RepayCollatBoxInput = ({ banks, nativeSolBalance, maxAmount }: RepayCollatBoxInputProps) => {
  const [amountRaw, selectedBank, selectedSecondaryBank, setAmountRaw, setSelectedBank, setSelectedSecondaryBank] =
    useRepayCollatBoxStore((state) => [
      state.amountRaw,
      state.selectedBank,
      state.selectedSecondaryBank,
      state.setAmountRaw,
      state.setSelectedBank,
      state.setSelectedSecondaryBank,
    ]);

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
      <div className="bg-background rounded-lg p-2.5 mb-6">
        <div className="flex justify-center gap-1 items-center font-medium text-3xl">
          <div className="w-full flex-auto max-w-[162px]">
            <RepayCollatTokens
              selectedBank={selectedBank}
              selectedSecondaryBank={selectedSecondaryBank}
              setSecondaryTokenBank={(bank) => {
                setSelectedSecondaryBank(bank);
              }}
              banks={banks}
              nativeSolBalance={nativeSolBalance}
              setTokenBank={function (selectedTokenBank: ExtendedBankInfo | null): void {
                throw new Error("Function not implemented.");
              }}
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
              className="bg-transparent min-w-[130px] text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium"
            />
          </div>
        </div>
        <RepayCollatAction maxAmount={maxAmount} onSetAmountRaw={(amount) => handleInputChange(amount)} />
      </div>
    </>
  );
};
