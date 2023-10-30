import React from "react";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useWeb3AuthWallet } from "~/hooks/useWeb3AuthWallet";
import { Wallet } from "~/components/common/Wallet";
import { Button } from "~/components/ui/button";
import { IconWallet } from "~/components/ui/icons";

export const WalletButton = () => {
  const { connected } = useWalletContext();
  const { setIsOpenAuthDialog } = useWeb3AuthWallet();

  return (
    <>
      {!connected ? (
        <Button onClick={() => setIsOpenAuthDialog(true)} className="gap-1.5">
          <IconWallet size={20} /> Connect
        </Button>
      ) : (
        <Wallet />
      )}
    </>
  );
};
