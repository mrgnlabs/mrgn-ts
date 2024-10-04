import React from "react";
import { IconArrowLeft } from "@tabler/icons-react";

import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";

import { Slippage, PriorityFees } from "./components";

interface ActionSettingsProps {
  priorityFee?: number;
  slippage?: number;

  changePriorityFee: (value: number) => void;
  changeSlippage: (value: number) => void;

  toggleSettings: (value: boolean) => void;
  returnLabel?: string;
}

enum SettingsState {
  Slippage = "slippage",
  PriorityFee = "priority-fee",
}

export const ActionSettings = ({
  priorityFee,
  slippage,
  changePriorityFee,
  changeSlippage,

  toggleSettings,
  returnLabel = "Back",
}: ActionSettingsProps) => {
  const [settingsMode, setSettingsMode] = React.useState<SettingsState>(SettingsState.PriorityFee);

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <button className="flex items-center gap-1.5 text-sm" onClick={() => toggleSettings(false)}>
          <IconArrowLeft size={18} /> {returnLabel}
        </button>
        {/* {slippage !== undefined && (
          <ToggleGroup
            value={settingsMode}
            onValueChange={(value: SettingsState) => setSettingsMode(value as SettingsState)}
            type="single"
            variant="actionBox"
            size="lg"
          >
            <ToggleGroupItem value="slippage" className="w-1/2 text-xs">
              Slippage
            </ToggleGroupItem>

            <ToggleGroupItem value="priority-fee" className="w-1/2 text-xs gap-1.5">
              Priority Fee
            </ToggleGroupItem>
          </ToggleGroup>
        )} */}
      </div>
      <div>
        {slippage !== undefined && (
          <Slippage
            toggleSettings={toggleSettings}
            slippagePct={slippage / 100}
            setSlippagePct={(value) => changeSlippage(value * 100)}
          />
        )}
        {/* {priorityFee !== undefined && settingsMode === SettingsState.PriorityFee && (
          <PriorityFees toggleSettings={toggleSettings} priorityFee={priorityFee} setPriorityFee={changePriorityFee} />
        )} */}
      </div>
    </div>
  );
};
