import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { ToggleGroup, ToggleGroupItem } from "~/components/ui/toggle-group";
import { IconArrowLeft } from "~/components/ui/icons";

import { ActionBoxSlippage, ActionBoxPriorityFees } from "./Components";
import { RepayType } from "~/utils";

type ActionBoxSettingsProps = {
  repayMode: RepayType;
  actionMode: ActionType;
  toggleSettings: (mode: boolean) => void;
  slippageBps: number;
  setSlippageBps: (value: number) => void;
};

enum SettingsState {
  Slippage = "slippage",
  PriorityFee = "priority-fee",
}

export const ActionBoxSettings = ({
  actionMode,
  repayMode,
  toggleSettings,
  slippageBps,
  setSlippageBps,
}: ActionBoxSettingsProps) => {
  const [settingsMode, setSettingsMode] = React.useState<SettingsState>(SettingsState.PriorityFee);
  const modeLabel = React.useMemo(() => {
    let label = "";

    if (actionMode === ActionType.Deposit) {
      label = "to lending";
    } else if (actionMode === ActionType.Borrow) {
      label = "to borrowing";
    }

    return label;
  }, [actionMode]);

  const isSlippageEnabled = React.useMemo(
    () =>
      (actionMode === ActionType.Repay && repayMode === RepayType.RepayCollat) ||
      actionMode === ActionType.MintLST ||
      actionMode === ActionType.UnstakeLST,
    [actionMode, repayMode]
  );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <button className="flex items-center gap-1.5 text-sm" onClick={() => toggleSettings(false)}>
          <IconArrowLeft size={18} /> Back {modeLabel}
        </button>
        {isSlippageEnabled && (
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
        )}
      </div>
      <div>
        {settingsMode === SettingsState.Slippage && (
          <ActionBoxSlippage
            mode={actionMode}
            toggleSettings={toggleSettings}
            slippageBps={slippageBps}
            setSlippageBps={setSlippageBps}
          />
        )}
        {settingsMode === SettingsState.PriorityFee && (
          <ActionBoxPriorityFees mode={actionMode} toggleSettings={toggleSettings} />
        )}
      </div>
    </div>
  );
};
