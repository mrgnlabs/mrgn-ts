import React, { createContext, FC, useCallback, useContext, useEffect, useState } from "react";
import { Bank, MarginfiClientReadonly } from "@mrgnlabs/marginfi-client-v2";
import { useConnection } from "@solana/wallet-adapter-react";
import { toast } from "react-toastify";
import { buildEmissionsPriceMap, makeBankInfo } from "~/api";
import { useProgram } from "~/context/Program";
import { BankInfo, TokenMetadata } from "~/types";
import { useDebounce } from "~/hooks";
import { loadTokenMetadatas } from "~/utils";

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

  const { connection } = useConnection();

  const [fetching, setFetching] = useState<boolean>(true);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [bankInfos, setBankInfos] = useState<BankInfo[]>([]);
  const [tokenMetadataMap, setTokenMetadataMap] = useState<{
    [symbol: string]: TokenMetadata;
  }>();

  const debouncedBanksMfiClient = useDebounce<MarginfiClientReadonly | null>(mfiClientReadonly, 500);

  const reload = useCallback(async () => {
    if (mfiClientReadonly === null) return;

    setFetching(true);
    try {
      await mfiClientReadonly.group.reload();
      const banks = [...mfiClientReadonly.group.banks.values()];
      setBanks(banks);
      const supportedMints = banks.map((bank) => bank.mint);

      const _tokenMetadataMap = tokenMetadataMap ?? (await loadTokenMetadatas(supportedMints, connection));
      tokenMetadataMap ?? setTokenMetadataMap(_tokenMetadataMap);

      const priceMap = await buildEmissionsPriceMap(banks, connection);
      setBankInfos(
        banks
          .filter((b) => b.label !== "Unknown")
          .map((bank) => {
            const tokenMetadata = _tokenMetadataMap[bank.label];
            if (tokenMetadata === undefined) {
              throw new Error(`Token metadata not found for ${bank.label}`);
            }
            return makeBankInfo(bank, tokenMetadata, priceMap);
          })
      );
    } catch (e: any) {
      toast.error(e);
    } finally {
      setFetching(false);
    }
  }, [debouncedBanksMfiClient, tokenMetadataMap, setTokenMetadataMap]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Periodically update all data
  useEffect(() => {
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
