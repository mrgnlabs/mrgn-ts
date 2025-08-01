import { Connection, PublicKey, StakeProgram, ParsedAccountData, LAMPORTS_PER_SOL } from "@solana/web3.js";

import { chunkedGetRawMultipleAccountInfoOrdered, MAX_U64 } from "@mrgnlabs/mrgn-common";

import {
  findPoolAddress,
  findPoolStakeAddress,
  findPoolMintAddress,
  findPoolOnRampAddress,
} from "../../../vendor/single-spl-pool";

import { ValidatorStakeGroup, StakeAccount, StakePoolMevMap } from "../types";

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
export const fetchNativeStakeAccounts = async (
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
        const poolKey = findPoolAddress(new PublicKey(validatorAddress));
        const poolMintKey = findPoolMintAddress(poolKey);
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
 * Gets active states for stake pools associated with staked asset banks
 *
 * @param connection - Solana RPC connection
 * @param bankInfos - Array of ExtendedBankInfo objects
 * @returns Promise<Map<string, boolean>> - Map of bank addresses to active states
 */
export const fetchStakePoolActiveStates = async (
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
    (await chunkedGetRawMultipleAccountInfoOrdered(connection, poolStakeAddressKeys)).map((ai, index) => [
      poolStakeAddressRecord[poolStakeAddressKeys[index]],
      ai?.data || null,
    ])
  );

  validatorVoteAccounts.map((validatorVoteAccount) => {
    const stakeAccount = fetchStakeAccount(poolStakeAccounts[validatorVoteAccount.toBase58()]);
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
    activeStates.set(validatorVoteAccount.toBase58(), isActive);
  });

  return activeStates;
};

/**
 * Gets APY rates for validators associated with staked asset banks
 *
 * @param validatorVoteAccounts - Array of validator vote account public keys
 * @returns Promise<Map<string, number>> - Map of bank addresses to APY rates
 */
// export const getValidatorRates = async (validatorVoteAccounts: PublicKey[]): Promise<Map<string, number>> => {
//   const rates = new Map<string, number>();

//   await Promise.all(
//     validatorVoteAccounts.map(async (validatorVoteAccount) => {
//       const poolAddress = findPoolAddress(validatorVoteAccount);
//       const poolMintAddress = findPoolMintAddress(poolAddress);

//       try {
//         const response = await fetch(`/api/validator-info?validator=${validatorVoteAccount.toBase58()}`);

//         if (!response.ok) {
//           rates.set(poolMintAddress.toBase58(), 0);
//           return;
//         }

//         const data = await response.json();
//         rates.set(poolMintAddress.toBase58(), data.data?.total_apy ?? 0);
//       } catch (error) {
//         console.error("Error fetching validator rate:", error);
//         rates.set(poolMintAddress.toBase58(), 0);
//       }
//     })
//   );

//   return rates;
// };

export const fetchStakeAccount = function (data: Buffer): StakeAccount {
  let offset = 0;

  // Discriminant (4 bytes)
  const discriminant = data.readUInt32LE(offset);
  offset += 4;

  // Meta
  const rentExemptReserve = data.readBigUInt64LE(offset);
  offset += 8;

  // Authorized staker and withdrawer (2 public keys)
  const staker = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const withdrawer = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // Lockup: unixTimestamp, epoch, custodian
  const unixTimestamp = data.readBigUInt64LE(offset);
  offset += 8;
  const epoch = data.readBigUInt64LE(offset);
  offset += 8;
  const custodian = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;

  // Stake: Delegation
  const voterPubkey = new PublicKey(data.subarray(offset, offset + 32));
  offset += 32;
  const stake = data.readBigUInt64LE(offset);
  offset += 8;
  const activationEpoch = data.readBigUInt64LE(offset);
  offset += 8;
  const deactivationEpoch = data.readBigUInt64LE(offset);
  offset += 8;

  // Credits observed
  const creditsObserved = data.readBigUInt64LE(offset);

  // Return the parsed StakeAccount object
  return {
    discriminant,
    meta: {
      rentExemptReserve,
      authorized: {
        staker,
        withdrawer,
      },
      lockup: {
        unixTimestamp,
        epoch,
        custodian,
      },
    },
    stake: {
      delegation: {
        voterPubkey,
        stake,
        activationEpoch,
        deactivationEpoch,
      },
      creditsObserved,
    },
  };
};

export const fetchStakePoolMev = async (
  connection: Connection,
  validatorVoteAccounts: PublicKey[]
): Promise<StakePoolMevMap> => {
  const poolAddressRecord: Record<string, PublicKey> = {};
  const poolStakeAddressRecord: Record<string, PublicKey> = {};
  const onRampAddressRecord: Record<string, PublicKey> = {};
  const mev: StakePoolMevMap = new Map<string, { pool: number; onramp: number }>();

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

  const allAddresses = [...poolStakeAddresses, ...onRampAddresses].map((address) => address.toBase58());

  return chunkedGetRawMultipleAccountInfoOrdered(connection, allAddresses).then((accountInfos) => {
    const poolStakeInfos = accountInfos.slice(0, poolStakeAddresses.length);
    const onRampInfos = accountInfos.slice(poolStakeAddresses.length);
    const rent = 2282280;

    validatorVoteAccounts.forEach((validatorVoteAccount, index) => {
      const poolStakeInfo = poolStakeInfos[index];
      const onRampInfo = onRampInfos[index];

      if (poolStakeInfo && onRampInfo) {
        const stakeDecoded = fetchStakeAccount(poolStakeInfo.data);
        const onrampDecoded = fetchStakeAccount(onRampInfo.data);
        const poolLamps = poolStakeInfo.lamports - rent - Number(stakeDecoded.stake.delegation.stake.toString());
        const onrampStake = Number(onrampDecoded.stake.delegation.stake.toString());

        mev.set(validatorVoteAccount.toBase58(), {
          pool: poolLamps >= 1000 ? poolLamps : 0,
          onramp: onrampStake,
        });
      }
    });

    return mev;
  });
};
