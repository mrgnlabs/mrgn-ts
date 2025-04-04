import React from "react";
import { IconArrowLeft } from "@tabler/icons-react";

import { Slippage } from "./components";

interface ActionSettingsProps {
  slippage?: number;

  changeSlippage: (value: number) => void;
  toggleSettings: (value: boolean) => void;
  returnLabel?: string;
}

export const ActionSettings = ({
  slippage,
  changeSlippage,

  toggleSettings,
  returnLabel = "Back",
}: ActionSettingsProps) => {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <button className="flex items-center gap-1.5 text-sm" onClick={() => toggleSettings(false)}>
          <IconArrowLeft size={18} /> {returnLabel}
        </button>
        {/* Navigator logic if we have more settings */}
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
              Setting 2
            </ToggleGroupItem>
          </ToggleGroup>
        )}  */}
      </div>
      <div>
        {slippage !== undefined && (
          <Slippage
            toggleSettings={toggleSettings}
            slippagePct={slippage / 100}
            setSlippagePct={(value) => changeSlippage(value * 100)}
          />
        )}
      </div>
    </div>
  );
};
