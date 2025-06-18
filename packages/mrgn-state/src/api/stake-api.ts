import { ActiveStakePoolMap, StakePoolMevMap, ValidatorRateData } from "@mrgnlabs/marginfi-client-v2";
import { PublicKey } from "@solana/web3.js";

export const fetchStakePoolMevMap = async (voteAccounts: PublicKey[]) => {
  const response = await fetch(
    "/api/stakeData/stakePoolMevMap?voteAccounts=" + voteAccounts.map((account) => account.toBase58()).join(","),
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const data: Record<string, { pool: number; onramp: number }> = await response.json();

  const mevMap: StakePoolMevMap = new Map<string, { pool: number; onramp: number }>();

  Object.entries(data).forEach(([key, value]) => {
    mevMap.set(key, value);
  });

  return mevMap;
};

export const fetchValidatorRates = async (voteAccounts: PublicKey[]) => {
  const response = await fetch(
    "/api/stakeData/validatorRateData?voteAccounts=" + voteAccounts.map((account) => account.toBase58()).join(","),
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const data: ValidatorRateData[] = await response.json();

  return data;
};

export const fetchActiveStakePoolMap = async (voteAccounts: PublicKey[]) => {
  const response = await fetch(
    "/api/stakeData/activeStakePoolMap?voteAccounts=" + voteAccounts.map((account) => account.toBase58()).join(","),
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }
  );

  const data: Record<string, boolean> = await response.json();

  const activeStatesMap: ActiveStakePoolMap = new Map<string, boolean>();

  Object.entries(data).forEach(([key, value]) => {
    activeStatesMap.set(key, value);
  });

  return activeStatesMap;
};
