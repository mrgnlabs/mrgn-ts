import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { AccountSummary, AssetsList, MultipleAccountsFoundWarning, UserPositions } from "~/components";
import { PageHeader } from "~/components/PageHeader";
import { useUserAccounts } from "~/context";

const Home = () => {
  const wallet = useWallet();
  const { userAccounts } = useUserAccounts();

  return (
    <>
      <PageHeader />
      <div className="w-full h-full flex flex-col justify-start content-start py-[64px] grid w-[95%] sm:w-4/5 max-w-7xl gap-4 grid-cols-1 xl:grid-cols-2">
        {wallet.connected && userAccounts.length > 1 && <MultipleAccountsFoundWarning />}
        <AccountSummary />
        <AssetsList />
        {wallet.connected && <UserPositions />}
      </div>
    </>
  );
};

export default Home;
