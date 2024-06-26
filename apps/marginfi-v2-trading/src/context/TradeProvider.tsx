import React from "react";
import { useRouter } from "next/router";

import config from "~/config/marginfi";
import { useTradeStore } from "~/store";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";

// @ts-ignore - Safe because context hook checks for null
const TradeContext = React.createContext<>();

export const TradePovider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const router = useRouter();
  const debounceId = React.useRef<NodeJS.Timeout | null>(null);
  const { wallet, isOverride, sendEndpoint } = useWalletContext();
  const { connection } = useConnection();
  const [fetchTradeState, isRefreshingStore, setIsRefreshingStore] = useTradeStore((state) => [
    state.fetchTradeState,
    state.isRefreshingStore,
    state.setIsRefreshingStore,
  ]);

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
        if (router.pathname !== "/trade") {
          clearInterval(id);
          clearTimeout(debounceId.current!);
          return;
        }
        setIsRefreshingStore(true);
        fetchTradeState({
          connection,
          wallet,
        });
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
