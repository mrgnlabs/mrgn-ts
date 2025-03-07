import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { formatAmount } from "@mrgnlabs/mrgn-utils";
import { tokenPriceFormatter } from "@mrgnlabs/mrgn-common";

import { SelectedBankItem } from "~/components/action-box-v2/components";
import { Input } from "~/components/ui/input";

import { AddPositionAction } from "./components";

type ActionInputProps = {
  amount: number | null;
  amountRaw: string;
  maxAmount: number;
  isLoading: boolean;
  quoteBank: ExtendedBankInfo;
  setAmountRaw: (amountRaw: string, maxAmount?: number) => void;
};

export const ActionInput = ({ amount, amountRaw, maxAmount, isLoading, quoteBank, setAmountRaw }: ActionInputProps) => {
  const amountInputRef = React.useRef<HTMLInputElement>(null);

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const isInputDisabled = React.useMemo(() => maxAmount === 0 || isLoading, [maxAmount, isLoading]);

  const tokenPrice = React.useMemo(() => quoteBank.info.oraclePrice.priceRealtime.price.toNumber() ?? 0, [quoteBank]);

  const formatAmountCb = React.useCallback(
    (newAmount: string, bank: ExtendedBankInfo | null) => {
      return formatAmount(newAmount, maxAmount, bank, numberFormater);
    },
    [maxAmount, numberFormater]
  );

  const handleInputChange = React.useCallback(
    (newAmount: string) => {
      setAmountRaw(formatAmountCb(newAmount, quoteBank));
    },
    [formatAmountCb, setAmountRaw, quoteBank]
  );

  return (
    <div className="rounded-lg p-2.5 bg-mfi-action-box-background-dark">
      <div className="flex justify-center gap-1 items-center font-medium text-3xl">
        <div className="w-full flex-auto max-w-[162px]">
          <div className="flex gap-3 w-full items-center">
            <SelectedBankItem bank={quoteBank} />
          </div>
        </div>
        <div className="flex-auto flex flex-col gap-0 items-end">
          <div className="flex gap-1 items-center">
            <Input
              type="text"
              ref={amountInputRef}
              inputMode="decimal"
              value={amountRaw}
              disabled={isInputDisabled}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="0"
              className="bg-transparent shadow-none min-w-[130px] text-right h-auto py-0 pr-0 outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium"
            />
          </div>
          {amount !== null && amount > 0 && (
            <span className="text-xs text-muted-foreground font-light">{tokenPriceFormatter(amount * tokenPrice)}</span>
          )}
        </div>
      </div>
      <AddPositionAction
        walletAmount={quoteBank.userInfo.tokenAccount.balance}
        maxAmount={maxAmount}
        quoteBank={quoteBank}
        amountRaw={amountRaw}
        onSetAmountRaw={(amount) => handleInputChange(amount)}
      />
    </div>
  );
};
