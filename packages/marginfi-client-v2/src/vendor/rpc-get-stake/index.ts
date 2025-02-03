import { PublicKey } from "@solana/web3.js";

/**
 * Parsed content of an on-chain StakeAccount
 *
 * Copied from https://github.com/solana-developers/solana-rpc-get-stake-activation/blob/main/web3js-1.0/src/stake.ts
 * */
export type StakeAccount = {
  discriminant: bigint;
  meta: {
    rentExemptReserve: bigint;
    authorized: {
      staker: PublicKey;
      withdrawer: PublicKey;
    };
    lockup: {
      unixTimestamp: bigint;
      epoch: bigint;
      custodian: PublicKey;
    };
  };
  stake: {
    delegation: {
      voterPubkey: PublicKey;
      stake: bigint;
      activationEpoch: bigint;
      deactivationEpoch: bigint;
    };
    creditsObserved: bigint;
  };
};

/**
 * Decode a StakeAccount from parsed account data.
 *
 * Copied from https://github.com/solana-developers/solana-rpc-get-stake-activation/blob/main/web3js-1.0/src/stake.ts
 * */
export const getStakeAccount = function (data: Buffer): StakeAccount {
  let offset = 0;

  // Discriminant (4 bytes)
  const discriminant = data.readBigUInt64LE(offset);
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
