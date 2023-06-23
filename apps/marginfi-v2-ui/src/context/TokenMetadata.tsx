import React, { useMemo, useEffect, useState } from "react";
import { FC, createContext, useContext } from "react";
import { loadTokenMetadatas } from "~/utils";
import { TokenMetadataMap } from "~/types";

// @ts-ignore - Safe because context hook checks for null
const TokenMetadataContext = createContext<TokenMetadataState>();

interface TokenMetadataState {
  tokenMetadataMap?: TokenMetadataMap;
}

const TokenMetadataProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [tokenMetadataMap, setTokenMetadatMap] = useState<TokenMetadataMap>();

  const fetchTokenMetadata = async () => {
    const tokens = await loadTokenMetadatas();
    setTokenMetadatMap(tokens);
  };

  useEffect(() => {
    fetchTokenMetadata();
  }, []);

  return <TokenMetadataContext.Provider value={{ tokenMetadataMap }}>{children}</TokenMetadataContext.Provider>;
};

const useTokenMetadata = () => {
  const context = useContext(TokenMetadataContext);
  if (!context) {
    throw new Error("useTokenMetadata must be used within a TokenMetadataProvider");
  }

  return context;
};

export { useTokenMetadata, TokenMetadataProvider };
