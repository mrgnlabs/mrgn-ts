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
  const { provider } = useXnftProvider();

  const [mfiClient, setMfiClient] = useState<MarginfiClient | null>(null);
  const [mfiClientReadonly, setMfiClientReadonly] = useState<MarginfiClientReadonly | null>(null);

  useEffect(() => {
    (async function () {
      console.log("fetching mfiClient", provider);

      if (!provider?.connection) {
        setMfiClientReadonly(null);
        return;
      }

      console.log("fetching mfiClient RO", config.mfiConfig.groupPk.toBase58());
      const roClient = await MarginfiClientReadonly.fetch(config.mfiConfig, provider.connection);
      setMfiClientReadonly(roClient);

      if (!provider) {
        setMfiClient(null);
        return;
      }

      console.log("fetching mfiClient");
      const client = await MarginfiClient.fetch(config.mfiConfig, provider, provider.connection);
      setMfiClient(client);
    })();
  }, [provider]);

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
