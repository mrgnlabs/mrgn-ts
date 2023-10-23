import React, { type FC, type ReactNode, useEffect, useState, createContext, useContext } from "react";
import { Connection, type ConnectionConfig, PublicKey } from "@solana/web3.js";

import { useXNftConnection } from "~/hooks/xnftHooks";
import { useWallet } from "~/context/WalletContext";
import marginfiConfig from "~/config";
import { useMrgnlendStore } from "~/store/store";

export interface ConnectionProviderProps {
  children: ReactNode;
  isMobile: boolean;
  asLegacyTransaction: boolean;
  endpoint?: string;
  config?: ConnectionConfig;
}

export const ConnectionProvider: FC<ConnectionProviderProps> = ({
  children,
  endpoint,
  isMobile,
  asLegacyTransaction,
  config = { commitment: "confirmed" },
}) => {
  const { wallet } = useWallet();
  const xNftConnection = useXNftConnection();
  const [fetchMrgnlendState, setIsRefreshingStore] = useMrgnlendStore((state) => [
    state.fetchMrgnlendState,
    state.setIsRefreshingStore,
  ]);

  const [connection, setConnection] = useState<Connection>();

  useEffect(() => {
    if (isMobile) {
      setConnection(new Connection(endpoint ?? "", config)); // TODO add fallback rpc
    } else {
      if (endpoint) {
        setConnection(new Connection(endpoint, { commitment: xNftConnection?.commitment ?? "confirmed" }));
      } else {
        setConnection(xNftConnection);
      }
    }
  }, [setConnection, xNftConnection, endpoint, isMobile]);

  useEffect(() => {
    if (connection) {
      setIsRefreshingStore(true);
      fetchMrgnlendState({ marginfiConfig: marginfiConfig.mfiConfig, connection, wallet: wallet ?? undefined }).catch(
        console.error
      );
      const id = setInterval(() => {
        setIsRefreshingStore(true);
        fetchMrgnlendState().catch(console.error);
      }, 30_000);
      return () => clearInterval(id);
    }
  }, [fetchMrgnlendState, connection, wallet]);

  const haha = async (connection?: Connection) => {
    if (connection) {
      const test = await xNftConnection?.getAccountInfo(new PublicKey("3rpcmBeq3LcdTxez1sdi8vf61ofpxFpKrr7iViEWykAR"));
      console.log(test);
    }
  };

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
