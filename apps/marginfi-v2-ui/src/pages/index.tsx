import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { AccountSummary, AssetsList, MultipleAccountsFoundWarning, UserPositions } from "~/components";
import { useUserAccounts } from "~/context";

const Home = () => {
  const wallet = useWallet();
  const { userAccounts } = useUserAccounts();

  return (
    <div className="justify-start content-start py-[64px] flex flex-col w-4/5 sm:w-[90%] xl:w-4/5 max-w-7xl gap-4">
      {wallet.connected && userAccounts.length > 1 && <MultipleAccountsFoundWarning />}
      <AccountSummary />
      <AssetsList />
      {wallet.connected && <UserPositions />}
    </div>
  );
};

export default Home;
