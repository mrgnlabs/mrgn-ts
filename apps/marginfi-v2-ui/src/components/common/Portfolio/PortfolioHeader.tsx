import React from "react";

import { useWallet } from "~/components/wallet-v2/hooks/use-wallet.hook";

import { WalletButton } from "~/components/wallet-v2";
import { PageHeading } from "~/components/common/PageHeading";

interface PortfolioHeaderProps {
  netValue?: string;
  points?: string;
}

export const PortfolioHeader = ({ netValue, points }: PortfolioHeaderProps) => {
  const { connected } = useWallet();
  return (
    <PageHeading
      heading="Portfolio"
      body={
        <div className="space-y-6">
          <p>Manage your marginfi positions.</p> {!connected && <WalletButton />}
        </div>
      }
    />
  );
};
