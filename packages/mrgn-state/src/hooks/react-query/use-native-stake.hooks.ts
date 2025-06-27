import { PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";

import {
  ActiveStakePoolMap,
  StakePoolMevMap,
  ValidatorRateData,
  ValidatorStakeGroup,
} from "@mrgnlabs/marginfi-client-v2";

import { useMetadata } from "./use-metadata.hooks";
import { fetchActiveStakePoolMap, fetchStakePoolMevMap, fetchUserStakeAccounts, fetchValidatorRates } from "../../api";
import { useWalletAddress } from "../../context";

export function useActiveStakePoolMap() {
  const { data: metadata, isSuccess: isSuccessMetadata, isError: isErrorMetadata } = useMetadata();

  return useQuery<ActiveStakePoolMap, Error>({
    queryKey: ["activeStakePools"],
    queryFn: async () => {
      if (!metadata?.bankMetadataMap) {
        throw new Error("Required data not available for fetching active stake pools");
      }

      const voteAccounts: PublicKey[] = Object.values(metadata.bankMetadataMap)
        .map((bank) => (bank.validatorVoteAccount ? new PublicKey(bank.validatorVoteAccount) : undefined))
        .filter((account): account is PublicKey => account !== undefined);

      return await fetchActiveStakePoolMap(voteAccounts);
    },
    enabled: isSuccessMetadata && !isErrorMetadata,
    staleTime: 5 * 60_000, // 5 minutes
    refetchInterval: 5 * 60_000,
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

      const voteAccounts: PublicKey[] = Object.values(metadata.bankMetadataMap)
        .map((bank) => (bank.validatorVoteAccount ? new PublicKey(bank.validatorVoteAccount) : undefined))
        .filter((account): account is PublicKey => account !== undefined);

      return await fetchStakePoolMevMap(voteAccounts);
    },
    enabled: isSuccessMetadata && !isErrorMetadata,
    staleTime: 5 * 60_000, // 5 minutes
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

      const voteAccounts: PublicKey[] = Object.values(metadata.bankMetadataMap)
        .map((bank) => (bank.validatorVoteAccount ? new PublicKey(bank.validatorVoteAccount) : undefined))
        .filter((account): account is PublicKey => account !== undefined);

      return await fetchValidatorRates(voteAccounts);
    },
    enabled: isSuccessMetadata && !isErrorMetadata,
    staleTime: 10 * 60_000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry if we have dependency errors
      if (isErrorMetadata) return false;
      // Only retry up to 2 times for other errors
      return failureCount < 2;
    },
  });
}

export function useUserStakeAccounts() {
  const address = useWalletAddress();
  return useQuery<ValidatorStakeGroup[], Error>({
    queryKey: ["userStakeAccounts", address?.toBase58()],
    queryFn: async () => {
      return await fetchUserStakeAccounts(address);
    },
    staleTime: 2 * 60_000, // 2 minutes
    refetchInterval: 2 * 60_000,
    retry: 2,
  });
}
