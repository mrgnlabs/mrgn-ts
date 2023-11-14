import React from "react";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useWeb3AuthWallet } from "~/hooks/useWeb3AuthWallet";
import { useWalletStore } from "~/store";
import { Wallet } from "~/components/common/Wallet";
import { Button } from "~/components/ui/button";

export const WalletButton = () => {
  const { connected } = useWalletContext();
  const [setIsWalletAuthDialogOpen] = useWalletStore((state) => [state.setIsWalletAuthDialogOpen]);

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
