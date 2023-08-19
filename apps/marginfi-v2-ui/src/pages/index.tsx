import React, { useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { AccountSummary, AssetsList, MultipleAccountsFoundWarning, UserPositions } from "~/components";
import { PageHeader } from "~/components/PageHeader";
import { useMarginfiClient, useUserAccounts } from "~/context";

const Home = () => {
  const wallet = useWallet();
  const { userAccounts } = useUserAccounts();
  const { reload } = useMarginfiClient();

  useEffect(() => {
    reload();
    const id = setInterval(reload, 10_000);
    return () => clearInterval(id);
  }, [reload]);

  return (
    <>
      <PageHeader />
      <div className="flex flex-col h-full justify-start content-start pt-[64px] sm:pt-[16px] w-4/5 max-w-7xl gap-4">
        {wallet.connected && userAccounts.length > 1 && <MultipleAccountsFoundWarning />}
        <AccountSummary />
      </div>
      <div className="flex flex-col justify-start content-start pt-[16px] pb-[64px] grid w-4/5 max-w-7xl gap-4 grid-cols-1 xl:grid-cols-2">
        <AssetsList />
        {wallet.connected && <UserPositions />}
      </div>
    </>
  );
};

export default Home;
