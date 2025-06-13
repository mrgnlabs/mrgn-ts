import React from "react";
import { Bank } from "@mrgnlabs/marginfi-client-v2";
import { useMetadata, useOracleData, useRawBanks } from "../react-query";

export function useBanks() {
  const { data: rawBanks, isLoading: isLoadingRawBanks, isError: isErrorRawBanks } = useRawBanks();
  const { data: oracleData, isLoading: isLoadingOracleData, isError: isErrorOracleData } = useOracleData();
  const { data: metadata, isLoading: isLoadingMetadata, isError: isErrorMetadata } = useMetadata();

  const isLoading = isLoadingRawBanks || isLoadingOracleData || isLoadingMetadata;
  const isError = isErrorRawBanks || isErrorOracleData;

  const banks = React.useMemo(() => {
    if (!rawBanks || !oracleData) return [];

    return rawBanks.map((bank) =>
      Bank.fromAccountParsed(
        bank.address,
        bank.data,
        oracleData?.pythFeedIdMap,
        metadata?.bankMetadataMap?.[bank.address.toBase58()]
      )
    );
  }, [metadata?.bankMetadataMap, oracleData, rawBanks]);

  return {
    banks,
    isLoading,
    isError,
  };
}
