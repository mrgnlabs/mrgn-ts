import { JupiterProvider } from "@jup-ag/react-hook";
import { createJupiterStore } from "@mrgnlabs/marginfi-v2-ui-state";
import { useConnection } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import { PageHeader } from "~/components/PageHeader";
import { StakingStats } from "~/components/Staking";
import { StakingCard } from "~/components/Staking/StakingCard/StakingCard";
import { useWalletContext } from "~/components/useWalletContext";
import { createLstStore } from "~/store/lstStore";
import { usePrevious } from "~/utils";

export const useLstStore = createLstStore();
export const useJupiterStore = createJupiterStore();

const StakePage = () => {
  const { wallet, walletAddress } = useWalletContext();
  const { connection } = useConnection();

  const [fetchLstState, setIsRefreshingStore, userDataFetched, resetUserData] = useLstStore((state) => [
    state.fetchLstState,
    state.setIsRefreshingStore,
    state.userDataFetched,
    state.resetUserData,
  ]);

  useEffect(() => {
    setIsRefreshingStore(true);
    fetchLstState({ connection, wallet }).catch(console.error);
    const id = setInterval(() => {
      setIsRefreshingStore(true);
      fetchLstState().catch(console.error);
    }, 30_000);
    return () => clearInterval(id);
  }, [wallet]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ crucial to omit both `connection` and `fetchMrgnlendState` from the dependency array
  // TODO: fix...

  const prevWalletAddress = usePrevious(walletAddress);
  useEffect(() => {
    if (!prevWalletAddress && walletAddress) {
      resetUserData();
    }
  }, [walletAddress, prevWalletAddress, resetUserData]);

  useEffect(() => {
    if (!walletAddress && userDataFetched) {
      resetUserData();
    }
  }, [walletAddress, userDataFetched, resetUserData]);

  return (
    <JupiterProvider connection={connection}>
      <PageHeader>stake</PageHeader>
      <div className="flex flex-col h-full max-w-[480px] w-full justify-center content-center pt-[64px] sm:pt-[16px] gap-4 px-4">
        <StakingStats />
        <StakingCard />
      </div>
    </JupiterProvider>
  );
};

export default StakePage;
