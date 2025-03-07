import { IconLoader2 } from "@tabler/icons-react";
import React from "react";

import { WalletButton } from "~/components/wallet-v2";
import { Button } from "~/components/ui/button";
import { IconInfiniteLoader } from "~/components/ui/icons";
import { cn } from "@mrgnlabs/mrgn-utils";

type ActionButtonProps = {
  isLoading: boolean;
  isEnabled: boolean;
  buttonLabel: string;
  className?: string;
  loaderType?: "INFINITE" | "DEFAULT";
  connected?: boolean;
  handleAction: () => void;
};

export const ActionButton = ({
  isLoading,
  isEnabled,
  buttonLabel,
  className,
  loaderType = "DEFAULT",
  connected = false,
  handleAction,
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
    return <WalletButton className="w-full py-5" showWalletInfo={false} />;
  }

  return (
    <Button disabled={isLoading || !isEnabled} className={cn("w-full py-5", className)} onClick={handleAction}>
      {isLoading ? <Loader className={`${loaderType === "DEFAULT" && "animate-spin"}`} /> : buttonLabel}
    </Button>
  );
};
