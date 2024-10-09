import React from "react";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn, formatAmount, LoopActionTxns } from "@mrgnlabs/mrgn-utils";

import { Input } from "~/components/ui/input";

import { BankSelect, StakeAction } from "./components";
import BigNumber from "bignumber.js";

type ActionInputProps = {
  nativeSolBalance: number;
  amountRaw: string;
  maxAmount: number;
  isLoading: boolean;
  walletAmount: number | undefined;
  banks: ExtendedBankInfo[];
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  actionTxns: LoopActionTxns;

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
  walletAmount,
  maxAmount,
  isLoading,
  selectedBank,
  selectedSecondaryBank,
  actionTxns,
  setAmountRaw,
  setSelectedBank,
  setSelectedSecondaryBank,
}: ActionInputProps) => {
  const amountInputRef = React.useRef<HTMLInputElement>(null);

  const bothBanksSelected = React.useMemo(
    () => Boolean(selectedBank && selectedSecondaryBank),
    [selectedBank, selectedSecondaryBank]
  );

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const isInputDisabled = React.useMemo(
    () => maxAmount === 0 || isLoading || !bothBanksSelected,
    [maxAmount, isLoading, bothBanksSelected]
  );

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
            <BankSelect
              actionMode={ActionType.Deposit}
              selectedBank={selectedBank}
              otherBank={selectedSecondaryBank}
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
              className="bg-transparent min-w-[130px] text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium"
            />
          </div>
        </div>
      </div>
      <div className={cn("space-y-2", !selectedBank && "pointer-events-none opacity-75")}>
        <p className="text-sm font-normal text-muted-foreground">You borrow</p>
        <div className="bg-background rounded-lg p-2.5 mb-6">
          <div className="flex gap-1 items-center font-medium text-3xl">
            <div className={cn("w-full flex-auto max-w-[162px]", !selectedBank && "opacity-60")}>
              <BankSelect
                actionMode={ActionType.Borrow}
                selectedBank={selectedSecondaryBank}
                otherBank={selectedBank}
                banks={banks}
                nativeSolBalance={nativeSolBalance}
                setTokenBank={(bank) => setSelectedSecondaryBank(bank)}
              />
            </div>
            <div className="flex-auto">
              <Input
                type="text"
                inputMode="decimal"
                disabled={true}
                value={actionTxns?.borrowAmount.decimalPlaces(4, BigNumber.ROUND_DOWN).toString()}
                placeholder="0"
                className="bg-transparent min-w-[130px] text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};
