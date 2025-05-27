import React from "react";
import { PublicKey } from "@solana/web3.js";

import { ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { cn, formatAmount, LoopActionTxns } from "@mrgnlabs/mrgn-utils";
import { tokenPriceFormatter } from "@mrgnlabs/mrgn-common";

import { Input } from "~/components/ui/input";

import { BankSelect, LoopAction } from "./components";
import BigNumber from "bignumber.js";

type ActionInputProps = {
  nativeSolBalance: number;
  amount: number | null;
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
  isEmodeLoop?: boolean;
  highlightedEmodeBanks?: PublicKey[];

  setAmountRaw: (amountRaw: string, maxAmount?: number) => void;
  setSelectedBank: (bank: ExtendedBankInfo | null) => void;
  setSelectedSecondaryBank: (bank: ExtendedBankInfo | null) => void;
};

export const ActionInput = ({
  banks,
  nativeSolBalance,
  amount,
  amountRaw,
  walletAmount,
  maxAmount,
  isLoading,
  selectedBank,
  selectedSecondaryBank,
  highlightedEmodeBanks = [],
  actionTxns,
  isEmodeLoop,
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
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-normal text-muted-foreground">You supply</p>
        <div
          className={cn(
            "bg-background rounded-lg p-2.5 mb-6",
            isEmodeLoop && "bg-purple-900/15 border border-mfi-emode/20"
          )}
        >
          <div className="flex justify-center gap-1 items-center font-medium text-3xl">
            <div className="w-full flex-auto max-w-[162px]">
              <BankSelect
                actionMode={ActionType.Deposit}
                selectedBank={selectedBank}
                otherBank={selectedSecondaryBank}
                banks={banks}
                nativeSolBalance={nativeSolBalance}
                setTokenBank={(bank) => setSelectedBank(bank)}
                emodeConfig={{ highlightedEmodeBanks, highlightAll: true }}
              />
            </div>
            <div className="flex-auto flex flex-col gap-0 items-end">
              <Input
                type="text"
                ref={amountInputRef}
                inputMode="decimal"
                value={amountRaw}
                disabled={isInputDisabled}
                onChange={(e) => handleInputChange(e.target.value)}
                placeholder="0"
                className="bg-transparent shadow-none min-w-[130px] h-auto py-0 pr-0 text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium disabled:opacity-100 disabled:text-primary"
              />
              {amount !== null && amount > 0 && selectedBank && (
                <span className="text-xs text-muted-foreground font-light">
                  {tokenPriceFormatter(amount * selectedBank.info.oraclePrice.priceRealtime.price.toNumber())}
                </span>
              )}
            </div>
          </div>
          <LoopAction
            maxAmount={maxAmount}
            onSetAmountRaw={(amount) => handleInputChange(amount)}
            amountRaw={amountRaw}
            selectedBank={selectedBank}
            selectedSecondaryBank={selectedSecondaryBank}
            loopActionTxns={actionTxns}
            walletAmount={walletAmount}
          />
        </div>
      </div>
      <div className={cn("space-y-2", !selectedBank && "pointer-events-none opacity-75")}>
        <p className="text-sm font-normal text-muted-foreground">You borrow</p>
        <div
          className={cn(
            "bg-background rounded-lg p-2.5 mb-6",
            isEmodeLoop && selectedSecondaryBank && "bg-purple-900/15 border border-mfi-emode/20"
          )}
        >
          <div className="flex gap-1 items-center font-medium text-3xl">
            <div className={cn("w-full flex-auto max-w-[162px]", !selectedBank && "opacity-60")}>
              <BankSelect
                actionMode={ActionType.Borrow}
                selectedBank={selectedSecondaryBank}
                otherBank={selectedBank}
                banks={banks}
                nativeSolBalance={nativeSolBalance}
                setTokenBank={(bank) => setSelectedSecondaryBank(bank)}
                emodeConfig={{ highlightedEmodeBanks, highlightAll: false }}
              />
            </div>
            <div className="flex-auto flex flex-col gap-0 items-end">
              <Input
                type="text"
                inputMode="decimal"
                disabled={true}
                value={actionTxns?.borrowAmount.decimalPlaces(4, BigNumber.ROUND_DOWN).toString()}
                placeholder="0"
                className={cn(
                  "bg-transparent min-w-[130px] text-right outline-none h-auto py-0 pr-0 border-none text-base font-medium text-primary focus-visible:outline-none focus-visible:ring-0",
                  actionTxns.borrowAmount &&
                    !actionTxns.borrowAmount.isZero() &&
                    "disabled:opacity-100 disabled:text-primary"
                )}
              />
              {actionTxns?.borrowAmount && !actionTxns?.borrowAmount.isZero() && selectedSecondaryBank && (
                <span className="text-xs text-muted-foreground font-light">
                  {tokenPriceFormatter(
                    actionTxns.borrowAmount.toNumber() *
                      selectedSecondaryBank.info.oraclePrice.priceRealtime.price.toNumber()
                  )}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
