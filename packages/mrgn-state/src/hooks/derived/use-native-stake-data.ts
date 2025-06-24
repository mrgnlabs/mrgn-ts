import React from "react";
import { PublicKey } from "@solana/web3.js";
import { StakePoolMetadata } from "../../types";
import { useActiveStakePoolMap, useMetadata, useStakePoolMevMap, useValidatorRates } from "../react-query";

export function useNativeStakeData() {
  const { data: metadata, isSuccess: isSuccessMetadata, isError: isErrorMetadata } = useMetadata();
  const {
    data: activeStakePoolMap,
    isSuccess: isSuccessActiveStakePoolMap,
    isError: isErrorActiveStakePoolMap,
  } = useActiveStakePoolMap();
  const {
    data: stakePoolMevMap,
    isSuccess: isSuccessStakePoolMevMap,
    isError: isErrorStakePoolMevMap,
  } = useStakePoolMevMap();
  const {
    data: validatorRates,
    isSuccess: isSuccessValidatorRates,
    isError: isErrorValidatorRates,
  } = useValidatorRates();

  const allDataReady =
    isSuccessMetadata &&
    !isErrorMetadata &&
    isSuccessActiveStakePoolMap &&
    !isErrorActiveStakePoolMap &&
    isSuccessStakePoolMevMap &&
    !isErrorStakePoolMevMap &&
    isSuccessValidatorRates &&
    !isErrorValidatorRates;

  const stakePoolMetadataMap: Map<string, StakePoolMetadata> = React.useMemo(() => {
    if (!allDataReady || !metadata?.bankMetadataMap || !activeStakePoolMap || !stakePoolMevMap || !validatorRates) {
      return new Map();
    }

    const stakePoolMap = new Map<string, StakePoolMetadata>();

    // Iterate through all banks that have validator vote accounts
    Object.entries(metadata.bankMetadataMap).forEach(([bankAddress, bank]) => {
      if (!bank.validatorVoteAccount) return;

      const voteAccountStr = bank.validatorVoteAccount;

      // Get active status (default to false if not found)
      const isActive = activeStakePoolMap.get(voteAccountStr) ?? false;

      // Get MEV data (default to 0s if not found)
      const mevData = stakePoolMevMap.get(voteAccountStr) ?? { pool: 0, onramp: 0 };

      // Get validator rewards from validator rates (use totalApy as rewards)
      const validatorRate = validatorRates.find((rate) => rate.validator === voteAccountStr);
      const validatorRewards = validatorRate?.totalApy ?? 0;

      stakePoolMap.set(bankAddress, {
        validatorVoteAccount: new PublicKey(voteAccountStr),
        validatorRewards,
        isActive,
        mev: mevData,
      });
    });

    return stakePoolMap;
  }, [allDataReady, metadata?.bankMetadataMap, activeStakePoolMap, stakePoolMevMap, validatorRates]);

  return {
    stakePoolMetadataMap,
    isLoading:
      !allDataReady &&
      !isErrorMetadata &&
      !isErrorActiveStakePoolMap &&
      !isErrorStakePoolMevMap &&
      !isErrorValidatorRates,
    isError: isErrorMetadata || isErrorActiveStakePoolMap || isErrorStakePoolMevMap || isErrorValidatorRates,
    allDataReady,
  };
}
