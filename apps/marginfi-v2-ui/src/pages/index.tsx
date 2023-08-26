import React, { useEffect } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { Banner } from "~/components";
import { PageHeader } from "~/components/PageHeader";
import { useWalletWithOverride } from "~/components/useWalletWithOverride";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import config from "~/config";
import { useMrgnlendStore } from "../store";
import dynamic from "next/dynamic";

const AccountSummary = dynamic(async () => (await import("~/components/AccountSummary")).AccountSummary, {
  ssr: false,
});
const AssetsList = dynamic(async () => (await import("~/components/AssetsList")).AssetsList, { ssr: false });
const UserPositions = dynamic(async () => (await import("~/components/UserPositions")).UserPositions, { ssr: false });

const Home = () => {
  const walletContext = useWallet();
  const { wallet, isOverride } = useWalletWithOverride();
  const { connection } = useConnection();
  const fetchMrgnlendState = useMrgnlendStore((state) => state.fetchMrgnlendState);
  const setIsRefreshingStore = useMrgnlendStore((state) => state.setIsRefreshingStore);
  const marginfiAccountCount = useMrgnlendStore((state) => state.marginfiAccountCount);
  const selectedAccount = useMrgnlendStore((state) => state.selectedAccount);

  useEffect(() => {
    setIsRefreshingStore(true);
    fetchMrgnlendState({ marginfiConfig: config.mfiConfig, connection, wallet, isOverride }).catch(console.error);
    const id = setInterval(() => {
      setIsRefreshingStore(true);
      fetchMrgnlendState().catch(console.error);
    }, 30_000);
    return () => clearInterval(id);
  }, [wallet, isOverride]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ crucial to omit both `connection` and `fetchMrgnlendState` from the dependency array
  // TODO: fix...

  return (
    <>
      <PageHeader />
      <div
        suppressHydrationWarning={true}
        className="flex flex-col h-full justify-start content-start pt-[64px] sm:pt-[16px] w-4/5 max-w-7xl gap-4"
      >
        {walletContext.publicKey &&
          wallet &&
          selectedAccount &&
          !selectedAccount.authority.equals(walletContext.publicKey) && (
            <Banner
              text={`Read-only view of ${shortenAddress(wallet.publicKey)}'s account ${shortenAddress(
                selectedAccount.address.toBase58()
              )}`}
              backgroundColor="#7fff00"
            />
          )}
        {walletContext.connected && marginfiAccountCount > 1 && (
          <Banner text="Multiple accounts were found (not supported). Contact the team or use at own risk." />
        )}

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
