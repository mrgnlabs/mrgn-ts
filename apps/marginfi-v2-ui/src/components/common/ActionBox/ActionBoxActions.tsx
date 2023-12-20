import React from "react";

import { ActionType } from "@mrgnlabs/marginfi-v2-ui-state";

import { useUiStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";

import { Button } from "~/components/ui/button";
import { IconLoader } from "~/components/ui/icons";

type ActionBoxActionsProps = {
  isLoading: boolean;
  isEnabled: boolean;
  actionMode: ActionType;
  handleAction: () => void;
  disabled?: boolean;
};

export const ActionBoxActions = ({
  isLoading,
  isEnabled,
  actionMode,
  handleAction,
  disabled,
}: ActionBoxActionsProps) => {
  const { connected } = useWalletContext();
  const [setIsWalletAuthDialogOpen] = useUiStore((state) => [state.setIsWalletAuthDialogOpen]);

  if (!connected) {
    return (
      <Button className="w-full py-6" onClick={() => setIsWalletAuthDialogOpen(true)}>
        Connect Wallet
      </Button>
    );
  }

  return (
    <Button disabled={disabled || isLoading || !isEnabled} className="w-full py-6" onClick={handleAction}>
      {isLoading ? <IconLoader /> : actionMode}
    </Button>
  );
};
