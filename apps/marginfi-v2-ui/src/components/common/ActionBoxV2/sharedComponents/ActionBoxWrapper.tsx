import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { cn, getBlockedActions } from "~/utils";
import { ActionSettings } from "./ActionSettings";
import { PriorityFeeState, SlippageState } from "../sharedTypes";

type ActionSettingsState = {
  value: boolean;
  setShowSettings: (value: boolean) => void;
};

interface ActionBoxWrapperProps {
  actionMode: ActionType;
  settings: ActionSettingsState;
  priorityFee?: PriorityFeeState;
  slippage?: SlippageState;
  isDialog?: boolean;
  children: React.ReactNode;
}

export const ActionBoxWrapper = ({
  children,
  isDialog,
  actionMode,
  settings,
  priorityFee,
  slippage,
}: ActionBoxWrapperProps) => {
  const isActionDisabled = React.useMemo(() => {
    const blockedActions = getBlockedActions();
    if (blockedActions?.find((value) => value === actionMode)) return true;

    return false;
  }, [actionMode]);

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
          {settings.value ? (
            <ActionSettings
              priorityFee={priorityFee}
              slippage={slippage}
              toggleSettings={(value) => settings.setShowSettings(value)}
            />
          ) : (
            <>{children}</>
          )}
        </div>
      </div>
    </>
  );
};
