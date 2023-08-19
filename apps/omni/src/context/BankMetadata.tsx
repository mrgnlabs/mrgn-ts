import React, { useEffect, useState } from "react";
import { FC, createContext, useContext } from "react";
import { loadBankMetadatas } from "~/utils";
import { BankMetadataMap } from "~/types";

// @ts-ignore - Safe because context hook checks for null
const BankMetadataContext = createContext<BankMetadataState>();

interface BankMetadataState {
  bankMetadataMap?: BankMetadataMap;
}

const BankMetadataProvider: FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [bankMetadataMap, setTokenMetadatMap] = useState<BankMetadataMap>();

  const fetchBankMetadata = async () => {
    const bankMetadatas = await loadBankMetadatas();
    setTokenMetadatMap(bankMetadatas);
  };

  useEffect(() => {
    fetchBankMetadata();
  }, []);

  return <BankMetadataContext.Provider value={{ bankMetadataMap }}>{children}</BankMetadataContext.Provider>;
};

const useBankMetadata = () => {
  const context = useContext(BankMetadataContext);
  if (!context) {
    throw new Error("useBankMetadata must be used within a BankMetadataProvider");
  }

  return context;
};

export { useBankMetadata, BankMetadataProvider };
