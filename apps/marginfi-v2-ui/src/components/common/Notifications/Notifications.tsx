import "@dialectlabs/react-ui/index.css";

import { DialectSolanaSdk } from "@dialectlabs/react-sdk-blockchain-solana";
import { NotificationsButton } from "@dialectlabs/react-ui";
import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";
import generalConfig from "~/config";

export const DialectNotification = () => {
  const { wallet } = useWallet();

  if (!generalConfig.dialectDappAddress) {
    return null;
  }

  return (
    <DialectSolanaSdk dappAddress={generalConfig.dialectDappAddress} customWalletAdapter={wallet}>
      <NotificationsButton theme="dark" />
    </DialectSolanaSdk>
  );
};
