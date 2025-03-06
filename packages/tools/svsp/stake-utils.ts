import {
  Keypair,
  Transaction,
  SystemProgram,
  StakeProgram,
  PublicKey,
  Connection,
  SYSVAR_CLOCK_PUBKEY,
  STAKE_CONFIG_ID,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_STAKE_HISTORY_PUBKEY,
  TransactionInstruction,
} from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { SINGLE_POOL_PROGRAM_ID } from "../scripts/utils";

/**
 * Create a stake account for some user
 * @param user
 * @param amount - in SOL (lamports), in native decimals
 * @returns
 */
export const createStakeAccount = (user: PublicKey, amount: number) => {
  const stakeAccount = Keypair.generate();

  // Create a stake account and fund it with the specified amount of SOL
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: user,
      newAccountPubkey: stakeAccount.publicKey,
      lamports: amount,
      space: StakeProgram.space, // Space required for a stake account
      programId: StakeProgram.programId,
    }),
    StakeProgram.initialize({
      stakePubkey: stakeAccount.publicKey,
      authorized: {
        staker: user,
        withdrawer: user,
      },
    })
  );

  return { createTx: tx, stakeAccountKeypair: stakeAccount };
};

/**
 * Delegate a stake account to a validator.
 * @param user - wallet signs
 * @param stakeAccount
 * @param validatorVoteAccount
 */
export const delegateStake = (user: PublicKey, stakeAccount: PublicKey, validatorVoteAccount: PublicKey) => {
  return StakeProgram.delegate({
    stakePubkey: stakeAccount,
    authorizedPubkey: user,
    votePubkey: validatorVoteAccount,
  });
};

/**
 * Delegation information for a StakeAccount
 *
 * Copied from https://github.com/solana-developers/solana-rpc-get-stake-activation/blob/main/web3js-1.0/src/stake.ts
 * */
export type Delegation = {
  voterPubkey: PublicKey;
  stake: bigint;
  activationEpoch: bigint;
  deactivationEpoch: bigint;
};

/**
 * Parsed content of an on-chain StakeAccount
 *
 * Copied from https://github.com/solana-developers/solana-rpc-get-stake-activation/blob/main/web3js-1.0/src/stake.ts
 * */
