import React from "react";
import { useWallet } from "@mrgnlabs/mrgn-ui";

import { WalletStateProvider, SelectedAccountProvider } from "@mrgnlabs/mrgn-state";

export const AdditionalProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { walletAddress } = useWallet();

  return (
    <WalletStateProvider walletAddress={walletAddress}>
      <SelectedAccountProvider>{children}</SelectedAccountProvider>
    </WalletStateProvider>
  );
};
