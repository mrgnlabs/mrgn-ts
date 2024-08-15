import React from "react";

import { useWalletContext } from "~/hooks/useWalletContext";

import { Button } from "~/components/ui/button";
import { IconInfiniteLoader, IconLoader } from "~/components/ui/icons";

type ActionBoxActionsProps = {
  isLoading: boolean;
  isEnabled: boolean;
  buttonLabel: string;
  loaderType?: "INFINITE" | "DEFAULT";
  handleAction: () => void;
  handleConnect: () => void;
};

export const ActionBoxActions = ({
  isLoading,
  isEnabled,
  buttonLabel,
  loaderType = "DEFAULT",
  handleAction,
  handleConnect,
}: ActionBoxActionsProps) => {
  const { connected } = useWalletContext();

  const Loader = React.useMemo(() => {
    switch (loaderType) {
      case "DEFAULT":
        return IconLoader;
      case "INFINITE":
        return IconInfiniteLoader;
      default:
        return IconLoader;
    }
  }, [loaderType]);

  if (!connected) {
    return (
      <Button className="w-full py-5" onClick={() => handleConnect()}>
        Sign in
      </Button>
    );
  }

  return (
    <Button disabled={isLoading || !isEnabled} className="w-full py-5" onClick={handleAction}>
      {isLoading ? <Loader /> : buttonLabel}
    </Button>
  );
};
