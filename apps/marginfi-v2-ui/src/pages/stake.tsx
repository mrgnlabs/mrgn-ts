import React from "react";

import { useRouter } from "next/router";

import { JupiterProvider } from "@jup-ag/react-hook";

import { ActionType, createJupiterStore } from "@mrgnlabs/marginfi-v2-ui-state";

import { Desktop } from "~/mediaQueries";
import { usePrevious, Features, isActive } from "~/utils";
import { useLstStore } from "~/store";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";

import { OverlaySpinner } from "~/components/ui/overlay-spinner";
import { Loader } from "~/components/ui/loader";
import { ActionBox } from "~/components/common/ActionBox";

export const useJupiterStore = createJupiterStore();

export default function StakePage() {
  const { wallet, walletAddress } = useWalletContext();
  const { connection } = useConnection();
  const [mounted, setMounted] = React.useState(false);
  const debounceId = React.useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();

  React.useEffect(() => {
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

  React.useEffect(() => {
    const fetchData = () => {
      setIsRefreshingStore(true);
      fetchLstState({ connection, wallet }).catch(console.error);
    };

    if (debounceId.current) {
      clearTimeout(debounceId.current);
    }

    debounceId.current = setTimeout(() => {
      fetchData();

      const id = setInterval(() => {
        setIsRefreshingStore(true);
        fetchLstState().catch(console.error);
      }, 30_000);

      return () => {
        clearInterval(id);
        clearTimeout(debounceId.current!);
      };
    }, 1000);

    return () => {
      if (debounceId.current) {
        clearTimeout(debounceId.current);
      }
    };
  }, [wallet]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ crucial to omit both `connection` and `fetchMrgnlendState` from the dependency array
  // TODO: fix...

  React.useEffect(() => {
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
  React.useEffect(() => {
    if (!prevWalletAddress && walletAddress) {
      resetUserData();
    }
  }, [walletAddress, prevWalletAddress, resetUserData]);

  React.useEffect(() => {
    if (!walletAddress && userDataFetched) {
      resetUserData();
    }
  }, [walletAddress, userDataFetched, resetUserData]);

  if (!mounted) return null;

  return (
    <>
      <JupiterProvider connection={connection} wrapUnwrapSOL={false} platformFeeAndAccounts={undefined}>
        <StakingContent isInitialized={initialized} />
        <Desktop>
          <OverlaySpinner fetching={!initialized || isRefreshingStore} />
        </Desktop>
      </JupiterProvider>
    </>
  );
}

const StakingContent = ({ isInitialized }: { isInitialized: boolean }) => (
  <div className="flex flex-col max-w-[640px] h-full w-full justify-center items-center pb-32 lg:pb-16 px-4">
    {!isInitialized && <Loader label="Loading mrgnstake..." className="mt-8" />}
    {isInitialized && (
      <div className="space-y-6 text-center mb-4">
        <h1 className="font-bold text-3xl">LST — mrgn&apos;s Liquid Staking Token.</h1>
        <p>The highest natural yield available from any LST on Solana. By a lot.</p>
        <div className="text-chartreuse space-y-2 font-bold">
          <p>LST is the highest natural yielding LST</p>
          <p>LST is powered by Jito&apos;s MEV-boosted client</p>
          <p>
            LST only stakes to 0% commission{" "}
            <a
              href="https://stakewiz.com/validator/mrgn2vsZ5EJ8YEfAMNPXmRux7th9cNfBasQ1JJvVwPn"
              target="_blank"
              rel="noreferrer"
              className="border-b border-chartreuse/50 transition-colors hover:border-transparent"
            >
              mrgn validators
            </a>
          </p>
        </div>
      </div>
    )}
    {isInitialized && (
      <>
        <div className="max-w-[480px] w-full space-y-4">
          <ActionBox requestedAction={ActionType.MintLST} />
        </div>
        <p className="text-white/75 mt-8 text-center">
          Using mrgn&apos;s sophisticated validator set, you pay no fees, earn more yield, and get more utility out of
          your staked SOL than anywhere else. Maximum liquidity with Sanctum, maximum MEV rewards with Jito, maximum
          utility with marginfi, maximum flexibility with Solana DeFi.
        </p>
      </>
    )}
  </div>
);
