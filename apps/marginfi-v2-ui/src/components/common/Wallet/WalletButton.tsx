import React from "react";

import { useUiStore } from "~/store";
import { useWalletContext } from "~/hooks/useWalletContext";

import { Wallet } from "~/components/common/Wallet";

import { Button } from "~/components/ui/button";

export const WalletButton = () => {
  const { connected } = useWalletContext();
  const [setIsWalletAuthDialogOpen] = useUiStore((state) => [state.setIsWalletAuthDialogOpen]);

  return (
    <>
      {!connected ? (
        <Button onClick={() => setIsWalletAuthDialogOpen(true)} className="gap-1.5">
          Sign In
        </Button>
      ) : (
        <Wallet />
      )}
    </>
  );
};
