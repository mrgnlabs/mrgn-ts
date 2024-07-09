import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { IconArrowLeft } from "~/components/ui/icons";

import { Slippage, PriorityFees } from "./components";
import { RepayType } from "~/utils";

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

  return (
    <div className="space-y-6">
      <button className="flex items-center gap-1.5 text-sm" onClick={() => toggleSettings(false)}>
        <IconArrowLeft size={18} /> Back to trading
      </button>
      <div className="space-y-3">
        <ToggleGroup
          value={settingsMode}
          onValueChange={(value: SettingsState) => setSettingsMode(value as SettingsState)}
          type="single"
          size="lg"
          className="gap-4"
        >
          <ToggleGroupItem value="slippage" className="w-1/2 text-xs">
            Slippage
          </ToggleGroupItem>

          <ToggleGroupItem value="priority-fee" className="w-1/2 text-xs gap-1.5">
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
