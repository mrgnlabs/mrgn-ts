import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { IconArrowLeft } from "~/components/ui/icons";

import { ActionBoxSlippage } from "./ActionBoxSlippage";
import { ActionBoxPriorityFees } from "./ActionBoxPriorityFees";

type ActionBoxSettingsProps = {
  mode: ActionType;
  toggleSettings: (mode: boolean) => void;
  slippageBps: number;
  setSlippageBps: (value: number) => void;
};

enum SettingsState {
  Slippage = "slippage",
  PriorityFee = "priority-fee",
}

export const ActionBoxSettings = ({ mode, toggleSettings, slippageBps, setSlippageBps }: ActionBoxSettingsProps) => {
  const [settingsMode, setSettingsMode] = React.useState<SettingsState>(SettingsState.Slippage);
  const modeLabel = React.useMemo(() => {
    let label = "";

    if (mode === ActionType.Deposit) {
      label = "to lending";
    } else if (mode === ActionType.Borrow) {
      label = "to borrowing";
    }

    return label;
  }, [mode]);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <button className="flex items-center gap-1.5 text-sm" onClick={() => toggleSettings(false)}>
          <IconArrowLeft size={18} /> Back {modeLabel}
        </button>
        {/* <ToggleGroup
          value={settingsMode}
          onValueChange={(value) => setSettingsMode(value as SettingsState)}
          type="single"
          size="lg"
        >
          <ToggleGroupItem value="slippage" className="w-1/2 text-xs">
            Slippage
          </ToggleGroupItem>
          <ToggleGroupItem value="priority-fee" className="w-1/2 text-xs gap-1.5">
            Priority Fee
          </ToggleGroupItem>
        </ToggleGroup> */}
      </div>
      <div>
        {/* {settingsMode === SettingsState.Slippage && (
          <ActionBoxSlippage
            mode={mode}
            toggleSettings={toggleSettings}
            slippageBps={slippageBps}
            setSlippageBps={setSlippageBps}
          />
        )}
        {settingsMode === SettingsState.PriorityFee && ( */}
        <ActionBoxPriorityFees mode={mode} toggleSettings={toggleSettings} />
        {/* )} */}
      </div>
    </div>
  );
};
