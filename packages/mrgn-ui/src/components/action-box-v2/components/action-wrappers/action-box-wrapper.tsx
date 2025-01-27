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
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useActionBoxStore((state) => [
    state.isSettingsDialogOpen,
    state.setIsSettingsDialogOpen,
  ]);

  const isActionDisabled = React.useMemo(() => {
    const blockedActions = getBlockedActions();
    if (blockedActions?.find((value) => value === actionMode)) return true;
    return false;
  }, [actionMode]);

  React.useEffect(() => {
    setIsSettingsDialogOpen(false);
  }, [setIsSettingsDialogOpen]);

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
          <div className={cn(isSettingsDialogOpen && showSettings && "hidden")}>{children}</div>
        </div>
      </div>
    </>
  );
};
