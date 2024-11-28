import React from "react";
import { useRouter } from "next/router";

import { identify } from "@mrgnlabs/mrgn-utils";

import { useTradeStore, useUiStore } from "~/store";
import { useConnection } from "~/hooks/use-connection";
import { useWallet } from "~/components/wallet-v2";

// @ts-ignore - Safe because context hook checks for null
const TradeContext = React.createContext<>();

export const TradePovider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const router = useRouter();
  const debounceId = React.useRef<NodeJS.Timeout | null>(null);
  const { wallet, isOverride, connected } = useWallet();
  const { connection } = useConnection();
  const [fetchTradeState, setIsRefreshingStore, resetUserData] = useTradeStore((state) => [
    state.fetchTradeState,
    state.setIsRefreshingStore,
    state.resetUserData,
  ]);
  const [fetchPriorityFee] = useUiStore((state) => [state.fetchPriorityFee]);
  const [isLoggedIn, setIsLoggedIn] = React.useState(false);

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
    const fetchData = () => {
      setIsRefreshingStore(true);
      fetchPriorityFee(connection);
      fetchTradeState({
        connection,
        wallet,
      });
    };

    if (debounceId.current) {
      clearTimeout(debounceId.current);
    }

    debounceId.current = setTimeout(() => {
      fetchData();

      const id = setInterval(() => {
        setIsRefreshingStore(true);
        fetchTradeState({});
        fetchPriorityFee(connection);
      }, 50_000);

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
  }, [wallet, isOverride]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ crucial to omit both `connection` and `fetchMrgnlendState` from the dependency array
  // TODO: fix...

  React.useEffect(() => {
    if (!connected && resetUserData) {
      resetUserData();
    }
  }, [connected, resetUserData]);

  return <TradeContext.Provider value={{}}>{children}</TradeContext.Provider>;
};
