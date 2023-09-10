import React, { createContext, FC, useCallback, useContext, useEffect, useState } from "react";
import config from "~/config/marginfi";
import { LipClient } from "@mrgnlabs/lip-client";
import { useMrgnlendStore } from "~/store";

// @ts-ignore - Safe because context hook checks for null
const LipClientContext = createContext<LipClientState>();

interface LipClientState {
  reload: () => Promise<void>;
  lipClient: LipClient | null;
}

const LipClientFC: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [mfiClient] = useMrgnlendStore((state) => [state.marginfiClient]);
  const [lipClient, setLipClient] = useState<LipClient | null>(null);

  const reload = useCallback(async () => {
    if (!mfiClient) return;
    const lipClient = await LipClient.fetch(config.lipConfig, mfiClient);
    setLipClient(lipClient);
  }, [mfiClient]);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <LipClientContext.Provider
      value={{
        reload,
        lipClient,
      }}
    >
      {children}
    </LipClientContext.Provider>
  );
};

const useLipClient = () => {
  const context = useContext(LipClientContext);
  if (!context) {
    throw new Error("LipClientState must be used within a LipClientStateProvider");
  }

  return context;
};

const LipClientProvider = React.memo(LipClientFC);

export { useLipClient, LipClientProvider };
