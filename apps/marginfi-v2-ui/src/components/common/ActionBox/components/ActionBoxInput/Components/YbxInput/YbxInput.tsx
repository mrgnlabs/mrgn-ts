import React from "react";

import { YbxType, cn } from "~/utils";
import { useActionBoxStore } from "~/store";

import { Input } from "~/components/ui/input";

import { Button } from "~/components/ui/button";

type YbxInputProps = {
  amountRaw: string;
  maxAmount: number;
  setAmountRaw: (amount: string) => void;
};

export const YbxInput = ({ maxAmount, setAmountRaw }: YbxInputProps) => {
  const [ybxMode, amountRaw] = useActionBoxStore((state) => [state.ybxMode, state.amountRaw]);
  const [isCustomMode, setIsCustomMode] = React.useState<boolean>(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const numberFormater = React.useMemo(() => new Intl.NumberFormat("en-US", { maximumFractionDigits: 10 }), []);

  const amount = React.useMemo(() => {
    const strippedAmount = amountRaw.replace(/,/g, "");
    return isNaN(Number.parseFloat(strippedAmount)) ? 0 : Number.parseFloat(strippedAmount);
  }, [amountRaw]);

  const amountOptions = React.useMemo(
    () => [
      {
        label: "25%",
        value: maxAmount * 0.25,
      },
      {
        label: "50%",
        value: maxAmount * 0.5,
      },
      {
        label: "75%",
        value: maxAmount * 0.75,
      },
      ...(ybxMode === YbxType.AddCollat
        ? [
            {
              label: "100%",
              value: maxAmount,
            },
          ]
        : []),
    ],
    [ybxMode, maxAmount]
  );

  const descriptionText = React.useMemo(() => {
    if (ybxMode === YbxType.AddCollat) {
      return "Select how much collateral to add";
    } else if (ybxMode === YbxType.WithdrawCollat) {
      return "Select how much collateral to withdraw";
    } else {
      return "Select how much collateral to withdraw";
    }
  }, [ybxMode]);

  return (
    <div className="py-4">
      <p className="text-muted-foreground">{descriptionText}</p>
      <div className="flex justify-between items-center w-full">
        <ul className="grid grid-cols-3 gap-2">
          {amountOptions.map((option, idx) => (
            <li key={idx}>
              <Button
                className={cn(
                  "gap-0.5 h-auto w-full font-light border border-transparent bg-background/50 transition-colors hover:bg-background-gray-hover",
                  amount === option.value && "bg-background-gray-hover border-chartreuse"
                )}
                variant="secondary"
                onClick={() => {
                  setAmountRaw(numberFormater.format(option.value));
                  setIsCustomMode(false);
                }}
              >
                {option.label}
              </Button>
            </li>
          ))}
        </ul>
        <Input
          type="text"
          ref={inputRef}
          inputMode="decimal"
          value={amountRaw}
          onChange={(e) => setAmountRaw(e.target.value)}
          onFocus={() => setIsCustomMode(true)}
          onBlur={() => setIsCustomMode(false)}
          placeholder="0"
          className={cn(
            "h-aut max-w-[80px] bg-background/50 py-3 px-4 border border-transparent text-white transition-colors focus-visible:ring-0",
            !amountOptions.find((value) => value.value === amount) && "border-chartreuse"
          )}
        />
      </div>
    </div>
  );
};
