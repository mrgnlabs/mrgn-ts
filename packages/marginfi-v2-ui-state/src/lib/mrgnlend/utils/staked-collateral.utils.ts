import { Connection, LAMPORTS_PER_SOL, ParsedAccountData, PublicKey, StakeProgram } from "@solana/web3.js";

import { MAX_U64 } from "@mrgnlabs/mrgn-common";
import { vendor } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo, ValidatorStakeGroup } from "../types";
import {
  findPoolAddress,
  findPoolMintAddress,
  findPoolStakeAddress,
  findPoolOnRampAddress,
} from "@mrgnlabs/marginfi-client-v2/dist/vendor";

/**
 * Fetches stake accounts for a given public key from API
 * API in turn calls getStakeAccounts and caches the result
 *
 * @param publicKey - User's public key
 * @param opts - Options for filtering inactive stake accounts
 * @returns Promise<ValidatorStakeGroup[]> - Array of validator stake groups
 */
const getStakeAccountsCached = async (
  publicKey: PublicKey,
  opts: {
    filterInactive: boolean;
  } = {
    filterInactive: true,
  }
): Promise<ValidatorStakeGroup[]> => {
  const params = new URLSearchParams();
  params.set("address", publicKey.toBase58());
  params.set("filterInactive", opts.filterInactive.toString());

  const response = await fetch(`/api/user/stake-accounts?${params.toString()}`);

  if (!response.ok) {
    return [];
  }

  const stakeAccounts: ValidatorStakeGroup[] = await response.json();

  return stakeAccounts.map((stakeAccount) => ({
    ...stakeAccount,
    validator: new PublicKey(stakeAccount.validator),
    poolKey: new PublicKey(stakeAccount.poolKey),
    poolMintKey: new PublicKey(stakeAccount.poolMintKey),
    selectedAccount: {
      pubkey: new PublicKey(stakeAccount.selectedAccount.pubkey),
      amount: stakeAccount.selectedAccount.amount,
    },
    accounts: stakeAccount.accounts.map((account) => ({
      pubkey: new PublicKey(account.pubkey),
      amount: account.amount,
    })),
  }));
};

/**
 * Retrieves all active stake accounts associated with a given public key grouped by validator
 *
 * @warning this is an expensive rpc call and should be heavily cached
 *
 * @param connection - Solana RPC connection
 * @param publicKey - Users's public key
 * @param opts - Options for filtering inactive stake accounts
 * @returns {Promise<ValidatorStakeGroup[]>} An array of validator stake groups
 */
const getStakeAccounts = async (
  connection: Connection,
  publicKey: PublicKey,
  opts: {
    filterInactive: boolean;
  } = {
    filterInactive: true,
  }
): Promise<ValidatorStakeGroup[]> => {
  if (!connection || !publicKey) {
    throw new Error("Invalid connection or public key");
  }

  try {
    const epochInfo = await connection.getEpochInfo();
    const accounts = await connection.getParsedProgramAccounts(StakeProgram.programId, {
      filters: [
        {
          memcmp: {
            offset: 12,
            bytes: publicKey.toBase58(),
          },
        },
      ],
    });

    const validatorMap = new Map<string, { pubkey: PublicKey; amount: number }[]>();

    // Map accounts to promises and run them in parallel
    await Promise.all(
      accounts.map(async (acc) => {
        const parsedAccount = acc.account.data as ParsedAccountData;
        const stakeInfo = parsedAccount.parsed.info;

        // filter out inactive stake accounts
        if (
          !stakeInfo.stake?.delegation ||
          (opts.filterInactive &&
            (Number(stakeInfo.stake.delegation.activationEpoch) >= epochInfo.epoch ||
              stakeInfo.stake.delegation.deactivationEpoch !== MAX_U64))
        ) {
          return;
        }

        const validatorAddress = stakeInfo.stake.delegation.voter;
        const accountPubkey = acc.pubkey;
        const amount = Number(stakeInfo.stake.delegation.stake) / LAMPORTS_PER_SOL;

        const existingAccounts = validatorMap.get(validatorAddress) || [];
        validatorMap.set(validatorAddress, [...existingAccounts, { pubkey: accountPubkey, amount }]);
      })
    );

    // Calculate pool keys once per validator when creating return value
    return Promise.all(
      Array.from(validatorMap.entries()).map(async ([validatorAddress, accounts]) => {
        const poolKey = await vendor.findPoolAddress(new PublicKey(validatorAddress));
        const poolMintKey = await vendor.findPoolMintAddress(poolKey);
        const totalStake = accounts.reduce((acc, curr) => acc + curr.amount, 0);
        const largestAccount = accounts.reduce((acc, curr) => (acc.amount > curr.amount ? acc : curr));
        const sortedAccounts = accounts.sort((a, b) => b.amount - a.amount);

        // if the largest account is not the first in the array, move it to the front
        if (!sortedAccounts[0].pubkey.equals(largestAccount.pubkey)) {
          sortedAccounts.unshift(sortedAccounts.splice(sortedAccounts.indexOf(largestAccount), 1)[0]);
        }

        return {
          validator: new PublicKey(validatorAddress),
          poolKey,
          poolMintKey,
          accounts: sortedAccounts,
          totalStake,
          selectedAccount: largestAccount,
        };
      })
    );
  } catch (e) {
    console.error("Error getting stake accounts", e);
    return [];
  }
};

