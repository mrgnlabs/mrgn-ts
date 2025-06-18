import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";

import { ActiveStakePoolMap, StakePoolMevMap, ValidatorRateData } from "@mrgnlabs/marginfi-client-v2";

import { useMetadata } from "./use-metadata.hooks";
import { fetchActiveStakePoolMap, fetchStakePoolMevMap, fetchValidatorRates } from "../../api";

export function useActiveStakePoolMap() {
  const { data: metadata, isSuccess: isSuccessMetadata, isError: isErrorMetadata } = useMetadata();

  return useQuery<ActiveStakePoolMap, Error>({
    queryKey: ["activeStakePools"],
    queryFn: async () => {
      if (!metadata?.bankMetadataMap) {
        throw new Error("Required data not available for fetching active stake pools");
      }

      const voteAccounts = Object.values(metadata.bankMetadataMap)
        .map((bank) => (bank.validatorVoteAccount ? new PublicKey(bank.validatorVoteAccount) : undefined))
        .filter((account) => account !== undefined);

      return await fetchActiveStakePoolMap(voteAccounts);
    },
    enabled: isSuccessMetadata && !isErrorMetadata,
    staleTime: 60_000, // 1 minute
    refetchInterval: 60_000,
    retry: (failureCount, error) => {
      // Don't retry if we have dependency errors
      if (isErrorMetadata) return false;
      // Only retry up to 2 times for other errors
      return failureCount < 2;
    },
  });
}

export function useStakePoolMevMap() {
  const { data: metadata, isSuccess: isSuccessMetadata, isError: isErrorMetadata } = useMetadata();

  return useQuery<StakePoolMevMap, Error>({
    queryKey: ["stakePoolMevMap"],
    queryFn: async () => {
      if (!metadata?.bankMetadataMap) {
        throw new Error("Required data not available for fetching stake pool mev map");
      }

      const voteAccounts = Object.values(metadata.bankMetadataMap)
        .map((bank) => (bank.validatorVoteAccount ? new PublicKey(bank.validatorVoteAccount) : undefined))
        .filter((account) => account !== undefined);

      return await fetchStakePoolMevMap(voteAccounts);
    },
    enabled: isSuccessMetadata && !isErrorMetadata,
    staleTime: 60_000, // 1 minute
    refetchInterval: 60_000,
    retry: (failureCount, error) => {
      // Don't retry if we have dependency errors
      if (isErrorMetadata) return false;
      // Only retry up to 2 times for other errors
      return failureCount < 2;
    },
  });
}

export function useValidatorRates() {
  const { data: metadata, isSuccess: isSuccessMetadata, isError: isErrorMetadata } = useMetadata();

  return useQuery<ValidatorRateData[], Error>({
    queryKey: ["validatorRates"],
    queryFn: async () => {
      if (!metadata?.bankMetadataMap) {
        throw new Error("Required data not available for fetching validator rates");
      }

      const voteAccounts = Object.values(metadata.bankMetadataMap)
        .map((bank) => (bank.validatorVoteAccount ? new PublicKey(bank.validatorVoteAccount) : undefined))
        .filter((account) => account !== undefined);

      return await fetchValidatorRates(voteAccounts);
    },
    enabled: isSuccessMetadata && !isErrorMetadata,
    staleTime: 60_000, // 1 minute
    refetchInterval: 60_000,
    retry: (failureCount, error) => {
      // Don't retry if we have dependency errors
      if (isErrorMetadata) return false;
      // Only retry up to 2 times for other errors
      return failureCount < 2;
    },
  });
}
