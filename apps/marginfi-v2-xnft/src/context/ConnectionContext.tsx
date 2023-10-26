import React, { type FC, type ReactNode, useEffect, useState, createContext, useContext } from "react";
import { Connection, type ConnectionConfig } from "@solana/web3.js";

import { useXNftConnection } from "~/hooks/xnftHooks";
import { useWallet } from "~/context/WalletContext";
import marginfiConfig from "~/config";
import { useMrgnlendStore } from "~/store/store";
import { PUBLIC_BIRDEYE_API_KEY } from "@env";
import { useIsMobile } from "~/hooks/useIsMobile";

export interface ConnectionProviderProps {
  children: ReactNode;
  endpoint?: string;
  config?: ConnectionConfig;
}

export const ConnectionProvider: FC<ConnectionProviderProps> = ({
  children,
  endpoint,
  config = { commitment: "confirmed" },
}) => {
  const FALLBACK_RPC = "https://rpc.helius.xyz/?api-key=5a663035-f1ac-4014-9193-5c44785b5e81"; //  TODO add fallback rpc, replace please
  const { wallet } = useWallet();
  const isMobile = useIsMobile();
  const xNftConnection = useXNftConnection();
  const [fetchMrgnlendState, setIsRefreshingStore] = useMrgnlendStore((state) => [
    state.fetchMrgnlendState,
    state.setIsRefreshingStore,
  ]);

  const [connection, setConnection] = useState<Connection>();

  useEffect(() => {
    if (isMobile) {
      setConnection(new Connection(endpoint ?? FALLBACK_RPC, config));
    } else {
      if (endpoint) {
        setConnection(new Connection(endpoint, { commitment: xNftConnection?.commitment ?? "confirmed" }));
      } else {
        if (!xNftConnection?.rpcEndpoint || xNftConnection?.rpcEndpoint.includes("swr.xnfts.dev")) {
          setConnection(new Connection(FALLBACK_RPC, config));
        } else {
          setConnection(new Connection(xNftConnection?.rpcEndpoint, config));
        }
      }
    }
  }, [setConnection, xNftConnection, endpoint, isMobile]);

  useEffect(() => {
    if (connection) {
      setIsRefreshingStore(true);
      fetchMrgnlendState({
        marginfiConfig: marginfiConfig.mfiConfig,
        connection,
        wallet: wallet ?? undefined,
        birdEyeApiKey: PUBLIC_BIRDEYE_API_KEY,
      }).catch(console.error);
      const id = setInterval(() => {
        setIsRefreshingStore(true);
        fetchMrgnlendState().catch(console.error);
      }, 50_000);
      return () => clearInterval(id);
    }
  }, [fetchMrgnlendState, connection, wallet]);

  if (!connection) {
    return <></>;
  }

  return <ConnectionContext.Provider value={{ connection }}>{children}</ConnectionContext.Provider>;
};

export interface ConnectionContextState {
  connection: Connection;
}

export const ConnectionContext = createContext<ConnectionContextState>({} as ConnectionContextState);

export function useConnection(): ConnectionContextState {
  return useContext(ConnectionContext);
}
