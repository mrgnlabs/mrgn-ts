import { shortenAddress } from "@mrgnlabs/mrgn-common";
import { FaWallet } from "react-icons/fa";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useWeb3AuthWallet } from "~/hooks/useWeb3AuthWallet";
import { Button } from "~/components/ui/button";

export const AuthDialogTriggerButton = () => {
  const { wallet, connected, logout } = useWalletContext();
  const { setIsOpenAuthDialog } = useWeb3AuthWallet();

  return (
    <>
      {!connected ? (
        <Button onClick={() => setIsOpenAuthDialog(true)}>
          <FaWallet /> Connect
        </Button>
      ) : (
        <Button onClick={() => logout()}>
          <>{wallet?.publicKey && shortenAddress(wallet.publicKey.toString())}</>
        </Button>
      )}
    </>
  );
};
