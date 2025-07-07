import React from "react";
import { Bank } from "@mrgnlabs/marginfi-client-v2";
import { useMetadata, useOracleData, useRawBanks } from "../react-query";
import { PublicKey } from "@solana/web3.js";
import { useEmode } from "./use-emode";
import { adjustBankWeightsWithEmodePairs } from "../../lib";

export function useBanks() {
  const { data: rawBanks, isLoading: isLoadingRawBanks, isError: isErrorRawBanks } = useRawBanks();
  const { data: oracleData, isLoading: isLoadingOracleData, isError: isErrorOracleData } = useOracleData();
  const { data: metadata, isLoading: isLoadingMetadata, isError: isErrorMetadata } = useMetadata();
  const { activeEmodePairs } = useEmode();

  const isLoading = isLoadingRawBanks || isLoadingOracleData || isLoadingMetadata;
  const isError = isErrorRawBanks || isErrorOracleData;

  const [banks, banksMap, originalWeights] = React.useMemo(() => {
    if (!rawBanks || !oracleData) return [];

    const banksWithoutEmode = rawBanks.map((bank) =>
      Bank.fromAccountParsed(
        bank.address,
        bank.data,
        oracleData?.pythFeedIdMap,
        metadata?.bankMetadataMap?.[bank.address.toBase58()]
      )
    );

    const { adjustedBanks: banks, originalWeights } = adjustBankWeightsWithEmodePairs(
      banksWithoutEmode,
      activeEmodePairs
    );

    const banksMap: Map<string, Bank> = banks.reduce((acc, bank) => {
      acc.set(bank.address.toBase58(), bank);
      return acc;
    }, new Map<string, Bank>());

    return [banks, banksMap, originalWeights];
  }, [metadata?.bankMetadataMap, oracleData, rawBanks, activeEmodePairs]);

  return {
    banks,
    banksMap,
    originalWeights,
    isLoading,
    isError,
  };
}
