import React from "react";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useWeb3AuthWallet } from "~/hooks/useWeb3AuthWallet";
import { Wallet } from "~/components/common/Wallet";
import { Button } from "~/components/ui/button";
import { WalletIcon } from "~/components/ui/icons";

export const WalletButton = () => {
  const { connected } = useWalletContext();
  const { setIsOpenAuthDialog } = useWeb3AuthWallet();

  return (
    <>
      {!connected ? (
        <Button onClick={() => setIsOpenAuthDialog(true)}>
          <WalletIcon size={16} /> Connect
        </Button>
      ) : (
        <Wallet />
      )}
    </>
  );
};
