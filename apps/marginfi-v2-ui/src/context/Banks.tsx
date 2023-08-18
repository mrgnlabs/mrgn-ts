import React, { createContext, FC, useCallback, useContext, useEffect, useState } from "react";
import { Bank } from "@mrgnlabs/marginfi-client-v2";
import { useTokenMetadata } from "./TokenMetadata";
import { buildEmissionsPriceMap, makeBankInfo } from "~/api";
import { toast } from "react-toastify";
import { useProgram } from "~/context/Program";
import { BankInfo } from "~/types";
import { useConnection } from "@solana/wallet-adapter-react";
import { useBankMetadata } from "./BankMetadata";

// @ts-ignore - Safe because context hook checks for null
const BanksContext = createContext<BanksState>();

interface BanksState {
  fetching: boolean;
  reload: () => Promise<void>;
  bankInfos: BankInfo[];
}

const BanksStateProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { mfiClient } = useProgram();
  const { tokenMetadataMap } = useTokenMetadata();
  const { bankMetadataMap } = useBankMetadata();
  const { connection } = useConnection();

  const [fetching, setFetching] = useState<boolean>(true);
  const [bankInfos, setBankInfos] = useState<BankInfo[]>([]);

  const findMetadataInsensitive = (tokenMetadataMap: any, tokenSymbol: string) => {
    const lowerCaseLabel = tokenSymbol.toLowerCase();
    for (let key in tokenMetadataMap) {
      if (key.toLowerCase() === lowerCaseLabel) {
        return tokenMetadataMap[key];
      }
    }
    // If no match is found, throw an error
    throw new Error(`Token metadata not found for ${tokenSymbol}`);
  };

  const reload = useCallback(async () => {
    if (mfiClient === null || !tokenMetadataMap || !bankMetadataMap) return;

    setFetching(true);
    try {
      await mfiClient.group.reload();
      const banks = [...mfiClient.group.banks.values()];
      const priceMap = await buildEmissionsPriceMap(banks, connection);

      setBankInfos(
        banks.map((bank) => {
          const bankMetadata = bankMetadataMap[bank.publicKey.toBase58()];
          if (bankMetadata === undefined) {
            throw new Error(`Bank metadata not found for ${bank.publicKey.toBase58()}`);
          }
          const tokenMetadata = findMetadataInsensitive(tokenMetadataMap, bankMetadata.tokenSymbol);
          if (tokenMetadata === undefined) {
            throw new Error(`Token metadata not found for ${bankMetadata.tokenSymbol}`);
          }
          return makeBankInfo(bank, tokenMetadata, priceMap, bankMetadata.tokenSymbol);
        })
      );
    } catch (e: any) {
      toast.error(e);
    } finally {
      setFetching(false);
    }
  }, [connection, mfiClient, tokenMetadataMap, bankMetadataMap]);

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
