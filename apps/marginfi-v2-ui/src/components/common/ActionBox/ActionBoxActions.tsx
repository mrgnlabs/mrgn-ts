import React from "react";

import { Button } from "~/components/ui/button";
import { IconLoader } from "~/components/ui/icons";

import { ActionMethod } from "./ActionBox.utils";

type ActionBoxActionsProps = {
  isLoading: boolean;
  actionMethod: ActionMethod;
  handleAction: () => void;
  disabled?: boolean;
};

export const ActionBoxActions = ({ isLoading, actionMethod, handleAction, disabled }: ActionBoxActionsProps) => {
  return (
    <Button disabled={disabled || isLoading || !actionMethod.isEnabled} className="w-full py-6" onClick={handleAction}>
      {isLoading ? <IconLoader /> : actionMethod.instruction}
    </Button>
  );
};
