import { PublicKey } from "@solana/web3.js";
import { useBanks } from "./use-banks";
import { useEmissionPriceMap, useMarginfiAccount, useMetadata, useOracleData, useUserBalances } from "../react-query";
import { useEmode } from "./use-emode";
import React from "react";
import BigNumber from "bignumber.js";
import { makeExtendedBankInfo } from "../../lib/bank.utils";
import { MarginfiAccount } from "@mrgnlabs/marginfi-client-v2";

export function useExtendedBanks(user?: PublicKey) {
  const { banks, banksMap, originalWeights, isLoading: isLoadingRawBanks, isError: isErrorRawBanks } = useBanks(user);
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
  } = useMarginfiAccount(user);
  const {
    data: userBalances,
    isSuccess: isSuccessUserBalances,
    isLoading: isLoadingUserBalances,
    isError: isErrorUserBalances,
  } = useUserBalances(user);
  const {
    data: emissionPriceMap,
    isSuccess: isSuccessEmissionPriceMap,
    isLoading: isLoadingEmissionPriceMap,
    isError: isErrorEmissionPriceMap,
  } = useEmissionPriceMap();
  const {
    activeEmodePairs,
    emodePairs,
    emodeImpacts,
    isLoading: isLoadingEmode,
    isError: isErrorEmode,
  } = useEmode(user);

  // Create stable dependency values to prevent unnecessary recalculations
  const userKey = user?.toBase58();
  const accountKey = marginfiAccount?.address?.toBase58();
  const bankMetadataMap = metadata?.bankMetadataMap;
  const tokenMetadataMap = metadata?.tokenMetadataMap;
  
  const stableDeps = React.useMemo(() => {
    return {
      banksLength: banks?.length ?? 0,
      userKey: userKey ?? null,
      accountKey: accountKey ?? null,
      solBalance: userBalances?.nativeSolBalance ?? 0,
      ataCount: userBalances?.ataList?.length ?? 0,
      oracleSize: oracleData?.oracleMap?.size ?? 0,
      metadataBankCount: Object.keys(bankMetadataMap || {}).length,
      metadataTokenCount: Object.keys(tokenMetadataMap || {}).length,
      emissionCount: Object.keys(emissionPriceMap || {}).length,
      activeEmodeCount: activeEmodePairs?.length ?? 0,
      emodeCount: emodePairs?.length ?? 0,
      emodeImpactCount: Object.keys(emodeImpacts || {}).length,
      originalWeightsCount: Object.keys(originalWeights || {}).length,
    };
  }, [
    banks?.length,
    userKey,
    accountKey,
    userBalances?.nativeSolBalance,
    userBalances?.ataList?.length,
    oracleData?.oracleMap?.size,
    bankMetadataMap,
    tokenMetadataMap,
    emissionPriceMap,
    activeEmodePairs?.length,
    emodePairs?.length,
    emodeImpacts,
    originalWeights,
  ]);

  const extendedBanks = React.useMemo(() => {
    if (
      !banks ||
      !banksMap ||
      !metadata ||
      !oracleData ||
      !userBalances ||
      !emissionPriceMap ||
      !activeEmodePairs ||
      !emodePairs ||
      !emodeImpacts
    )
      return [];

    return banks.map((bank) => {
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
          marginfiAccount: marginfiAccount ? MarginfiAccount.fromAccountType(marginfiAccount) : null,
          banks: banksMap,
          oraclePrices: oracleData.oracleMap,
        },
        false,
        originalWeights?.[bank.address.toBase58()],
        emodeImpacts
      );
    });
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
    isSuccessMarginfiAccount &&
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
