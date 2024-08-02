import React from "react";
import { useRouter } from "next/router";

import { useTradeStore } from "~/store";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";
import { PublicKey } from "@solana/web3.js";
import { usePrevious } from "~/utils";

// @ts-ignore - Safe because context hook checks for null
const TradeContext = React.createContext<>();

export const TradePovider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const router = useRouter();
  const debounceId = React.useRef<NodeJS.Timeout | null>(null);
  const { wallet, isOverride, sendEndpoint, walletAddress } = useWalletContext();
  const prevWalletAddress = usePrevious(walletAddress);
  const { connection } = useConnection();
  const [
    initialized,
    userDataFetched,
    activeGroup,
    fetchTradeState,
    setActiveGroup,
    isRefreshingStore,
    setIsRefreshingStore,
  ] = useTradeStore((state) => [
    state.initialized,
    state.userDataFetched,
    state.activeGroup,
    state.fetchTradeState,
    state.setActiveGroup,
    state.isRefreshingStore,
    state.setIsRefreshingStore,
  ]);

  React.useEffect(() => {
    const symbol = router?.query?.symbol as string | undefined;
    const isWalletConnected = wallet?.publicKey;

    const isFetchable = (isWalletConnected && userDataFetched) || (!isWalletConnected && !userDataFetched);

    if (!symbol) {
      //clear state
    } else if (isFetchable && initialized && wallet) {
      try {
        const pk = new PublicKey(symbol);
        setActiveGroup({ groupPk: new PublicKey(symbol) });
      } catch {
        router.push("/404");
      }
    }
  }, [router, initialized, prevWalletAddress, walletAddress, userDataFetched, wallet, setActiveGroup]);

  React.useEffect(() => {
    const fetchData = () => {
      setIsRefreshingStore(true);
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
  }, [wallet, isOverride]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ crucial to omit both `connection` and `fetchMrgnlendState` from the dependency array
  // TODO: fix...

  return <TradeContext.Provider value={{}}>{children}</TradeContext.Provider>;
};
