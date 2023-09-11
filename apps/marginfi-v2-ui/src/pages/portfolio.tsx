import { useEffect } from "react";
import { PageHeaderSwap } from "~/components/desktop/PageHeader";
import { useWalletContext } from "~/hooks/useWalletContext";
import { MobilePortfolioOverview } from "~/components/mobile/MobilePortfolioOverview/MobilePortfolioOverview";
import { useConnection } from "@solana/wallet-adapter-react";
import { useMrgnlendStore } from "~/store";
import config from "~/config/marginfi";
import { MobileAccountSummary } from "~/components/mobile/MobileAccountSummary";

const PortfolioPage = () => {
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
      <PageHeaderSwap />
      <div className="flex flex-col h-full justify-start content-start pt-[16px] w-4/5 max-w-7xl gap-7">
        <MobileAccountSummary />
        <MobilePortfolioOverview />
      </div>
    </>
  );
};

export default PortfolioPage;
