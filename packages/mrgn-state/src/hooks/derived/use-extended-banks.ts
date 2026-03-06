import { useBanks } from "./use-banks";
import { useEmissionPriceMap, useMarginfiAccount, useMetadata, useOracleData, useUserBalances } from "../react-query";
import { useEmode } from "./use-emode";
import React from "react";
import BigNumber from "bignumber.js";
import { makeExtendedBankInfo } from "../../lib/bank.utils";
import { MarginfiAccount } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "../../types";

// Module-level cache to avoid recomputing across multiple component instances
let _extBanksCache: {
  banks: any;
  banksMap: any;
  metadata: any;
  oracleData: any;
  userBalances: any;
  emissionPriceMap: any;
  marginfiAccount: any;
  emodeImpacts: any;
  originalWeights: any;
  result: ExtendedBankInfo[];
} | null = null;

export function useExtendedBanks() {
  const { banks, banksMap, originalWeights, isLoading: isLoadingRawBanks, isError: isErrorRawBanks } = useBanks();
  const {
    data: metadata,
    isSuccess: isSuccessMetadata,
    isLoading: isLoadingMetadata,
    isError: isErrorMetadata,
  } = useMetadata();
  const {
    data: oracleData,
    isSuccess: isSuccessOracleData,
    isLoading: isLoadingOracleData,
    isError: isErrorOracleData,
  } = useOracleData();
  const {
    data: marginfiAccount,
    isSuccess: isSuccessMarginfiAccount,
    isLoading: isLoadingMarginfiAccount,
    isError: isErrorMarginfiAccount,
  } = useMarginfiAccount();
  const {
    data: userBalances,
    isSuccess: isSuccessUserBalances,
    isLoading: isLoadingUserBalances,
    isError: isErrorUserBalances,
  } = useUserBalances();
  const {
    data: emissionPriceMap,
    isSuccess: isSuccessEmissionPriceMap,
    isLoading: isLoadingEmissionPriceMap,
    isError: isErrorEmissionPriceMap,
  } = useEmissionPriceMap();
  const { activeEmodePairs, emodePairs, emodeImpacts, isLoading: isLoadingEmode, isError: isErrorEmode } = useEmode();

  const extendedBanks = React.useMemo(() => {
    if (
      !banks ||
      !banksMap ||
      !metadata ||
      !oracleData ||
      !userBalances ||
      !emissionPriceMap ||
      !activeEmodePairs ||
      !emodePairs
    )
      return [];

    // Check module-level cache — avoids recomputation when multiple components
    // call useExtendedBanks() with the same underlying data
    if (
      _extBanksCache &&
      _extBanksCache.banks === banks &&
      _extBanksCache.banksMap === banksMap &&
      _extBanksCache.metadata === metadata &&
      _extBanksCache.oracleData === oracleData &&
      _extBanksCache.userBalances === userBalances &&
      _extBanksCache.emissionPriceMap === emissionPriceMap &&
      _extBanksCache.marginfiAccount === marginfiAccount &&
      _extBanksCache.emodeImpacts === emodeImpacts &&
      _extBanksCache.originalWeights === originalWeights
    ) {
      return _extBanksCache.result;
    }

    // Hoist outside map — previously called once per bank (~50+ times)
    const parsedMarginfiAccount = marginfiAccount ? MarginfiAccount.fromAccountType(marginfiAccount) : null;

    const result = banks.map((bank) => {
      const emissionTokenPriceData = emissionPriceMap[bank.emissionsMint.toBase58()];

      let oraclePrice = oracleData.oracleMap.get(bank.address.toBase58());
      let tokenAccount = userBalances.ataList.find((ata) => ata.mint.toBase58() === bank.mint.toBase58());
      if (!tokenAccount) {
        console.error("User data not found for bank", bank.address.toBase58());
        tokenAccount = {
          mint: bank.mint,
          created: false,
          balance: 0,
        };
      }
      if (!oraclePrice) {
        oraclePrice = {
          priceRealtime: {
            price: new BigNumber(0),
            confidence: new BigNumber(0),
            lowestPrice: new BigNumber(0),
            highestPrice: new BigNumber(0),
          },
          priceWeighted: {
            price: new BigNumber(0),
            confidence: new BigNumber(0),
            lowestPrice: new BigNumber(0),
            highestPrice: new BigNumber(0),
          },
          timestamp: new BigNumber(0),
        };

        console.error("Oracle price not found for bank", bank.address.toBase58());
      }
      const bankMetadata = metadata.bankMetadataMap[bank.address.toBase58()];
      let tokenMetadata = metadata.tokenMetadataMap[bankMetadata.tokenSymbol];

      if (!bankMetadata || !tokenMetadata) {
        tokenMetadata = {
          name: "Unknown",
          symbol: "Unknown",
          icon: "",
          address: "",
          decimals: 0,
        };
        console.error("Bank metadata or token metadata not found for bank", bank.address.toBase58());
      }
      return makeExtendedBankInfo(
        tokenMetadata,
        bank,
        oraclePrice,
        emissionTokenPriceData,
        {
          nativeSolBalance: userBalances.nativeSolBalance,
          tokenAccount,
          marginfiAccount: parsedMarginfiAccount,
          banks: banksMap,
          oraclePrices: oracleData.oracleMap,
        },
        false,
        originalWeights?.[bank.address.toBase58()],
        emodeImpacts || undefined
      );
    });

    // Update module-level cache
    _extBanksCache = {
      banks,
      banksMap,
      metadata,
      oracleData,
      userBalances,
      emissionPriceMap,
      marginfiAccount,
      emodeImpacts,
      originalWeights,
      result,
    };

    return result;
  }, [
    banks,
    banksMap,
    metadata,
    oracleData,
    userBalances,
    emissionPriceMap,
    activeEmodePairs,
    emodePairs,
    emodeImpacts,
    marginfiAccount,
    originalWeights,
  ]);

  const isLoading =
    isLoadingRawBanks ||
    isLoadingMetadata ||
    isLoadingOracleData ||
    isLoadingMarginfiAccount ||
    isLoadingUserBalances ||
    isLoadingEmissionPriceMap ||
    isLoadingEmode;

  const isError =
    isErrorRawBanks ||
    isErrorMetadata ||
    isErrorOracleData ||
    isErrorMarginfiAccount ||
    isErrorUserBalances ||
    isErrorEmissionPriceMap ||
    isErrorEmode;

  const isSuccess =
    isSuccessMetadata &&
    isSuccessOracleData &&
    isSuccessUserBalances &&
    isSuccessEmissionPriceMap &&
    !isLoadingEmode &&
    !isErrorEmode;

  return {
    extendedBanks,
    isLoading,
    isError,
    isSuccess,
  };
}
