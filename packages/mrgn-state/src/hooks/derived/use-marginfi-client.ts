import React from "react";
import { getConfig } from "../../config";
import { useMarginfiGroup, useMarginfiLuts, useMetadata, useMintData, useOracleData } from "../react-query";
import { useBanks } from "./use-banks";
import { Bank, MarginfiClient, MarginfiGroup, MintData } from "@mrgnlabs/marginfi-client-v2";

export function useMarginfiClient() {
  const { data: marginfiGroup, isLoading: isLoadingGroup, isError: isErrorGroup } = useMarginfiGroup();
  const { banks, isLoading: isLoadingBanks, isError: isErrorBanks } = useBanks();
  const { data: oracleData, isLoading: isLoadingOracleData, isError: isErrorOracleData } = useOracleData();
  const { data: metadata, isLoading: isLoadingMetadata, isError: isErrorMetadata } = useMetadata();
  const { data: mintData, isLoading: isLoadingMintData, isError: isErrorMintData } = useMintData();
  const { data: luts, isLoading: isLoadingLuts, isError: isErrorLuts } = useMarginfiLuts();

  const isLoading = isLoadingGroup || isLoadingBanks;
  const isError = isErrorGroup || isErrorBanks;

  const config = getConfig();
  const program = config.program;
  const mfiConfig = config.mrgnConfig;
  const wallet = {} as any;

  const marginfiClient = React.useMemo(() => {
    if (!marginfiGroup || !banks || !oracleData || !mintData || !metadata || !luts) return undefined;

    const banksMap: Map<string, Bank> = banks.reduce((acc, bank) => {
      acc.set(bank.address.toBase58(), bank);
      return acc;
    }, new Map<string, Bank>());

    const marginfiGroupClass = new MarginfiGroup(marginfiGroup.admin, marginfiGroup.address);

    const marginfiClient = new MarginfiClient(
      mfiConfig,
      program,
      wallet,
      false,
      marginfiGroupClass,
      banksMap,
      oracleData.oracleMap,
      mintData.mintMap,
      metadata.bankMetadataMap,
      luts
    );
    return marginfiClient;
  }, [marginfiGroup, banks, oracleData, mintData, metadata, luts]);
}
