import React from "react";
import { Bank } from "@mrgnlabs/marginfi-client-v2";
import { useMetadata, useOracleData, useRawBanks, useLstRates } from "../react-query";
import { PublicKey } from "@solana/web3.js";
import { useEmode } from "./use-emode";
import { adjustBankWeightsWithEmodePairs } from "../../lib";
import { LstRatesMap } from "../../types";

export function useBanks() {
  const { data: rawBanks, isLoading: isLoadingRawBanks, isError: isErrorRawBanks } = useRawBanks();
  const { data: oracleData, isLoading: isLoadingOracleData, isError: isErrorOracleData } = useOracleData();
  const { data: metadata, isLoading: isLoadingMetadata, isError: isErrorMetadata } = useMetadata();
  const { data: lstRates, isLoading: isLoadingLstRates, isError: isErrorLstRates } = useLstRates();
  const { activeEmodePairs } = useEmode();

  const isLoading = isLoadingRawBanks || isLoadingOracleData || isLoadingMetadata || isLoadingLstRates;
  const isError = isErrorRawBanks || isErrorOracleData || isErrorLstRates;

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
    lstRates,
    isLoading,
    isError,
  };
}
