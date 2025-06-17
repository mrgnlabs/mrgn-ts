import React from "react";
import { useEmissionPriceMap, useMintData, useRawBanks } from "../react-query";
import { PublicKey } from "@solana/web3.js";
import { RawMintData } from "../../types";
import { MintData, MintDataMap } from "@mrgnlabs/marginfi-client-v2";
import { TOKEN_PROGRAM_ID } from "@mrgnlabs/mrgn-common";

export function useMintMap() {
  const { data: mintData, isLoading: isLoadingMintData, isError: isErrorMintData } = useMintData();
  const { data: rawBanks, isLoading: isLoadingRawBanks, isError: isErrorRawBanks } = useRawBanks();
  const {
    data: emissionPriceMap,
    isLoading: isLoadingEmissionPriceMap,
    isError: isErrorEmissionPriceMap,
  } = useEmissionPriceMap();

  const isLoading = isLoadingMintData || isLoadingRawBanks || isLoadingEmissionPriceMap;
  const isError = isErrorMintData || isErrorRawBanks || isErrorEmissionPriceMap;

  const mintMap: MintDataMap = React.useMemo(() => {
    if (!mintData || !rawBanks) return new Map<string, MintData>();

    const mintMap: Map<string, RawMintData> = mintData.reduce((acc, mint) => {
      acc.set(mint.mint.toBase58(), mint);
      return acc;
    }, new Map<string, RawMintData>());

    return rawBanks.reduce((acc, bank) => {
      const emissionMint = bank.data.emissionsMint;
      let emissionProgram: PublicKey | null = null;

      if (!emissionMint.equals(PublicKey.default)) {
        emissionProgram = emissionPriceMap?.[emissionMint.toBase58()].tokenProgram ?? null;
      }
      const mint = mintMap.get(bank.data.mint.toBase58());

      if (!mint) {
        console.error("Mint not found for bank", bank.address.toBase58());
        acc.set(bank.address.toBase58(), {
          mint: bank.data.mint,
          tokenProgram: TOKEN_PROGRAM_ID,
          feeBps: 0,
          emissionTokenProgram: null,
        });
        return acc;
      }

      return acc.set(bank.address.toBase58(), {
        mint: mint.mint,
        tokenProgram: mint.tokenProgram,
        feeBps: 0,
        emissionTokenProgram: emissionProgram,
      });
    }, new Map<string, MintData>());
  }, [mintData, rawBanks, emissionPriceMap]);

  return {
    mintMap,
    isLoading,
    isError,
  };
}
