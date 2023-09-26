import { JupiterProvider } from "@jup-ag/react-hook";
import { createJupiterStore } from "@mrgnlabs/marginfi-v2-ui-state";
import { Typography } from "@mui/material";
import { useConnection } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { PageHeader } from "~/components/PageHeader";
import { StakingStats } from "~/components/Staking";
import { StakingCard } from "~/components/Staking/StakingCard/StakingCard";
import { useWalletContext } from "~/components/useWalletContext";
import { createLstStore } from "~/store/lstStore";
import { usePrevious } from "~/utils";
import { Features, isActive } from "~/utils/featureGates";

export const useLstStore = createLstStore();
export const useJupiterStore = createJupiterStore();

const StakePage = () => {
  const { wallet, walletAddress } = useWalletContext();
  const { connection } = useConnection();
  const [mounted, setMounted] = useState(false);

  const router = useRouter();

  useEffect(() => {
    if (router.pathname.startsWith("/stake") && !isActive(Features.STAKE)) {
      router.push("/");
    } else {
      setMounted(true);
    }
  }, [router]);

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

  if (!mounted) return null;

  return (
    <JupiterProvider connection={connection}>
      <PageHeader>stake</PageHeader>
      <div className="flex flex-col h-full max-w-[480px] w-full justify-center content-center pt-[64px] sm:pt-[16px] gap-4 px-4">
        <StakingStats />
        <StakingCard />
        <div className="flex flex-col mt-10 pb-[64px] gap-5 justify-center font-aeonik text-lg">
          <Typography className="text-center w-full">
            <span className="font-bold text-[#DCE85D]">$LST</span> is a mrgn x Jito collab
          </Typography>
          <Typography className="text-center w-full">
            Introducing the best way to get exposure to SOL. <span className="font-bold text-[#DCE85D]">$LST</span> is
            built on mrgn's validator network and Jito's MEV rewards. For the first time,{" "}
            <span className="font-bold text-[#DCE85D]">$LST</span> holders can get the best staking yield available on
            Solana, combined with the biggest MEV rewards from Solana's trader network.
          </Typography>
          <Typography className="text-center w-full">
            <span className="font-bold text-[#DCE85D]">$LST</span> has 0% commission. The yield goes to you. Stop
            paying middlemen. Stop using underperforming validators. Stop missing out on MEV rewards.
          </Typography>
        </div>
      </div>
    </JupiterProvider>
  );
};

export default StakePage;
