import React, { createContext, FC, useContext, useEffect, useState } from "react";
import { MarginfiClient, MarginfiClientReadonly } from "@mrgnlabs/marginfi-client-v2";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import config from "~/config";

// @ts-ignore - Safe because context hook checks for null
const ProgramContext = createContext<ProgramState>();

interface ProgramState {
  mfiClientReadonly: MarginfiClientReadonly | null;
  mfiClient: MarginfiClient | null;
}

const ProgramProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();

  const [mfiClient, setMfiClient] = useState<MarginfiClient | null>(null);
  const [mfiClientReadonly, setMfiClientReadonly] = useState<MarginfiClientReadonly | null>(null);

  useEffect(() => {
    (async function () {
      const roClient = await MarginfiClientReadonly.fetch(config.mfiConfig, connection);
      setMfiClientReadonly(roClient);

      if (!anchorWallet) {
        setMfiClient(null);
        return;
      }

      const client = await MarginfiClient.fetch(
        config.mfiConfig,
        //@ts-ignore
        anchorWallet,
        connection
      );
      setMfiClient(client);
    })();
  }, [anchorWallet, connection]);

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
