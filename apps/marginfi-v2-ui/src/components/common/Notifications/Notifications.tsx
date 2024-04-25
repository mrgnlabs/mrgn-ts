import "@dialectlabs/react-ui/index.css";

import { DialectSolanaSdk } from "@dialectlabs/react-sdk-blockchain-solana";
import { NotificationsButton } from "@dialectlabs/react-ui";
import { useWalletContext } from "~/hooks/useWalletContext";

/* Set DAPP_ADDRESS variable to the public key generated in previous section */
const DAPP_ADDRESS = "mrGnEYJUBdszfDkHuFuBbwhvTmS6y8xuYUidg9cZekV";

export const DialectNotification = () => {
  const { wallet } = useWalletContext();

  return (
    <DialectSolanaSdk dappAddress={DAPP_ADDRESS} customWalletAdapter={wallet}>
      <NotificationsButton />
    </DialectSolanaSdk>
  );
};
