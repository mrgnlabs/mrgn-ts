import React from "react";

import { Slider } from "~/components/ui/slider";

type LeverageSliderProps = {
  leverageAmount: number;
  maxLeverage: number;
  setLeverageAmount: (amount: number) => void;
};

export const LeverageSlider = ({ leverageAmount, maxLeverage, setLeverageAmount }: LeverageSliderProps) => {
  return (
    <div className="space-y-6">
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
            if (value[0] > maxLeverage || value[0] < 1) return;
            setLeverageAmount(value[0]);
          }}
        />
        <div className="flex items-center justify-between">
          <p className="text-sm font-normal text-muted-foreground">{`${leverageAmount.toFixed(2)}x leverage`}</p>
          <span className="flex items-center gap-1">
            <span className="text-muted-foreground text-sm">
              {maxLeverage.toFixed(2)}x
              <button
                disabled={!maxLeverage}
                className="ml-1 text-xs cursor-pointer border-b border-transparent transition hover:border-chartreuse"
                onClick={() => setLeverageAmount(Number(maxLeverage))}
              >
                MAX
              </button>
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};
