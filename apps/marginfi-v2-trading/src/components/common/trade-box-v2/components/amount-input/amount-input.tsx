import React from "react";

import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { Input } from "~/components/ui/input";
import { MaxAction } from "./components";

interface AmountInputProps {
  maxAmount: number;
  amount: string;
  collateralBank?: ExtendedBankInfo;

  handleAmountChange: (value: string) => void;
}

export const AmountInput = ({
  amount,
  collateralBank,
  maxAmount,

  handleAmountChange,
}: AmountInputProps) => {
  const amountInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className="bg-background  p-2.5 border border-accent rounded-lg">
      <div className="flex justify-center gap-1 items-center font-medium ">
        <span className="w-full flex-auto max-w-[162px] text-muted-foreground text-xl">
          {collateralBank?.meta.tokenSymbol.toUpperCase()}
          {/* TODO: replace this with pool select */}
        </span>
        <div>
          <Input
            type="text"
            ref={amountInputRef}
            inputMode="decimal"
            value={amount}
            // disabled={isInputDisabled} // TODO: add this
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="0"
            className="bg-transparent shadow-none min-w-[130px] h-auto py-0 pr-0 text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium"
          />
          {/* {amount !== null && amount > 0 && selectedBank && (
            <span className="text-xs text-muted-foreground font-light">
              {tokenPriceFormatter(amount * selectedBank.info.oraclePrice.priceRealtime.price.toNumber())}
            </span>
          )} */}{" "}
          {/* // TODO: add this usd price  */}
        </div>
      </div>
      <MaxAction maxAmount={maxAmount} collateralBank={collateralBank} setAmount={handleAmountChange} />
    </div>
  );
};
