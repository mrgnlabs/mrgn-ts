import React from "react";
import { useRouter } from "next/router";

import config from "~/config/marginfi";
import { useMrgnlendStore } from "~/store";
import { useConnection } from "~/hooks/useConnection";
import { useWalletContext } from "~/hooks/useWalletContext";

// @ts-ignore - Safe because context hook checks for null
const MrgnlendContext = React.createContext<>();

export const MrgnlendProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const router = useRouter();
  const debounceId = React.useRef<NodeJS.Timeout | null>(null);
  const { wallet, isOverride, sendEndpoint } = useWalletContext();
  const { connection } = useConnection();
  const [fetchMrgnlendState, setIsRefreshingStore] = useMrgnlendStore((state) => [
    state.fetchMrgnlendState,
    state.setIsRefreshingStore,
  ]);

  // if account set in query param then store inn local storage and remove from url
  React.useEffect(() => {
    const { account } = router.query;
    if (!account) return;

    const prevMfiAccount = localStorage.getItem("mfiAccount");
    if (prevMfiAccount === account) return;

    localStorage.setItem("mfiAccount", account as string);
    router.replace(router.pathname, undefined, { shallow: true });
    fetchMrgnlendState();
  }, [router.query]); // eslint-disable-line react-hooks/exhaustive-deps

  React.useEffect(() => {
    const fetchData = () => {
      setIsRefreshingStore(true);
      fetchMrgnlendState({ marginfiConfig: config.mfiConfig, connection, wallet, isOverride, sendEndpoint, spamSendTx: true, skipPreflightInSpam: true }).catch(console.error);
    };

    if (debounceId.current) {
      clearTimeout(debounceId.current);
    }

    debounceId.current = setTimeout(() => {
      fetchData();

      const id = setInterval(() => {
        setIsRefreshingStore(true);
        fetchMrgnlendState().catch(console.error);
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

  return <MrgnlendContext.Provider value={{}}>{children}</MrgnlendContext.Provider>;
};
