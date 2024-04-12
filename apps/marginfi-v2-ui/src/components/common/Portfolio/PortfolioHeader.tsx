import React from "react";

import { PageHeading } from "~/components/common/PageHeading";
import { useWalletContext } from "~/hooks/useWalletContext";
import { useUiStore } from "~/store";

interface PortfolioHeaderProps {
  netValue?: string;
  points?: string;
}

export const PortfolioHeader = ({ netValue, points }: PortfolioHeaderProps) => {
  const { connected } = useWalletContext();
  const [setIsWalletOpen] = useUiStore((state) => [state.setIsWalletOpen]);
  return (
    <PageHeading
      heading={<h1 className="text-4xl font-medium text-primary">Portfolio</h1>}
      body={
        connected ? (
          <p>Manage your marginfi positions.</p>
        ) : (
          <p>
            <a
              className="cursor-pointer text-chartreuse border-b border-transparent transition-colors hover:border-chartreuse"
              onClick={() => setIsWalletOpen(true)}
            >
              Log in
            </a>{" "}
            to view your positions.
          </p>
        )
      }
      links={[]}
    />
  );
};
