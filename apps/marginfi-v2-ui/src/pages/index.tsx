import React, { useEffect } from "react";
import { Banner } from "~/components";
import { PageHeader } from "~/components/PageHeader";
import { useWalletContext } from "~/components/useWalletContext";
import { shortenAddress } from "@mrgnlabs/mrgn-common";
import config from "~/config/marginfi";
import { useMrgnlendStore } from "../store";
import dynamic from "next/dynamic";
import { OverlaySpinner } from "~/components/OverlaySpinner";
import { useConnection } from "@solana/wallet-adapter-react";

const AccountSummary = dynamic(async () => (await import("~/components/AccountSummary")).AccountSummary, {
  ssr: false,
});
const AssetsList = dynamic(async () => (await import("~/components/AssetsList")).AssetsList, { ssr: false });
const UserPositions = dynamic(async () => (await import("~/components/UserPositions")).UserPositions, { ssr: false });

const Home = () => {
  const { walletAddress, wallet, isOverride } = useWalletContext();
  const { connection } = useConnection();
  const [
    fetchMrgnlendState,
    setIsRefreshingStore,
    marginfiAccountCount,
    selectedAccount,
    userDataFetched,
    resetUserData,
  ] = useMrgnlendStore((state) => [
    state.fetchMrgnlendState,
    state.setIsRefreshingStore,
    state.marginfiAccountCount,
    state.selectedAccount,
    state.userDataFetched,
    state.resetUserData,
  ]);

  const [isStoreInitialized, isRefreshingStore] = useMrgnlendStore((state) => [
    state.initialized,
    state.isRefreshingStore,
  ]);

  useEffect(() => {
    if (!walletAddress && userDataFetched) {
      resetUserData();
    }
  }, [walletAddress, userDataFetched, resetUserData]);

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
      <div className="flex flex-col h-full justify-start content-start pt-[64px] sm:pt-[16px] w-4/5 max-w-7xl gap-4">
        {walletAddress && selectedAccount && isOverride && (
          <Banner
            text={`Read-only view of ${shortenAddress(
              selectedAccount.address.toBase58()
            )} (owner: ${shortenAddress(walletAddress)}) - All actions are simulated`}
            backgroundColor="#7fff00"
          />
        )}
        {walletAddress && marginfiAccountCount > 1 && (
          <Banner text="Multiple accounts were found (not supported). Contact the team or use at own risk." />
        )}

        <AccountSummary />
      </div>
      <div className="flex flex-col justify-start content-start pt-[16px] pb-[64px] grid w-4/5 max-w-7xl gap-4 grid-cols-1 xl:grid-cols-2">
        <AssetsList />
        {walletAddress && <UserPositions />}
      </div>
      <OverlaySpinner fetching={!isStoreInitialized || isRefreshingStore} />
    </>
  );
};

export default Home;
