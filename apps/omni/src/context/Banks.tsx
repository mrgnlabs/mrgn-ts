import React, { createContext, FC, useCallback, useContext, useEffect, useState } from "react";
import { Bank } from "@mrgnlabs/marginfi-client-v2";
import { useTokenMetadata } from "./TokenMetadata";
import { makeBankInfo } from "~/api";
import { toast } from "react-toastify";
import { useProgram } from "~/context/Program";
import { BankInfo } from "~/types";

// @ts-ignore - Safe because context hook checks for null
const BanksContext = createContext<BanksState>();

interface BanksState {
  fetching: boolean;
  reload: () => Promise<void>;
  banks: Bank[];
  bankInfos: BankInfo[];
}

const BanksStateProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { mfiClientReadonly } = useProgram();
  const { tokenMetadataMap } = useTokenMetadata();

  const [fetching, setFetching] = useState<boolean>(true);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankInfos, setBankInfos] = useState<BankInfo[]>([]);

  const reload = useCallback(async () => {
    if (mfiClientReadonly === null) return;

    setFetching(true);
    try {
      await mfiClientReadonly.group.reload();
      const banks = [...mfiClientReadonly.group.banks.values()];
      setBanks(banks);
      setBankInfos(
        banks.map((bank) => {
          const tokenMetadata = tokenMetadataMap[bank.label];
          if (tokenMetadata === undefined) {
            throw new Error(`Token metadata not found for ${bank.label}`);
          }
          return makeBankInfo(bank, tokenMetadata);
        })
      );
    } catch (e: any) {
      toast.error(e);
    } finally {
      setFetching(false);
    }
  }, [mfiClientReadonly, tokenMetadataMap]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Periodically update all data
  useEffect(() => {
    reload();
    const id = setInterval(reload, 60_000);
    return () => clearInterval(id);
  }, [reload]);

  return (
    <BanksContext.Provider
      value={{
        fetching,
        reload,
        banks,
        bankInfos,
      }}
    >
      {children}
    </BanksContext.Provider>
  );
};

const useBanks = () => {
  const context = useContext(BanksContext);
  if (!context) {
    throw new Error("useBanksState must be used within a BanksStateProvider");
  }

  return context;
};

export { useBanks, BanksStateProvider };
