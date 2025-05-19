import { Connection, type ConnectionConfig } from "@solana/web3.js";
import React, { type FC, type ReactNode, useMemo, createContext, useContext } from "react";

export interface ConnectionContextState {
  connection: Connection;
}

export interface ConnectionProviderProps {
  children: ReactNode;
  endpoint: string;
  config?: ConnectionConfig;
  connection?: Connection;
}

export const ConnectionContext = createContext<ConnectionContextState>({} as ConnectionContextState);

export const useConnection = (): ConnectionContextState => {
  return useContext(ConnectionContext);
};

export const ConnectionProvider: FC<ConnectionProviderProps> = ({
  children,
  endpoint,
  config = { commitment: "confirmed" },
  connection,
}) => {
  if (connection) {
    return <ConnectionContext.Provider value={{ connection }}>{children}</ConnectionContext.Provider>;
  }

  const conn = useMemo(() => new Connection(endpoint, config), [endpoint, config]);

  return <ConnectionContext.Provider value={{ connection: conn }}>{children}</ConnectionContext.Provider>;
};
