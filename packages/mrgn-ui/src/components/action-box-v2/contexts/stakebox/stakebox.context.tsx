import React from "react";

import { Connection } from "@solana/web3.js";

import { LstData } from "@mrgnlabs/mrgn-utils";

import { useStakeBoxContextStore } from "../../store";
import { fetchLstData } from "../../utils";

type StakeBoxContextType = {
  lstData: LstData | null;
};

const StakeBoxContext = React.createContext<StakeBoxContextType | null>(null);

export const StakeBoxProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const debounceId = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lstData, setLstData] = useStakeBoxContextStore((state) => [state.lstData, state.setLstData]);

  React.useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchData = async () => {
      const connection = new Connection(process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE!, "confirmed");
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

export const useStakeBoxContext = () => {
  const context = React.useContext(StakeBoxContext);
  return context;
};
