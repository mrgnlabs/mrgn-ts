import React from "react";

import { Button } from "~/components/ui/button";
import { IconLoader } from "~/components/ui/icons";

import { ActionMethod } from "./ActionBox.utils";
import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

type ActionBoxActionsProps = {
  isLoading: boolean;
  isEnabled: boolean;
  actionMode: ActionType;
  handleAction: () => void;
  disabled?: boolean;
};

export const ActionBoxActions = ({ isLoading, isEnabled, actionMode, handleAction, disabled }: ActionBoxActionsProps) => {
  return (
    <Button disabled={disabled || isLoading || !isEnabled} className="w-full py-6" onClick={handleAction}>
      {isLoading ? <IconLoader /> : actionMode}
    </Button>
  );
};
