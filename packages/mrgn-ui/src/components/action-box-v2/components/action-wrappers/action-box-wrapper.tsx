import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";
import { getBlockedActions, cn, TipFloorDataResponse, handleBundleTip } from "@mrgnlabs/mrgn-utils";

import { ActionSettings } from "../action-settings";
import { useActionBoxStore } from "../../store";

interface ActionBoxWrapperProps {
  actionMode: ActionType;
  isDialog?: boolean;
  showSettings?: boolean;
  children: React.ReactNode;
}

export const ActionBoxWrapper = ({ children, isDialog, actionMode, showSettings = true }: ActionBoxWrapperProps) => {
  const [
    priorityFee,
    slippage,
    isSettingsDialogOpen,
    setIsSettingsDialogOpen,
    setPriorityFee,
    setSlippageBps,
    bundleTip,
    setBundleTip,
  ] = useActionBoxStore((state) => [
    state.priorityFee,
    state.slippageBps,
    state.isSettingsDialogOpen,
    state.setIsSettingsDialogOpen,
    state.setPriorityFee,
    state.setSlippageBps,
    state.bundleTip,
    state.setBundleTip,
  ]);

  const fetchBundleTip = React.useCallback(async () => {
    const response = await fetch("/api/bundles/tip", {
      method: "GET",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch bundle tip");
    }

    const bundleTipData: TipFloorDataResponse = await response.json();

    const { isCongested, bundleTip } = handleBundleTip(bundleTipData);

    setBundleTip(bundleTip);
  }, [setBundleTip]);

  React.useEffect(() => {
    fetchBundleTip();
  }, [fetchBundleTip]);

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
            "bg-mfi-action-box-background p-4 md:p-6 text-bg-mfi-action-box-foreground w-full max-w-[480px] rounded-lg relative",
            isDialog && "py-5 border border-border"
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
            "bg-mfi-action-box-background p-2 md:p-3 text-bg-mfi-action-box-foreground w-full max-w-[480px] rounded-lg relative",
            isDialog && "py-5"
          )}
        >
          {isSettingsDialogOpen && showSettings ? (
            <ActionSettings
              priorityFee={priorityFee}
              bundleTip={bundleTip}
              slippage={isSlippageEnabled ? slippage : undefined}
              changePriorityFee={setPriorityFee}
              changeSlippage={setSlippageBps}
              changeBundleTip={setBundleTip}
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
