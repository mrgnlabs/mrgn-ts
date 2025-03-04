import { IconLoader2 } from "@tabler/icons-react";
import React from "react";

import { WalletButton } from "~/components/wallet-v2";
import { Button } from "~/components/ui/button";
import { cn } from "@mrgnlabs/mrgn-utils";

type ActionButtonProps = {
  isLoading: boolean;
  isEnabled: boolean;
  buttonLabel: string;
  connected?: boolean;
  handleAction: () => void;
  tradeState: "long" | "short";
};

export const ActionButton = ({
  isLoading,
  isEnabled,
  buttonLabel,
  connected = false,
  handleAction,
  tradeState,
}: ActionButtonProps) => {
  if (!connected) {
    return <WalletButton className="w-full py-5 bg-muted-foreground" showWalletInfo={false} />;
  }

  return (
    <Button
      disabled={isLoading || !isEnabled}
      className="w-full"
      variant={tradeState === "long" ? "long" : "short"}
      onClick={handleAction}
    >
      {isLoading ? <IconLoader2 className="animate-spin" /> : buttonLabel}
    </Button>
  );
};
