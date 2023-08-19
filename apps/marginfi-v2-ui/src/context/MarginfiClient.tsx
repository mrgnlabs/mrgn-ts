import React, { createContext, FC, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import config from "~/config";
import { LipClient } from "@mrgnlabs/lip-client";
import { buildEmissionsPriceMap, makeBankInfo } from "~/api";
import { useBankMetadata } from "./BankMetadata";
import { useTokenMetadata } from "./TokenMetadata";
import { BankInfo, TokenPrice } from "~/types";

// @ts-ignore - Safe because context hook checks for null
const MarginfiClientContext = createContext<MarginfiClientState>();

interface MarginfiClientState {
  reload: () => Promise<void>;
  mfiClient: MarginfiClient | null;
  bankInfos: BankInfo[];
}

const MarginfiClientFC: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const { tokenMetadataMap } = useTokenMetadata();
  const { bankMetadataMap } = useBankMetadata();

  const [mfiClient, setMfiClient] = useState<MarginfiClient | null>(null);
  const [bankInfos, setBankInfos] = useState<BankInfo[]>([]);

  const reload = useCallback(async () => {
    const mfiClient = await MarginfiClient.fetch(config.mfiConfig, anchorWallet ?? ({} as any), connection);
    setMfiClient(mfiClient);
  }, [anchorWallet, connection]);

  const buildBankInfos = useCallback(async () => {
    if (mfiClient === null || !tokenMetadataMap || !bankMetadataMap) return [];

    let bankInfos: BankInfo[];
    try {
      const banks = [...mfiClient.group.banks.values()];
      const priceMap = await buildEmissionsPriceMap(banks, connection);

      bankInfos = banks.map((bank) => {
        const bankMetadata = bankMetadataMap[bank.publicKey.toBase58()];
        if (bankMetadata === undefined) {
          throw new Error(`Bank metadata not found for ${bank.publicKey.toBase58()}`);
        }
        const tokenMetadata = findMetadataInsensitive(tokenMetadataMap, bankMetadata.tokenSymbol);
        if (tokenMetadata === undefined) {
          throw new Error(`Token metadata not found for ${bankMetadata.tokenSymbol}`);
        }
        const tokenPriceData: TokenPrice = { price: bank.getPrice(), decimals: bank.mintDecimals };
        const emissionTokenPriceData = priceMap[bank.emissionsMint.toBase58()];
        return makeBankInfo(bank, tokenMetadata, bankMetadata.tokenSymbol, tokenPriceData, emissionTokenPriceData);
      });
    } catch (e: any) {
      console.log(e);
      bankInfos = [];
    }
    return bankInfos;
  }, [mfiClient, tokenMetadataMap, bankMetadataMap, connection]);

  useEffect(() => {
    buildBankInfos().then(setBankInfos).catch(console.error);
  }, [buildBankInfos]);

  return (
    <MarginfiClientContext.Provider
      value={{
        reload,
        mfiClient,
        bankInfos,
      }}
    >
      {children}
    </MarginfiClientContext.Provider>
  );
};

const useMarginfiClient = () => {
  const context = useContext(MarginfiClientContext);
  if (!context) {
    throw new Error("MarginfiClientState must be used within a MarginfiClientStateProvider");
  }

  return context;
};

const MarginfiClientProvider = React.memo(MarginfiClientFC);

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

export { useMarginfiClient, MarginfiClientProvider };