/**
 * Filters and processes staked asset banks based on user's stake accounts
 *
 * @param connection - Solana RPC connection
 * @param publicKey - User's public key
 * @param extendedBankInfos - Array of all bank infos
 * @returns Promise<[ExtendedBankInfo[], ExtendedBankInfo[]]> - [filtered bank infos, staked asset bank infos]
 */
const filterStakedAssetBanks = async (
  publicKey: PublicKey | null,
  extendedBankInfos: ExtendedBankInfo[]
): Promise<[ExtendedBankInfo[], ExtendedBankInfo[]]> => {
  const stakedAssetBankInfos = extendedBankInfos.filter((bank) => bank.info.rawBank.config.assetTag === 2);

  // remove staked asset banks from main array where user does not have an open position
  let filteredBankInfos = extendedBankInfos.filter((bank) => bank.info.rawBank.config.assetTag !== 2 || bank.isActive);

  // if connected check for matching stake accounts
  if (publicKey) {
    const stakeAccounts = await getStakeAccountsCached(publicKey);

    // add back staked asset banks for validators uaer has native stake
    filteredBankInfos = filteredBankInfos.concat(
      stakedAssetBankInfos.filter((bank) =>
        stakeAccounts.find((stakeAccount) => stakeAccount.poolMintKey.equals(bank.info.rawBank.mint) && !bank.isActive)
      )
    );
  }

  return [filteredBankInfos, stakedAssetBankInfos];
};

/**
 * Gets active states for stake pools associated with staked asset banks
 *
 * @param connection - Solana RPC connection
 * @param bankInfos - Array of ExtendedBankInfo objects
 * @returns Promise<Map<string, boolean>> - Map of bank addresses to active states
 */
const getStakePoolActiveStates = async (
  connection: Connection,
  validatorVoteAccounts: PublicKey[]
): Promise<Map<string, boolean>> => {
  const currentEpoch = await connection.getEpochInfo();
  const activeStates = new Map<string, boolean>();

  const poolMintAddressRecord: Record<string, PublicKey> = {};
  const poolStakeAddressRecord: Record<string, PublicKey> = {};

  validatorVoteAccounts.forEach((validatorVoteAccount) => {
    const poolAddress = findPoolAddress(validatorVoteAccount);
    const poolStakeAddress = findPoolStakeAddress(poolAddress);
    const poolMintAddress = findPoolMintAddress(poolAddress);

    poolMintAddressRecord[validatorVoteAccount.toBase58()] = poolMintAddress;
    poolStakeAddressRecord[poolStakeAddress.toBase58()] = validatorVoteAccount;
  });

  const poolStakeAddressKeys = Object.keys(poolStakeAddressRecord);

  const poolStakeAccounts = Object.fromEntries(
    (await connection.getMultipleAccountsInfo(poolStakeAddressKeys.map((key) => new PublicKey(key)))).map(
      (ai, index) => [poolStakeAddressRecord[poolStakeAddressKeys[index]], ai?.data || null]
    )
  );

  validatorVoteAccounts.map(async (validatorVoteAccount) => {
    const stakeAccount = poolStakeAccounts[validatorVoteAccount.toBase58()];
    const poolMintAddress = poolMintAddressRecord[validatorVoteAccount.toBase58()];

    if (!stakeAccount) {
      activeStates.set(poolMintAddress.toBase58(), false);
      return;
    }

    if (!stakeAccount.stake?.delegation) {
      activeStates.set(poolMintAddress.toBase58(), false);
      return;
    }

    const activationEpoch = stakeAccount.stake.delegation.activationEpoch;
    const isActive = currentEpoch.epoch > Number(activationEpoch);
    activeStates.set(poolMintAddress.toBase58(), isActive);
  });

  return activeStates;
};

