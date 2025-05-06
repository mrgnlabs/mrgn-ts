import React from "react";
import { useRouter } from "next/router";

import { identify } from "@mrgnlabs/mrgn-utils";
import { useWallet } from "@mrgnlabs/mrgn-ui";

import { useTradeStoreV2, useUiStore } from "~/store";
import { useConnection } from "~/hooks/use-connection";

// @ts-ignore - Safe because context hook checks for null
const TradeContext = React.createContext<>();

export const TradePovider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const router = useRouter();
  const debounceId = React.useRef<NodeJS.Timeout | null>(null);
  const { wallet, connected } = useWallet();
  const { connection } = useConnection();

  const [
    fetchUserData,
    fetchExtendedArenaGroups,
    fetchArenaGroups,
    setHydrationComplete,
    resetUserData,
    initialized,
    poolsFetched,
    userDataFetched,
    hydrationComplete,
  ] = useTradeStoreV2((state) => [
    state.fetchUserData,
    state.fetchExtendedArenaGroups,
    state.fetchArenaGroups,
    state.setHydrationComplete,
    state.resetUserData,
    state.initialized,
    state.poolsFetched,
    state.userDataFetched,
    state.hydrationComplete,
  ]);

  const [fetchPriorityFee] = useUiStore((state) => [state.fetchPriorityFee]);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

  React.useEffect(() => {
    const hydrate = async () => {
      if (!hydrationComplete) {
        await fetchArenaGroups();
        setHydrationComplete();
      }
    };

    hydrate();
  }, [fetchArenaGroups, hydrationComplete, setHydrationComplete]);

  React.useEffect(() => {
    if (initialized) {
      fetchExtendedArenaGroups({ connection, wallet });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialized, wallet]);

  React.useEffect(() => {
    if (poolsFetched && wallet && connected) {
      fetchUserData({ connection, wallet });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poolsFetched, connected, fetchUserData, wallet]);

  React.useEffect(() => {
    const trackReferral = async (referralCode: string, walletAddress: string) => {
      const trackReferralRes = await fetch(`/api/user/referral/track-referral`, {
        method: "POST",
        body: JSON.stringify({ referralCode, wallet: walletAddress }),
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!trackReferralRes.ok) {
        return;
      }

      const trackReferralResJson = await trackReferralRes.json();
      sessionStorage.removeItem("arenaReferralCode");
    };

    const referralCode = sessionStorage.getItem("arenaReferralCode");
    if (!referralCode || !wallet || !connected) return;

    trackReferral(referralCode, wallet.publicKey.toBase58());

    if (!isLoggedIn && wallet.publicKey) {
      const walletAddress = wallet.publicKey.toBase58();
      setIsLoggedIn(true);

      if (!walletAddress) return;

      identify(walletAddress, {
        wallet: walletAddress,
      });
    }
  }, [router.asPath, wallet, connected, isLoggedIn]);

  React.useEffect(() => {
    const initializeAndFetch = () => {
      fetchPriorityFee(connection);
    };

    if (debounceId.current) {
      clearTimeout(debounceId.current);
    }

    debounceId.current = setTimeout(initializeAndFetch, 1000);

    const intervalId = setInterval(initializeAndFetch, 60_000);

    return () => {
      if (debounceId.current) {
        clearTimeout(debounceId.current);
      }
      clearInterval(intervalId);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    if (!connected && resetUserData) {
      resetUserData();
    }
  }, [connected, resetUserData]);

  return <TradeContext.Provider value={{}}>{children}</TradeContext.Provider>;
};
