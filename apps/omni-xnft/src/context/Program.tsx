import React, { createContext, FC, useContext, useEffect, useState } from "react";
import { MarginfiClient, MarginfiClientReadonly } from "@mrgnlabs/marginfi-client-v2";
import config from "~config";
import { useXnftProvider } from "~context";

// @ts-ignore - Safe because context hook checks for null
const ProgramContext = createContext<ProgramState>();

interface ProgramState {
  mfiClientReadonly: MarginfiClientReadonly | null;
  mfiClient: MarginfiClient | null;
}

const ProgramProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { wallet, connection } = useXnftProvider();

  const [mfiClient, setMfiClient] = useState<MarginfiClient | null>(null);
  const [mfiClientReadonly, setMfiClientReadonly] = useState<MarginfiClientReadonly | null>(null);

  useEffect(() => {
    (async function () {
      if (!connection) {
        setMfiClientReadonly(null);
        return;
      }

      const roClient = await MarginfiClientReadonly.fetch(config.mfiConfig, connection);
      setMfiClientReadonly(roClient);

      if (!wallet) {
        setMfiClient(null);
        return;
      }

      const client = await MarginfiClient.fetch(config.mfiConfig, wallet, connection);
      setMfiClient(client);
    })();
  }, [wallet, connection]);

  return (
    <ProgramContext.Provider
      value={{
        mfiClientReadonly,
        mfiClient,
      }}
    >
      {children}
    </ProgramContext.Provider>
  );
};

const useProgram = () => {
  const context = useContext(ProgramContext);
  if (!context) {
    throw new Error("useProgramState must be used within a ProgramStateProvider");
  }

  return context;
};

export { useProgram, ProgramProvider };