export type StakeAccount = {
  discriminant: number;
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

// Here's how you might use Solana's kit instead:

// // @ts-ignore
// const authorizedCodec = getStructCodec([
//   ['staker', fixCodecSize(getBytesCodec(), 32)],
//   ['withdrawer', fixCodecSize(getBytesCodec(), 32)],
// ]);
// // @ts-ignore
// const lockupCodec = getStructCodec([
//   ['unixTimestamp', getU64Codec()],
//   ['epoch', getU64Codec()],
//   ['custodian', fixCodecSize(getBytesCodec(), 32)],
// ]);
// // @ts-ignore
// const metaCodec = getStructCodec([
//   ['rentExemptReserve', getU64Codec()],
//   ['authorized', authorizedCodec],
//   ['lockup', lockupCodec],
// ]);
// // @ts-ignore
// const delegationCodec = getStructCodec([
//   ['voterPubkey', fixCodecSize(getBytesCodec(), 32)],
//   ['stake', getU64Codec()],
//   ['activationEpoch', getU64Codec()],
//   ['deactivationEpoch', getU64Codec()],
//   ['unused', getU64Codec()],
// ]);
// // @ts-ignore
// const stakeCodec = getStructCodec([
//   ['delegation', delegationCodec],
//   ['creditsObserved', getU64Codec()],
// ]);
// // @ts-ignore
// export const stakeAccountCodec = getStructCodec([
//   ['discriminant', getU32Codec()],
//   ['meta', metaCodec],
//   ['stake', stakeCodec],
// ]);

// export const getStakeAccountReal = async (address: Address) => {
//   const rpc = createSolanaRpc(testnet('http://127.0.0.1:8899'));
//   const stakeAccountEncoded = await fetchEncodedAccount(rpc, address);
//   const stakeAccountReal = decodeAccount(stakeAccountEncoded, stakeAccountCodec);
//   return stakeAccountReal;
// }

/**
 * Decode a StakeAccount from parsed account data.
 *
 * Copied from https://github.com/solana-developers/solana-rpc-get-stake-activation/blob/main/web3js-1.0/src/stake.ts
 * */
export const getStakeAccount = function (data: Buffer): StakeAccount {
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

/**
 * Parsed content of an on-chain Stake History Entry
 *
 * Copied from https://github.com/solana-developers/solana-rpc-get-stake-activation/blob/main/web3js-1.0/src/stake.ts
 * */
export type StakeHistoryEntry = {
  epoch: bigint;
  effective: bigint;
  activating: bigint;
  deactivating: bigint;
};

/**
 * Decode a StakeHistoryEntry from parsed account data.
 *
 * Copied from https://github.com/solana-developers/solana-rpc-get-stake-activation/blob/main/web3js-1.0/src/stake.ts
 * and modified to directly read from buffer
 * */
export const getStakeHistory = function (data: Buffer): StakeHistoryEntry[] {
  // Note: Is just `Vec<(Epoch, StakeHistoryEntry)>` internally
  const stakeHistory: StakeHistoryEntry[] = [];
  const entrySize = 32; // Each entry is 32 bytes (4 x 8-byte u64 fields)

  for (
    // skip the first 8 bytes for the Vec overhead
    let offset = 8;
    offset + entrySize < data.length;
    offset += entrySize
  ) {
    const epoch = data.readBigUInt64LE(offset); // Note `epoch` is just a u64 renamed
    const effective = data.readBigUInt64LE(offset + 8); // u64 effective
    const activating = data.readBigUInt64LE(offset + 16); // u64 activating
    const deactivating = data.readBigUInt64LE(offset + 24); // u64 deactivating

    // if (epoch < 10 && offset < 300) {
    //   console.log("epoch " + epoch);
    //   console.log("e " + effective);
    //   console.log("a " + activating);
    //   console.log("d " + deactivating);
    // }

    stakeHistory.push({
      epoch,
      effective,
      activating,
      deactivating,
    });
  }

  return stakeHistory;
};

/**
 * Representation of on-chain stake
 *
 * Copied from https://github.com/solana-developers/solana-rpc-get-stake-activation/blob/main/web3js-1.0/src/delegation.ts
 */
export interface StakeActivatingAndDeactivating {
  effective: bigint;
  activating: bigint;
  deactivating: bigint;
}

/**
 * Representation of on-chain stake excluding deactivating stake
 *
 * Copied from https://github.com/solana-developers/solana-rpc-get-stake-activation/blob/main/web3js-1.0/src/delegation.ts
 */
export interface EffectiveAndActivating {
  effective: bigint;
  activating: bigint;
}

/**
 * Get stake histories for a given epoch
 *
 * Copied from https://github.com/solana-developers/solana-rpc-get-stake-activation/blob/main/web3js-1.0/src/delegation.ts
 */
function getStakeHistoryEntry(epoch: bigint, stakeHistory: StakeHistoryEntry[]): StakeHistoryEntry | null {
  for (const entry of stakeHistory) {
    if (entry.epoch === epoch) {
      return entry;
    }
  }
  return null;
}

const WARMUP_COOLDOWN_RATE = 0.09;

/**
 * Get on-chain status of activating stake
 *
 * Copied from https://github.com/solana-developers/solana-rpc-get-stake-activation/blob/main/web3js-1.0/src/delegation.ts
 */
export function getStakeAndActivating(
  delegation: Delegation,
  targetEpoch: bigint,
  stakeHistory: StakeHistoryEntry[]
): EffectiveAndActivating {
  if (delegation.activationEpoch === delegation.deactivationEpoch) {
    // activated but instantly deactivated; no stake at all regardless of target_epoch
    return {
      effective: BigInt(0),
      activating: BigInt(0),
    };
  } else if (targetEpoch === delegation.activationEpoch) {
    // all is activating
    return {
      effective: BigInt(0),
      activating: delegation.stake,
    };
  } else if (targetEpoch < delegation.activationEpoch) {
    // not yet enabled
    return {
      effective: BigInt(0),
      activating: BigInt(0),
    };
  }

  let currentEpoch = delegation.activationEpoch;
  let entry = getStakeHistoryEntry(currentEpoch, stakeHistory);
  if (entry !== null) {
    // target_epoch > self.activation_epoch

    // loop from my activation epoch until the target epoch summing up my entitlement
    // current effective stake is updated using its previous epoch's cluster stake
    let currentEffectiveStake = BigInt(0);
    while (entry !== null) {
      currentEpoch++;
      const remaining = delegation.stake - currentEffectiveStake;
      const weight = Number(remaining) / Number(entry.activating);
      const newlyEffectiveClusterStake = Number(entry.effective) * WARMUP_COOLDOWN_RATE;
      const newlyEffectiveStake = BigInt(Math.max(1, Math.round(weight * newlyEffectiveClusterStake)));

      currentEffectiveStake += newlyEffectiveStake;
      if (currentEffectiveStake >= delegation.stake) {
        currentEffectiveStake = delegation.stake;
        break;
      }

      if (currentEpoch >= targetEpoch || currentEpoch >= delegation.deactivationEpoch) {
        break;
      }
      entry = getStakeHistoryEntry(currentEpoch, stakeHistory);
    }
    return {
      effective: currentEffectiveStake,
      activating: delegation.stake - currentEffectiveStake,
    };
  } else {
    // no history or I've dropped out of history, so assume fully effective
    return {
      effective: delegation.stake,
      activating: BigInt(0),
    };
  }
}

/**
 * Get on-chain status of activating and deactivating stake
 *
 * Copied from https://github.com/solana-developers/solana-rpc-get-stake-activation/blob/main/web3js-1.0/src/delegation.ts
 */
export function getStakeActivatingAndDeactivating(
  delegation: Delegation,
  targetEpoch: bigint,
  stakeHistory: StakeHistoryEntry[]
): StakeActivatingAndDeactivating {
  const { effective, activating } = getStakeAndActivating(delegation, targetEpoch, stakeHistory);

  // then de-activate some portion if necessary
  if (targetEpoch < delegation.deactivationEpoch) {
    return {
      effective,
      activating,
      deactivating: BigInt(0),
    };
  } else if (targetEpoch == delegation.deactivationEpoch) {
    // can only deactivate what's activated
    return {
      effective,
      activating: BigInt(0),
      deactivating: effective,
    };
  }
  let currentEpoch = delegation.deactivationEpoch;
  let entry = getStakeHistoryEntry(currentEpoch, stakeHistory);
  if (entry !== null) {
    // target_epoch > self.activation_epoch
    // loop from my deactivation epoch until the target epoch
    // current effective stake is updated using its previous epoch's cluster stake
    let currentEffectiveStake = effective;
    while (entry !== null) {
      currentEpoch++;
      // if there is no deactivating stake at prev epoch, we should have been
      // fully undelegated at this moment
      if (entry.deactivating === BigInt(0)) {
        break;
      }

      // I'm trying to get to zero, how much of the deactivation in stake
      //   this account is entitled to take
      const weight = Number(currentEffectiveStake) / Number(entry.deactivating);

      // portion of newly not-effective cluster stake I'm entitled to at current epoch
      const newlyNotEffectiveClusterStake = Number(entry.effective) * WARMUP_COOLDOWN_RATE;
      const newlyNotEffectiveStake = BigInt(Math.max(1, Math.round(weight * newlyNotEffectiveClusterStake)));

      currentEffectiveStake -= newlyNotEffectiveStake;
      if (currentEffectiveStake <= 0) {
        currentEffectiveStake = BigInt(0);
        break;
      }

      if (currentEpoch >= targetEpoch) {
        break;
      }
      entry = getStakeHistoryEntry(currentEpoch, stakeHistory);
    }

    // deactivating stake should equal to all of currently remaining effective stake
    return {
      effective: currentEffectiveStake,
      deactivating: currentEffectiveStake,
      activating: BigInt(0),
    };
  } else {
    return {
      effective: BigInt(0),
      activating: BigInt(0),
      deactivating: BigInt(0),
    };
  }
}

/**
 * Representation of on-chain stake
 *
 * Copied from https://github.com/solana-developers/solana-rpc-get-stake-activation/blob/main/web3js-1.0/src/rpc.ts
 */
export interface StakeActivation {
  status: string;
  active: bigint;
  inactive: bigint;
}

/**
 * Get on-chain stake status of a stake account (activating, inactive, etc)
 *
 * Copied from https://github.com/solana-developers/solana-rpc-get-stake-activation/blob/main/web3js-1.0/src/rpc.ts
 */
export async function getStakeActivation(
  connection: Connection,
  stakeAddress: PublicKey,
  epoch: number | undefined = undefined // Added to bypass connection.getEpochInfo() when using a bankrun provider.
): Promise<StakeActivation> {
  const SYSVAR_STAKE_HISTORY_ADDRESS = new PublicKey("SysvarStakeHistory1111111111111111111111111");
  const epochInfoPromise = epoch !== undefined ? Promise.resolve({ epoch }) : connection.getEpochInfo();
  const [epochInfo, { stakeAccount, stakeAccountLamports }, stakeHistory] = await Promise.all([
    epochInfoPromise,
    (async () => {
      const stakeAccountInfo = await connection.getAccountInfo(stakeAddress);
      if (stakeAccountInfo === null) {
        throw new Error("Account not found");
      }
      const stakeAccount = getStakeAccount(stakeAccountInfo.data);
      const stakeAccountLamports = stakeAccountInfo.lamports;
      return { stakeAccount, stakeAccountLamports };
    })(),
    (async () => {
      const stakeHistoryInfo = await connection.getAccountInfo(SYSVAR_STAKE_HISTORY_ADDRESS);
      if (stakeHistoryInfo === null) {
        throw new Error("StakeHistory not found");
      }
      return getStakeHistory(stakeHistoryInfo.data);
    })(),
  ]);

  const targetEpoch = epoch ? epoch : epochInfo.epoch;
  const { effective, activating, deactivating } = getStakeActivatingAndDeactivating(
    stakeAccount.stake.delegation,
    BigInt(targetEpoch),
    stakeHistory
  );

  let status;
  if (deactivating > 0) {
    status = "deactivating";
  } else if (activating > 0) {
    status = "activating";
  } else if (effective > 0) {
    status = "active";
  } else {
    status = "inactive";
  }
  const inactive = BigInt(stakeAccountLamports) - effective - stakeAccount.meta.rentExemptReserve;

  return {
    status,
    active: effective,
    inactive,
  };
}

export const getEpochAndSlot = async (connection: Connection) => {
  let clock = await connection.getAccountInfo(SYSVAR_CLOCK_PUBKEY);

  // Slot is bytes 0-8
  let slot = new BN(clock.data.subarray(0, 8), 10, "le").toNumber();

  // Epoch is bytes 16-24
  let epoch = new BN(clock.data.subarray(16, 24), 10, "le").toNumber();

  return { epoch, slot };
};

/**
 * SVSP stake pool that stores MEV rewards teporarily before they are merged into the main pool
 * @param stakePool
 * @returns
 */
export const deriveOnRampPool = (stakePool: PublicKey) => {
  return PublicKey.findProgramAddressSync([Buffer.from("onramp"), stakePool.toBuffer()], SINGLE_POOL_PROGRAM_ID);
};

/**
 * Copy of SVSP `findPoolStakeAddress`
 * @param stakePool
 * @returns
 */
export const deriveStakePool = (stakePool: PublicKey) => {
  return PublicKey.findProgramAddressSync([Buffer.from("stake"), stakePool.toBuffer()], SINGLE_POOL_PROGRAM_ID);
};

/**
 * Copy of SVSP `findPoolStakeAuthorityAddress`
 * @param stakePool
 * @returns
 */
export const deriveStakeAuthority = (stakePool: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("stake_authority"), stakePool.toBuffer()],
    SINGLE_POOL_PROGRAM_ID
  );
};

