import React from "react";

import { IconArrowLeft } from "@tabler/icons-react";

import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { Slippage, PriorityFees } from "./components";

type TradingBoxSettingsProps = {
  toggleSettings: (mode: boolean) => void;
  slippageBps: number;
  setSlippageBps: (value: number) => void;
};

enum SettingsState {
  Slippage = "slippage",
  PriorityFee = "priority-fee",
}

export const TradingBoxSettings = ({ toggleSettings, slippageBps, setSlippageBps }: TradingBoxSettingsProps) => {
  const [settingsMode, setSettingsMode] = React.useState<SettingsState>(SettingsState.PriorityFee);

  const toggleSettingsMode = (value: SettingsState | "") => {
    if (value !== "") {
      setSettingsMode(value);
    }
  };

  return (
    <div className="space-y-6">
      <button className="flex items-center gap-1.5 text-sm" onClick={() => toggleSettings(false)}>
        <IconArrowLeft size={18} /> Back to trading
      </button>
      <div className="space-y-3">
        <ToggleGroup value={settingsMode} onValueChange={toggleSettingsMode} type="single" size="lg" className="gap-4">
          <ToggleGroupItem value="slippage" className="w-1/2 text-xs border">
            Slippage
          </ToggleGroupItem>

          <ToggleGroupItem value="priority-fee" className="w-1/2 text-xs gap-1.5 border">
            Priority Fee
          </ToggleGroupItem>
        </ToggleGroup>
      </div>
      <div>
        {settingsMode === SettingsState.Slippage && (
          <Slippage toggleSettings={toggleSettings} slippageBps={slippageBps} setSlippageBps={setSlippageBps} />
        )}
        {settingsMode === SettingsState.PriorityFee && <PriorityFees toggleSettings={toggleSettings} />}
      </div>
    </div>
  );
};
