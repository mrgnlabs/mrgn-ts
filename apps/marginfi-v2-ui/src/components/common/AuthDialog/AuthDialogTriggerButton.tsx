import { Button } from "@mui/material";
import { useWalletContext } from "~/hooks/useWalletContext";
import { shortenAddress } from "@mrgnlabs/mrgn-common";

type AuthDialogButtonProps = {
  connected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
};

export const AuthDialogTriggerButton = ({ connected, onConnect, onDisconnect }: AuthDialogButtonProps) => {
  const { wallet } = useWalletContext();
  return (
    <>
      {!connected ? (
        <Button onClick={() => onConnect()}>Connect</Button>
      ) : (
        <Button onClick={() => onDisconnect()}>
          <>{wallet?.publicKey && shortenAddress(wallet.publicKey.toString())}</>
        </Button>
      )}
    </>
  );
};
