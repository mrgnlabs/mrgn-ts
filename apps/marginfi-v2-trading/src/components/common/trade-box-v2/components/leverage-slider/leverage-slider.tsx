import React from "react";

import { cn } from "@mrgnlabs/mrgn-utils";
import { Slider } from "~/components/ui/slider";
import { ArenaBank } from "~/types/trade-store.types";

type LeverageSliderProps = {
  selectedBank: ArenaBank | null;
  selectedSecondaryBank: ArenaBank | null;
  amountRaw: string;
  leverageAmount: number;
  maxLeverage: number;
  setLeverageAmount: (amount: number) => void;
};

export const LeverageSlider = ({
  selectedBank,
  selectedSecondaryBank,
  amountRaw,
  leverageAmount,
  maxLeverage,
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
            <p className="text-sm font-normal text-muted-foreground">Leverage</p>
          </div>
          <Slider
            defaultValue={[1]}
            max={maxLeverage === 0 ? 1 : maxLeverage}
            min={1}
            step={0.01}
            value={[leverageAmount]}
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
                  className="ml-1 text-xs cursor-pointer text-primary border-b border-transparent hover:border-primary"
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
