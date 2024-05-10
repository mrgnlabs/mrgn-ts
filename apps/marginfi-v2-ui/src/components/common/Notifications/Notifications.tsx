import "@dialectlabs/react-ui/index.css";

import { DialectSolanaSdk } from "@dialectlabs/react-sdk-blockchain-solana";
import { NotificationsButton } from "@dialectlabs/react-ui";
import { useWalletContext } from "~/hooks/useWalletContext";
import generalConfig from "~/config";

export const DialectNotification = () => {
  const { wallet } = useWalletContext();

  if (!generalConfig.dialectDappAddress) {
    return null;
  }

  return (
    <DialectSolanaSdk dappAddress={generalConfig.dialectDappAddress} customWalletAdapter={wallet}>
      <NotificationsButton theme="dark" />
    </DialectSolanaSdk>
  );
};
