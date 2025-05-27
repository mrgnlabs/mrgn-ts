import React from "react";

import { cn } from "@mrgnlabs/mrgn-utils";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { Slider } from "~/components/ui/slider";

type LeverageSliderProps = {
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  amountRaw: string;
  leverageAmount: number;
  maxLeverage: number;
  isEmodeLoop: boolean;
  setLeverageAmount: (amount: number) => void;
};

export const LeverageSlider = ({
  selectedBank,
  selectedSecondaryBank,
  amountRaw,
  leverageAmount,
  maxLeverage,
  isEmodeLoop,
  setLeverageAmount,
}: LeverageSliderProps) => {
  const bothBanksSelected = React.useMemo(
    () => Boolean(selectedBank && selectedSecondaryBank),
    [selectedBank, selectedSecondaryBank]
  );

  return (
    <>
      <div
        className={cn(
          "space-y-6",
          (!bothBanksSelected || !amountRaw) && "pointer-events-none cursor-default opacity-50"
        )}
      >
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-normal text-muted-foreground">Loop ➰</p>
          </div>
          <Slider
            defaultValue={[1]}
            max={maxLeverage === 0 ? 1 : maxLeverage}
            min={1}
            step={0.01}
            value={[leverageAmount]}
            emode={isEmodeLoop}
            onValueChange={(value) => {
              if (value[0] > maxLeverage || value[0] <= 1) return;
              setLeverageAmount(value[0]);
            }}
            disabled={!bothBanksSelected || !amountRaw}
          />
          <div className="flex items-center justify-between">
            <p className="text-sm font-normal text-muted-foreground">
              {leverageAmount > 1 && `${leverageAmount.toFixed(2)}x leverage`}
            </p>
            <span className="flex items-center gap-1">
              <span className="text-muted-foreground text-sm">
                {maxLeverage.toFixed(2)}x
                <button
                  disabled={!!!maxLeverage}
                  className="ml-1 text-xs cursor-pointer text-chartreuse border-b border-transparent transition hover:border-chartreuse"
                  onClick={() => setLeverageAmount(Number(maxLeverage))}
                >
                  MAX
                </button>
              </span>
            </span>
          </div>
        </div>
      </div>
    </>
  );
};
