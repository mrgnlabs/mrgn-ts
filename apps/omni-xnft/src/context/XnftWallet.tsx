import { Wallet } from "@mrgnlabs/mrgn-common";
import { Connection } from "@solana/web3.js";
import React, { useEffect, useMemo, useState } from "react";
import { FC, createContext, useContext } from "react";

interface XnftProvider extends Wallet {
  connection: Connection;
}

// @ts-ignore - Safe because context hook checks for null
const XnftProviderContext = createContext<XnftProviderState>();

interface XnftProviderState {
  provider: XnftProvider | undefined;
}

const XnftProviderProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [provider, setProvider] = useState(window.xnft?.solana);

  useEffect(() => {
    console.log(window.xnft.solana);

    if (!window.xnft.solana) {
      const timerId = setInterval(() => {
        console.log("is it yet?");
        if (window.xnft.solana) {
          console.log("yes!!!");
          setProvider(window.xnft.solana);
          clearInterval(timerId);
        }
      }, 100);
      return;
    }

    window.xnft.solana.on("connection", () => {
      console.log("connection wallet");
      setProvider(window.xnft.solana);
    });
    window.xnft.solana.on("connectionUpdate", () => {
      console.log("connectionUpdate wallet");
      setProvider(window.xnft.solana);
    });
    setProvider(window.xnft.solana);
  }, []);
  console.log("updating wallet", provider);

  return <XnftProviderContext.Provider value={{ provider }}>{children}</XnftProviderContext.Provider>;
};

const useXnftProvider = () => {
  const context = useContext(XnftProviderContext);
  if (!context) {
    throw new Error("useXnftProvider must be used within a XnftProviderProvider");
  }

  return context;
};

export { useXnftProvider, XnftProviderProvider };