/**
 * Copy of SVSP `findPoolAddress`
 * @param stakePool
 * @returns
 */
export const deriveSVSPpool = (voteAccount: PublicKey) => {
  return PublicKey.findProgramAddressSync([Buffer.from("pool"), voteAccount.toBuffer()], SINGLE_POOL_PROGRAM_ID);
};

/**
 * Copy of SVSP `findPoolMintAddress`
 * @param stakePool
 * @returns
 */
export const deriveStakeMint = (stakePool: PublicKey) => {
  return PublicKey.findProgramAddressSync([Buffer.from("mint"), stakePool.toBuffer()], SINGLE_POOL_PROGRAM_ID);
};

/**
 * Spl Single Pool's CreateOnRamp instruction.
 *
 * Accounts (in order):
 *
 * * 0. `[]` Pool account
 * * 1. `[w]` Pool onramp account
 * * 2. `[]` Pool stake authority
 * * 3. `[]` Rent sysvar
 * * 4. `[]` System program
 * * 5. `[]` Stake program
 *
 * @param voteAccount - Validator's vote account
 *
 * @returns A TransactionInstruction
 */
export function createPoolOnramp(voteAccount: PublicKey): TransactionInstruction {
  const [poolAccount] = deriveSVSPpool(voteAccount);
  const [onRampAccount] = deriveOnRampPool(poolAccount);
  const [poolStakeAuthority] = deriveStakeAuthority(poolAccount);

  const keys = [
    { pubkey: poolAccount, isSigner: false, isWritable: false },
    { pubkey: onRampAccount, isSigner: false, isWritable: true },
    { pubkey: poolStakeAuthority, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: StakeProgram.programId, isSigner: false, isWritable: false },
  ];

  // TODO don't hard code the instruction index? (or why not, it's not gna change is it?)
  const data = Buffer.from(Uint8Array.of(6));

  return new TransactionInstruction({
    keys,
    programId: SINGLE_POOL_PROGRAM_ID,
    data,
  });
}

