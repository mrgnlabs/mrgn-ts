import { JupiterProvider } from "@jup-ag/react-hook";
import { createJupiterStore } from "@mrgnlabs/marginfi-v2-ui-state";
import { Typography } from "@mui/material";
import { useConnection } from "@solana/wallet-adapter-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { StakingCard, StakingStats } from "~/components/common/Staking";
import { OverlaySpinner } from "~/components/desktop/OverlaySpinner";
import { PageHeader } from "~/components/common/PageHeader";
import { useWalletContext } from "~/hooks/useWalletContext";
import { Desktop } from "~/mediaQueries";
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

  const [initialized, isRefreshingStore, fetchLstState, setIsRefreshingStore, userDataFetched, resetUserData] =
    useLstStore((state) => [
      state.initialized,
      state.isRefreshingStore,
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
    <JupiterProvider connection={connection} wrapUnwrapSOL={false}>
      <PageHeader>stake</PageHeader>
      <StakingContent />
      <Desktop>
        <OverlaySpinner fetching={!initialized || isRefreshingStore} />
      </Desktop>
    </JupiterProvider>
  );
};

const StakingContent = () => (
  <div className="flex flex-col max-w-[640px] h-full w-full justify-center items-center pt-10 pb-16 px-4">
    <div className="space-y-6 text-center mb-4">
      <h1 className="font-bold text-3xl">LST — mrgn&apos;s Liquid Staking Token.</h1>
      <p>The highest natural yield available from any LST on Solana. By a lot.</p>
      <div className="text-[#DCE85D] space-y-2 font-bold">
        <p>LST is the only 8% yielding LST.</p>
        <p>LST is the only 0% commission LST.</p>
        <p>LST is the only 0 fee LST.</p>
      </div>
    </div>
    <div className="max-w-[480px] w-full space-y-4">
      <StakingStats />
      <StakingCard />
    </div>
    <p className="text-white/75 mt-8 text-center">
      Using mrgn&apos;s sophisticated validator set, you pay no fees, earn more yield, and get more utility out of your
      staked SOL than anywhere else. Maximum liquidity with Sanctum, maximum utility with marginfi, maximum flexibility
      with Solana DeFi.
    </p>
  </div>
);

export default StakePage;
