import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

import { DEFAULT_API_URL, loadEnvFile, SINGLE_POOL_PROGRAM_ID } from "./utils";

import { getMint } from "@solana/spl-token";

type Config = {
  VALIDATOR_VOTE_ACCOUNT: PublicKey;
  SOL_PRICE: number;
};

const config: Config = {
  VALIDATOR_VOTE_ACCOUNT: new PublicKey("mrgn4t2JabSgvGnrCaHXMvz8ocr4F52scsxJnkQMQsQ"),
  SOL_PRICE: 200,
};

async function main() {
  loadEnvFile(".env.api");
  const apiUrl = process.env.API_URL || DEFAULT_API_URL;
  console.log("api: " + apiUrl);
  const connection = new Connection(apiUrl, "confirmed");

  const [pool] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), config.VALIDATOR_VOTE_ACCOUNT.toBuffer()],
    SINGLE_POOL_PROGRAM_ID
  );
  const [lstMint] = PublicKey.findProgramAddressSync([Buffer.from("mint"), pool.toBuffer()], SINGLE_POOL_PROGRAM_ID);
  const [solPool] = PublicKey.findProgramAddressSync([Buffer.from("stake"), pool.toBuffer()], SINGLE_POOL_PROGRAM_ID);
  console.log("stake pool: " + pool);
  console.log("mint: " + lstMint);
  console.log("sol pool: " + solPool);

  const [mintAcc, solPoolAcc] = await Promise.all([getMint(connection, lstMint), connection.getAccountInfo(solPool)]);

  let supply = Number(mintAcc.supply);

  // This is close enough in most cases, but in edge cases someone can send sol here as a troll..
  // const solPoolLamports = solPool.lamports;

  // What you really want to do is...
  const splStakePoolBefore = getStakeAccount(solPoolAcc.data);
  const stake = Number(splStakePoolBefore.stake.delegation.stake);
  // there is 1 SOL used to init the pool that is non-refundable and doesn't count as stake
  let stakeActual = stake - LAMPORTS_PER_SOL;

  console.log("supply: " + supply.toLocaleString());
  console.log("sol pool actual stake (in lamports): " + stakeActual.toLocaleString());

  let multiplier = stakeActual / supply;
  console.log("multiplier: " + multiplier);

  let price = config.SOL_PRICE * multiplier;
  console.log("value per LST: " + price);
}

main().catch((err) => {
  console.error(err);
});

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