/**
 * Spl Single Pool's CreateOnRamp instruction.
 *
 * Accounts (in order):
 *
 * * 0. `[]` Validator vote account
 * * 1. `[]` Pool account
 * * 2. `[w]` Pool stake account
 * * 3. `[w]` Pool onramp account
 * * 4. `[]` Pool stake authority
 * * 5. `[]` Clock sysvar
 * * 6. `[]` Stake history sysvar
 * * 7. `[]` Stake config sysvar
 * * 8. `[]` Stake program
 *
 * @param voteAccount - Validator's vote account
 *
 * @returns A TransactionInstruction
 */
export function replenishPool(voteAccount: PublicKey): TransactionInstruction {
  const [poolAccount] = deriveSVSPpool(voteAccount);
  const [stakePool] = deriveStakePool(poolAccount);
  const [onRampPool] = deriveOnRampPool(poolAccount);
  const [authority] = deriveStakeAuthority(poolAccount);

  const keys = [
    { pubkey: voteAccount, isSigner: false, isWritable: false },
    { pubkey: poolAccount, isSigner: false, isWritable: false },
    { pubkey: stakePool, isSigner: false, isWritable: true },
    { pubkey: onRampPool, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_CLOCK_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_STAKE_HISTORY_PUBKEY, isSigner: false, isWritable: false },
    { pubkey: STAKE_CONFIG_ID, isSigner: false, isWritable: false },
    { pubkey: StakeProgram.programId, isSigner: false, isWritable: false },
  ];

  // TODO don't hard code the instruction index? (or why not, it's not gna change is it?)
  const data = Buffer.from(Uint8Array.of(1));

  return new TransactionInstruction({
    keys,
    programId: SINGLE_POOL_PROGRAM_ID,
    data,
  });
}

/**
 * Waits until the given time
 * @param time - in seconds (e.g. Date.now()/1000)
 * @param silenceWarning - (optional) set to true to silence the warning if the time is in the past
 */
export const waitUntil = async (time: number, silenceWarning: boolean = false) => {
  const now = Date.now() / 1000;
  if (time > now + 500) {
    console.error("Tried to wait a very long time, aborted");
    return;
  }
  if (now > time) {
    if (!silenceWarning) {
      console.error("Tried to wait for a time that's in the past. You probably need to adjust test timings.");
      console.error("now: " + now + " and tried waiting until: " + time);
    }
    return new Promise((r) => setTimeout(r, 1)); //waits 1 ms
  }
  const toWait = Math.ceil(time - now) * 1000;
  await new Promise((r) => setTimeout(r, toWait));
};
