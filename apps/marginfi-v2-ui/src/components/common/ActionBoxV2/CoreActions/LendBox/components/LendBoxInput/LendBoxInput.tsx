import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { formatAmount } from "@mrgnlabs/mrgn-utils";

import { useConnection } from "~/hooks/useConnection";
import { useUiStore } from "~/store";

import { Input } from "~/components/ui/input";

import { useLendBoxStore } from "../../store";
import { LendingTokens } from "./LendingTokens";
import { LendingAction } from "./LendingAction";

type ActionBoxInputProps = {
  banks: ExtendedBankInfo[];
  nativeSolBalance: number;
  walletAmount: number | undefined;
  amountRaw: string;
  maxAmount: number;
  showCloseBalance?: boolean;
  isDialog?: boolean;
  isMini?: boolean;
};

export const ActionBoxInput = ({
  banks,
  nativeSolBalance,
  walletAmount,
  maxAmount,
  showCloseBalance,
  isDialog,
}: ActionBoxInputProps) => {
  const [isActionBoxInputFocussed, setIsActionBoxInputFocussed, priorityFee] = useUiStore((state) => [
    state.isActionBoxInputFocussed,
    state.setIsActionBoxInputFocussed,
    state.priorityFee,
  ]);
  const [amountRaw, selectedBank, lendMode, setAmountRaw, setSelectedBank] = useLendBoxStore((state) => [
    state.amountRaw,
    state.selectedBank,
    state.lendMode,
    state.setAmountRaw,
    state.setSelectedBank,
  ]);
  const { connection } = useConnection();

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
    <>
      {/* Contains 'max' button and input title */}
      <div className="bg-background rounded-lg p-2.5 mb-6">
        <div className="flex justify-center gap-1 items-center font-medium text-3xl">
          <div className="w-full flex-auto max-w-[162px]">
            <LendingTokens
              selectedBank={selectedBank}
              setSelectedBank={(bank) => {
                setSelectedBank(bank);
              }}
              banks={banks}
              nativeSolBalance={nativeSolBalance}
              lendMode={lendMode}
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
              onFocus={() => setIsActionBoxInputFocussed(true)}
              onBlur={() => setIsActionBoxInputFocussed(false)}
              placeholder="0"
              className="bg-transparent min-w-[130px] text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium"
            />
          </div>
        </div>
        <LendingAction
          walletAmount={walletAmount}
          maxAmount={maxAmount}
          isDialog={isDialog}
          onSetAmountRaw={(amount) => handleInputChange(amount)}
        />
      </div>
    </>
  );
};
