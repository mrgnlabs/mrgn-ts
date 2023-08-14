import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { AccountSummary, AssetsList, MultipleAccountsFoundWarning, UserPositions } from "~/components";
import { PageHeader } from "~/components/PageHeader";
import { useUserAccounts } from "~/context";

const Home = () => {
  const wallet = useWallet();
  const { userAccounts } = useUserAccounts();

  return (
    <div className="flex flex-col h-full w-full justify-center items-center">
      <PageHeader />
      <div className="flex flex-col h-full justify-start content-start pt-[64px] sm:pt-[16px] pb-[64px] w-4/5 max-w-7xl gap-4">
        {wallet.connected && userAccounts.length > 1 && <MultipleAccountsFoundWarning />}
        <AccountSummary />
        <AssetsList />
        {wallet.connected && <UserPositions />}
      </div>
    </div>
  );
};

export default Home;
