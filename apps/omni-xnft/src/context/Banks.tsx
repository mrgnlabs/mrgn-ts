import React, { createContext, FC, useCallback, useContext, useEffect, useState } from "react";
import { Bank, PriceBias } from "@mrgnlabs/marginfi-client-v2";
import { useTokenMetadata } from "./TokenMetadata";
import { toast } from "react-toastify";
import { useProgram } from "~/context/Program";
import { nativeToUi } from "@mrgnlabs/mrgn-common";
import { BankInfo, TokenMetadata } from "~types";

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

function makeBankInfo(bank: Bank, tokenMetadata: TokenMetadata): BankInfo {
  const { lendingRate, borrowingRate } = bank.getInterestRates();
  const totalPoolDeposits = nativeToUi(bank.totalAssets, bank.mintDecimals);
  const totalPoolBorrows = nativeToUi(bank.totalLiabilities, bank.mintDecimals);
  const liquidity = totalPoolDeposits - totalPoolBorrows;
  const utilizationRate = totalPoolDeposits > 0 ? (totalPoolBorrows / totalPoolDeposits) * 100 : 0;

  return {
    address: bank.publicKey,
    tokenIcon: tokenMetadata.icon,
    tokenName: bank.label,
    tokenPrice: bank.getPrice(PriceBias.None).toNumber(),
    tokenMint: bank.mint,
    tokenMintDecimals: bank.mintDecimals,
    lendingRate: lendingRate.toNumber(),
    borrowingRate: borrowingRate.toNumber(),
    totalPoolDeposits,
    totalPoolBorrows,
    availableLiquidity: liquidity,
    utilizationRate,
    bank,
  };
}

export { useBanks, BanksStateProvider };
