import React from "react";

import { Connection } from "@solana/web3.js";

import { LstData, generateEndpoint } from "@mrgnlabs/mrgn-utils";

import { fetchLstData } from "../../utils";

type StakeBoxContextType = {
  lstData: LstData | null;
};

const StakeBoxContext = React.createContext<StakeBoxContextType | null>(null);

export const StakeBoxProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const debounceId = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lstData, setLstData] = React.useState<LstData | null>(null);

  React.useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchData = async () => {
      const rpcEndpoint = await generateEndpoint(
        process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE ?? "",
        process.env.NEXT_PUBLIC_RPC_PROXY_KEY ?? ""
      );
      const connection = new Connection(rpcEndpoint, "confirmed");
      const lstData = await fetchLstData(connection);
      lstData && setLstData(lstData);
    };

    const startFetching = () => {
      fetchData();

      intervalId = setInterval(() => {
        fetchData();
      }, 30_000);
    };

    const stopFetching = () => {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    debounceId.current = setTimeout(() => {
      startFetching();
    }, 1000);

    return () => {
      if (debounceId.current) {
        clearTimeout(debounceId.current);
        debounceId.current = null;
      }
      stopFetching();
    };
  }, []);

  return <StakeBoxContext.Provider value={{ lstData }}>{children}</StakeBoxContext.Provider>;
};

export const useStakeBoxContext = () => React.useContext(StakeBoxContext);
