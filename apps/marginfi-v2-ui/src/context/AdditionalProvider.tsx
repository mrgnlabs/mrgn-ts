import React from "react";
import { useWallet } from "@mrgnlabs/mrgn-ui";

import { WalletStateProvider } from "@mrgnlabs/mrgn-state";

export const AdditionalProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { wallet, walletAddress } = useWallet();

  return <WalletStateProvider walletAddress={walletAddress}>{children}</WalletStateProvider>;
};
