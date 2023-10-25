import React from "react";
import { FaWallet } from "react-icons/fa";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useWeb3AuthWallet } from "~/hooks/useWeb3AuthWallet";
import { Button } from "~/components/ui/button";
import { WalletPopover } from "~/components/common/Wallet";

export const WalletButton = () => {
  const { connected } = useWalletContext();
  const { setIsOpenAuthDialog } = useWeb3AuthWallet();

  return (
    <>
      {!connected ? (
        <Button onClick={() => setIsOpenAuthDialog(true)}>
          <FaWallet /> Connect
        </Button>
      ) : (
        <WalletPopover />
      )}
    </>
  );
};
