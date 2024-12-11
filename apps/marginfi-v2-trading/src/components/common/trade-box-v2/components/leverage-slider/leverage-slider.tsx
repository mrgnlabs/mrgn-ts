import { Label } from "~/components/ui/label";
import { Slider } from "~/components/ui/slider";

interface LeverageSliderProps {
  leverage: number;
  maxLeverage: number;
  setLeverage: (value: number) => void;
}

export const LeverageSlider = ({ leverage, maxLeverage, setLeverage }: LeverageSliderProps) => {
  return (
    <div className="space-y-2">
      <div className="flex justify-between">
        <Label>Leverage</Label>
        <span className="text-sm font-medium text-muted-foreground">{leverage.toFixed(2)}x</span>
      </div>
      <Slider
        className="w-full"
        defaultValue={[1]}
        min={1}
        step={0.01}
        max={maxLeverage === 0 ? 1 : maxLeverage}
        value={[leverage]}
        onValueChange={(value) => {
          if (value[0] > maxLeverage) return;
          setLeverage(value[0]);
        }}
      />
    </div>
  );
};
