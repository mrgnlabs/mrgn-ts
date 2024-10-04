import { IconLoader2 } from "@tabler/icons-react";
import React from "react";

import { Button } from "~/components/ui/button";
import { IconInfiniteLoader } from "~/components/ui/icons";

type ActionButtonProps = {
  isLoading: boolean;
  isEnabled: boolean;
  buttonLabel: string;
  loaderType?: "INFINITE" | "DEFAULT";
  connected?: boolean;
  handleAction: () => void;
  handleConnect: () => void;
};

export const ActionButton = ({
  isLoading,
  isEnabled,
  buttonLabel,
  loaderType = "DEFAULT",
  connected = false,
  handleAction,
  handleConnect,
}: ActionButtonProps) => {
  const Loader = React.useMemo(() => {
    switch (loaderType) {
      case "DEFAULT":
        return IconLoader2;
      case "INFINITE":
        return IconInfiniteLoader;
      default:
        return IconLoader2;
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
      {isLoading ? <Loader className="animate-spin" /> : buttonLabel}
    </Button>
  );
};
