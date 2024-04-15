import React from "react";

import { useWalletContext } from "~/hooks/useWalletContext";

import { PageHeading } from "~/components/common/PageHeading";
import { WalletButton } from "~/components/common/Wallet";
interface PortfolioHeaderProps {
  netValue?: string;
  points?: string;
}

export const PortfolioHeader = ({ netValue, points }: PortfolioHeaderProps) => {
  const { connected } = useWalletContext();
  return (
    <PageHeading
      heading={<>Portfolio</>}
      body={
        <div className="space-y-6">
          <p>Manage your marginfi positions.</p> {!connected && <WalletButton />}
        </div>
      }
      links={[]}
    />
  );
};
