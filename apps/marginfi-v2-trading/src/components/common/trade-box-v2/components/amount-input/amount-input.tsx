import React from "react";
import Image from "next/image";
import { Input } from "~/components/ui/input";
import { MaxAction } from "./components";
import { ArenaBank } from "~/types/trade-store.types";

interface AmountInputProps {
  maxAmount: number;
  amount: string;
  collateralBank: ArenaBank | null;

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
    <div className="bg-accent p-2.5 border border-accent/150 rounded-md">
      <div className="flex justify-center gap-1 items-center font-medium ">
        <span className="w-full flex items-center gap-1 max-w-[162px] text-muted-foreground text-base">
          {collateralBank?.meta.tokenLogoUri && (
            <Image
              src={collateralBank?.meta.tokenLogoUri}
              alt={collateralBank?.meta.tokenSymbol}
              width={24}
              height={24}
              className="bg-background border rounded-full"
            />
          )}
          {collateralBank?.meta.tokenSymbol.toUpperCase()}
        </span>
        <div>
          <Input
            type="text"
            ref={amountInputRef}
            inputMode="decimal"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            disabled={maxAmount === 0}
            placeholder="0"
            className="bg-transparent shadow-none min-w-[130px] h-auto py-0 pr-0 text-right outline-none focus-visible:outline-none focus-visible:ring-0 border-none text-base font-medium"
          />
        </div>
      </div>
      <MaxAction maxAmount={maxAmount} collateralBank={collateralBank} setAmount={handleAmountChange} />
    </div>
  );
};
