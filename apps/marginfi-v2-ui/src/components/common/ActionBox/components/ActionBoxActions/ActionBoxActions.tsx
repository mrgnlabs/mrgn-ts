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
  showCloseBalance: boolean;
  handleAction: () => void;
};

export const ActionBoxActions = ({
  isLoading,
  isEnabled,
  showCloseBalance,
  actionMode,
  handleAction,
}: ActionBoxActionsProps) => {
  const { connected } = useWalletContext();
  const [setIsWalletAuthDialogOpen] = useUiStore((state) => [state.setIsWalletAuthDialogOpen]);

  const buttonLabel = React.useMemo(() => (showCloseBalance ? "Close" : actionMode), [showCloseBalance, actionMode]);

  if (!connected) {
    return (
      <Button className="w-full py-5" onClick={() => setIsWalletAuthDialogOpen(true)}>
        Sign in
      </Button>
    );
  }

  return (
    <Button disabled={isLoading || !isEnabled} className="w-full py-5" onClick={handleAction}>
      {isLoading ? <IconLoader /> : buttonLabel}
    </Button>
  );
};
