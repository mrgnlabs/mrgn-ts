import { useConnection } from "@solana/wallet-adapter-react";
import { useEffect } from "react";
import { PageHeader } from "~/components/PageHeader";
import { StakingStats } from "~/components/Staking";
import { StakingCard } from "~/components/Staking/StakingCard/StakingCard";
import { useWalletContext } from "~/components/useWalletContext";
import { createLstStore } from "~/store/lstStore";

export const useLstStore = createLstStore();

const StakePage = () => {
  const { wallet } = useWalletContext();
  const { connection } = useConnection();
  
  const [
  fetchLstState,
  setIsRefreshingStore,
] = useLstStore((state) => [
  state.fetchLstState,
  state.setIsRefreshingStore,
  state.userDataFetched,
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

  return (
    <>
      <PageHeader text={"$LST"} />
      <div className="flex flex-col h-full justify-center content-center pt-[64px] sm:pt-[16px] gap-4 mx-4">
        <StakingStats />
        <StakingCard />
      </div>
    </>
  );
};

export default StakePage;