/**
 * Gets APY rates for validators associated with staked asset banks
 *
 * @param validatorVoteAccounts - Array of validator vote account public keys
 * @returns Promise<Map<string, number>> - Map of bank addresses to APY rates
 */
const getValidatorRates = async (validatorVoteAccounts: PublicKey[]): Promise<Map<string, number>> => {
  const rates = new Map<string, number>();

  await Promise.all(
    validatorVoteAccounts.map(async (validatorVoteAccount) => {
      const poolAddress = findPoolAddress(validatorVoteAccount);
      const poolMintAddress = findPoolMintAddress(poolAddress);

      try {
        const response = await fetch(`/api/validator-info?validator=${validatorVoteAccount.toBase58()}`);

        if (!response.ok) {
          rates.set(poolMintAddress.toBase58(), 0);
          return;
        }

        const data = await response.json();
        rates.set(poolMintAddress.toBase58(), data.data?.total_apy ?? 0);
      } catch (error) {
        console.error("Error fetching validator rate:", error);
        rates.set(poolMintAddress.toBase58(), 0);
      }
    })
  );

  return rates;
};

const getStakePoolUnclaimedLamps = async (
  connection: Connection,
  validatorVoteAccounts: PublicKey[]
): Promise<
  Map<
    string,
    {
      pool: number;
      onramp: number;
    }
  >
> => {
  const poolAddressRecord: Record<string, PublicKey> = {};
  const poolStakeAddressRecord: Record<string, PublicKey> = {};
  const onRampAddressRecord: Record<string, PublicKey> = {};
  const unclaimedLamps = new Map<
    string,
    {
      pool: number;
      onramp: number;
    }
  >();

  validatorVoteAccounts.forEach((validatorVoteAccount) => {
    const poolAddress = findPoolAddress(validatorVoteAccount);
    const poolStakeAddress = findPoolStakeAddress(poolAddress);
    const onRampAddress = findPoolOnRampAddress(poolAddress);

    poolAddressRecord[validatorVoteAccount.toBase58()] = poolAddress;
    poolStakeAddressRecord[validatorVoteAccount.toBase58()] = poolStakeAddress;
    onRampAddressRecord[validatorVoteAccount.toBase58()] = onRampAddress;
  });

  const poolStakeAddresses = validatorVoteAccounts.map(
    (validatorVoteAccount) => poolStakeAddressRecord[validatorVoteAccount.toBase58()]
  );
  const onRampAddresses = validatorVoteAccounts.map(
    (validatorVoteAccount) => onRampAddressRecord[validatorVoteAccount.toBase58()]
  );

  const allAddresses = [...poolStakeAddresses, ...onRampAddresses];

  return connection.getMultipleAccountsInfo(allAddresses).then((accountInfos) => {
    const poolStakeInfos = accountInfos.slice(0, poolStakeAddresses.length);
    const onRampInfos = accountInfos.slice(poolStakeAddresses.length);

    validatorVoteAccounts.forEach((validatorVoteAccount, index) => {
      const poolStakeInfo = poolStakeInfos[index];
      const onRampInfo = onRampInfos[index];

      console.log(validatorVoteAccount.toBase58());
      console.log(poolStakeInfo);
      console.log(onRampInfo);

      if (poolStakeInfo && onRampInfo) {
        unclaimedLamps.set(validatorVoteAccount.toBase58(), {
          pool: poolStakeInfo.lamports,
          onramp: onRampInfo.lamports,
        });
      }
    });

    return unclaimedLamps;
  });
};

export {
  getStakeAccountsCached,
  filterStakedAssetBanks,
  getStakeAccounts,
  getStakePoolActiveStates,
  getValidatorRates,
  getStakePoolUnclaimedLamps,
};
