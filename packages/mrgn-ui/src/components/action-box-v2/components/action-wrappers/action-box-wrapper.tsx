import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { getBlockedActions, cn } from "@mrgnlabs/mrgn-utils";

import { ActionSettings } from "../action-settings";
import { useActionBoxStore } from "../../store";

interface ActionBoxWrapperProps {
  actionMode: ActionType;
  isDialog?: boolean;
  showSettings?: boolean;
  children: React.ReactNode;
}

export const ActionBoxWrapper = ({ children, isDialog, actionMode, showSettings = true }: ActionBoxWrapperProps) => {
  const [priorityFee, slippage, isSettingsDialogOpen, setIsSettingsDialogOpen, setPriorityFee, setSlippageBps] =
    useActionBoxStore((state) => [
      state.priorityFee,
      state.slippageBps,
      state.isSettingsDialogOpen,
      state.setIsSettingsDialogOpen,
      state.setPriorityFee,
      state.setSlippageBps,
    ]);

  const isActionDisabled = React.useMemo(() => {
    const blockedActions = getBlockedActions();
    if (blockedActions?.find((value) => value === actionMode)) return true;
    return false;
  }, [actionMode]);

  const isSlippageEnabled = React.useMemo(
    () =>
      actionMode === ActionType.Repay ||
      actionMode === ActionType.RepayCollat ||
      actionMode === ActionType.MintLST ||
      actionMode === ActionType.UnstakeLST ||
      actionMode === ActionType.Loop,
    [actionMode]
  );

  if (isActionDisabled) {
    return (
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "p-4 md:p-6 bg-background-gray text-white w-full max-w-[480px] rounded-lg relative",
            isDialog && "py-5 border border-background-gray-light/50"
          )}
        >
          Action is temporary disabled. <br /> Visit our socials for more information.
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col items-center">
        <div
          className={cn(
            "p-2 md:p-3 bg-background-gray text-white w-full max-w-[480px] rounded-lg relative",
            isDialog && "py-5 border border-background-gray-light/50"
          )}
        >
          {isSettingsDialogOpen && showSettings ? (
            <ActionSettings
              priorityFee={priorityFee}
              slippage={isSlippageEnabled ? slippage : undefined}
              changePriorityFee={setPriorityFee}
              changeSlippage={setSlippageBps}
              toggleSettings={(value) => setIsSettingsDialogOpen(value)}
            />
          ) : (
            <>{children}</>
          )}
        </div>
      </div>
    </>
  );
};
