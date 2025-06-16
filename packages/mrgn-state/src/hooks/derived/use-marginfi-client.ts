import React from "react";
import { getConfig } from "../../config";
import { useMarginfiGroup, useMarginfiLuts, useMetadata, useMintData, useOracleData } from "../react-query";
import { useBanks } from "./use-banks";
import { Bank, MarginfiClient, MarginfiGroup, MintData } from "@mrgnlabs/marginfi-client-v2";
import { useMintMap } from "./use-mint-map.hooks";

export function useMarginfiClient() {
  const { data: marginfiGroup, isLoading: isLoadingGroup, isError: isErrorGroup } = useMarginfiGroup();
  const { data: oracleData, isLoading: isLoadingOracleData, isError: isErrorOracleData } = useOracleData();
  const { data: metadata, isLoading: isLoadingMetadata, isError: isErrorMetadata } = useMetadata();
  const { data: luts, isLoading: isLoadingLuts, isError: isErrorLuts } = useMarginfiLuts();

  const { mintMap, isLoading: isLoadingMintMap, isError: isErrorMintMap } = useMintMap();
  const { banks, isLoading: isLoadingBanks, isError: isErrorBanks } = useBanks();

  const isLoading =
    isLoadingGroup || isLoadingBanks || isLoadingMintMap || isLoadingLuts || isLoadingOracleData || isLoadingMetadata;
  const isError = isErrorGroup || isErrorBanks || isErrorMintMap || isErrorLuts || isErrorOracleData || isErrorMetadata;

  const config = getConfig();
  const program = config.program;
  const mfiConfig = config.mrgnConfig;

  console.log({ isErrorGroup, isErrorBanks, isErrorMintMap, isErrorLuts, isErrorOracleData, isErrorMetadata });

  console.log({ marginfiGroup, banks, oracleData, mintMap, metadata, luts });
  const marginfiClient = React.useMemo(() => {
    if (!marginfiGroup || !banks || !oracleData || !mintMap || !metadata || !luts) return undefined;

    const banksMap: Map<string, Bank> = banks.reduce((acc, bank) => {
      acc.set(bank.address.toBase58(), bank);
      return acc;
    }, new Map<string, Bank>());

    const marginfiGroupClass = new MarginfiGroup(marginfiGroup.admin, marginfiGroup.address);
    const preloadedBankAddresses = banks.map((bank) => bank.address);

    const marginfiClient = new MarginfiClient(
      mfiConfig,
      program,
      {} as any,
      false,
      marginfiGroupClass,
      banksMap,
      oracleData.oracleMap,
      mintMap,
      oracleData.pythFeedIdMap,
      luts,
      preloadedBankAddresses,
      metadata.bankMetadataMap
    );
    return marginfiClient;
  }, [marginfiGroup, banks, oracleData, mintMap, metadata, luts, mfiConfig, program]);

  return {
    marginfiGroup,
    banks,
    oracleData,
    mintMap,
    metadata,
    luts,
    marginfiClient,
    isLoading,
    isError,
  };
}
