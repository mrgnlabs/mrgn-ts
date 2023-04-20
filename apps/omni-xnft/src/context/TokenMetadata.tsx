import React, { useMemo } from "react";
import { FC, createContext, useContext } from "react";
import { TokenMetadataMap } from "~/types";
import { loadTokenMetadatas } from "@mrgnlabs/omni-common";

// @ts-ignore - Safe because context hook checks for null
const TokenMetadataContext = createContext<TokenMetadataState>();

interface TokenMetadataState {
  tokenMetadataMap: TokenMetadataMap;
}

const TokenMetadataProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const tokenMetadataMap = useMemo(() => loadTokenMetadatas(), []);

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
