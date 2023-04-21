import { Wallet } from "@mrgnlabs/mrgn-common";
import { Connection } from "@solana/web3.js";
import React, { useEffect, useMemo, useState } from "react";
import { FC, createContext, useContext } from "react";

// @ts-ignore - Safe because context hook checks for null
const XnftProviderContext = createContext<XnftProviderState>();

interface XnftProviderState {
  wallet?: Wallet;
  connection?: Connection;
}

const XnftProviderProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [provider, setProvider] = useState<any>();

  const { wallet, connection } = useMemo(() => {
    if (!provider) {
      return {};
    }

    return {
      wallet: provider,
      connection: new Connection(provider.connection.rpcEndpoint, provider.connection.commitment),
    };
  }, [provider]);

  useEffect(() => {
    window.xnft.solana.on("connection", () => {
      setProvider(window.xnft.solana);
    });
    window.xnft.solana.on("connectionUpdate", () => {
      setProvider(window.xnft.solana);
    });
    setProvider(window.xnft.solana);
  }, []);

  return <XnftProviderContext.Provider value={{ wallet, connection }}>{children}</XnftProviderContext.Provider>;
};

const useXnftProvider = () => {
  const context = useContext(XnftProviderContext);
  if (!context) {
    throw new Error("useXnftProvider must be used within a XnftProviderProvider");
  }

  return context;
};

export { useXnftProvider, XnftProviderProvider };
