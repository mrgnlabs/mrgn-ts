import React from "react";
import { AnchorProvider, Program } from "@coral-xyz/anchor";

import { MarginfiClient, MarginfiGroup, MarginfiProgram } from "@mrgnlabs/marginfi-client-v2";
import { Wallet } from "@mrgnlabs/mrgn-common";

import { getConfig } from "../../config";
import { useMarginfiGroup, useMarginfiLuts, useMetadata, useOracleData } from "../react-query";
import { useBanks } from "./use-banks";
import { useMintMap } from "./use-mint-map";
import { PublicKey } from "@solana/web3.js";

export function useMarginfiClient(wallet?: Wallet) {
  const { data: marginfiGroup, isLoading: isLoadingGroup, isError: isErrorGroup } = useMarginfiGroup();
  const { data: oracleData, isLoading: isLoadingOracleData, isError: isErrorOracleData } = useOracleData();
  const { data: metadata, isLoading: isLoadingMetadata, isError: isErrorMetadata } = useMetadata();
  const { data: luts, isLoading: isLoadingLuts, isError: isErrorLuts } = useMarginfiLuts();

  const { mintMap, isLoading: isLoadingMintMap, isError: isErrorMintMap } = useMintMap();
  const { banks, banksMap, isLoading: isLoadingBanks, isError: isErrorBanks } = useBanks();

  const isLoading =
    isLoadingGroup || isLoadingBanks || isLoadingMintMap || isLoadingLuts || isLoadingOracleData || isLoadingMetadata;
  const isError = isErrorGroup || isErrorBanks || isErrorMintMap || isErrorLuts || isErrorOracleData || isErrorMetadata;

  const config = getConfig();
  const program = config.program;
  const mfiConfig = config.mrgnConfig;

  const marginfiClient = React.useMemo(() => {
    if (!marginfiGroup || !banks || !banksMap || !oracleData || !mintMap || !metadata || !luts) return undefined;

    let finalProgram: MarginfiProgram = program;

    let finalWallet: Wallet;

    if (wallet) {
      const provider = new AnchorProvider(program.provider.connection, wallet, {
        ...AnchorProvider.defaultOptions(),
        commitment: program.provider.connection.commitment ?? AnchorProvider.defaultOptions().commitment,
        ...program.provider.opts,
      });

      const idl = { ...program.idl, address: program.programId.toBase58() };

      finalProgram = new Program(idl, provider) as any as MarginfiProgram;
      finalWallet = wallet;
    } else {
      finalWallet = {
        publicKey: PublicKey.default,
        signTransaction: () => new Promise(() => {}),
        signAllTransactions: () => new Promise(() => {}),
      };
    }

    const marginfiGroupClass = new MarginfiGroup(marginfiGroup.admin, marginfiGroup.address);
    const preloadedBankAddresses = banks.map((bank) => bank.address);

    const marginfiClient = new MarginfiClient(
      mfiConfig,
      finalProgram,
      finalWallet,
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
  }, [marginfiGroup, banks, banksMap, oracleData, mintMap, metadata, luts, program, wallet, mfiConfig]);

  return {
    marginfiClient: marginfiClient ?? null,
    isLoading,
    isError,
  };
}
