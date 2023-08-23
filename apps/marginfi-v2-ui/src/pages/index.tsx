import React, { useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { AccountSummary, AssetsList, Banner, UserPositions } from "~/components";
import { PageHeader } from "~/components/PageHeader";
import { useStore } from "~/store";
import { useWalletWithOverride } from "~/components/useWalletWithOverride";
import { shortenAddress } from "@mrgnlabs/mrgn-common";

const Home = () => {
  const walletContext = useWallet();
  const { wallet, isOverride } = useWalletWithOverride();
  const { connection } = useConnection();
  const [reloadMrgnlendState, marginfiAccountCount] = useStore((state) => [
    state.reloadMrgnlendState,
    state.marginfiAccountCount,
  ]);

  useEffect(() => {
    reloadMrgnlendState({ connection, wallet, isOverride }).catch(console.error);
    const id = setInterval(() => reloadMrgnlendState().catch(console.error), 30_000);
    return () => clearInterval(id);
  }, [wallet, connection, reloadMrgnlendState, isOverride]);

  return (
    <>
      <PageHeader />
      <div className="flex flex-col h-full justify-start content-start pt-[64px] sm:pt-[16px] w-4/5 max-w-7xl gap-4">
        {walletContext.connected && wallet && isOverride && <Banner text={`Read-only view of ${shortenAddress(wallet.publicKey)}`} backgroundColor="#7fff00" />}
        {walletContext.connected && marginfiAccountCount > 1 && <Banner text="Multiple accounts were found (not supported). Contact the team or use at own risk." />}
        <AccountSummary />
      </div>
      <div className="flex flex-col justify-start content-start pt-[16px] pb-[64px] grid w-4/5 max-w-7xl gap-4 grid-cols-1 xl:grid-cols-2">
        <AssetsList />
        {walletContext.connected && <UserPositions />}
      </div>
    </>
  );
};

export default Home;
