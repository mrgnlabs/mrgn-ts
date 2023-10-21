import { Connection, type ConnectionConfig, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Provider } from "@coral-xyz/anchor";
import { Wallet } from "@coral-xyz/anchor/dist/cjs/provider";
import { JupiterProvider } from "@jup-ag/react-hook";
import React, { type FC, type ReactNode, useMemo, useEffect, useState, createContext, useContext } from "react";
import { useXNftConnection, useXNftWallet } from "~/hooks/xnftHooks";
import { ROUTE_CACHE_DURATION } from "~/consts";

export interface ConnectionProviderProps {
  children: ReactNode;
  endpoint: string;
  isMobile: boolean;
  asLegacyTransaction: boolean;
  config?: ConnectionConfig;
}

export const ConnectionProvider: FC<ConnectionProviderProps> = ({
  children,
  endpoint,
  isMobile,
  asLegacyTransaction,
  config = { commitment: "confirmed" },
}) => {
  const xNftConnection = useXNftConnection();

  const [connection, setConnection] = useState<Connection>();

  useEffect(() => {
    if (isMobile) {
      console.log("he");
      setConnection(new Connection(endpoint, config));
    } else {
      setConnection(xNftConnection);
    }
  }, [setConnection, xNftConnection, endpoint, config, isMobile]);

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
