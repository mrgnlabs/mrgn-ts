import React, { useEffect } from "react";
import { useAnchorWallet, useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AccountSummary, AssetsList, MultipleAccountsFoundWarning, UserPositions } from "~/components";
import { PageHeader } from "~/components/PageHeader";
import { useStore } from "~/store";

const Home = () => {
  const wallet = useWallet();
  const anchorWallet = useAnchorWallet();
  const { connection } = useConnection();
  const [reloadMrgnlendState, marginfiAccountCount] = useStore((state) => [
    state.reloadMrgnlendState,
    state.marginfiAccountCount,
  ]);

  useEffect(() => {
    reloadMrgnlendState(connection, anchorWallet);
    const id = setInterval(reloadMrgnlendState, 30_000);
    return () => clearInterval(id);
  }, [anchorWallet, connection, reloadMrgnlendState]);

  return (
    <>
      <PageHeader />
      <div className="flex flex-col h-full justify-start content-start pt-[64px] sm:pt-[16px] w-4/5 max-w-7xl gap-4">
        {wallet.connected && marginfiAccountCount > 1 && <MultipleAccountsFoundWarning />}
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
