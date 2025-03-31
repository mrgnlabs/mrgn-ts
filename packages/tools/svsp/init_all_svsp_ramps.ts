// This creates the on-ramp for all svsp accounts to be able to redeem MEV rewards
// You can also use this to run the repenlish crank on all the pools

// TODO add a LUT and send these all in one tx to avoid burning so many tx fees.
import {
  Connection,
  PublicKey,
  sendAndConfirmTransaction,
  StakeProgram,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { DEFAULT_API_URL, loadEnvFile, loadKeypairFromFile } from "../scripts/utils";
import { createPoolOnramp, deriveOnRampPool, deriveSVSPpool, replenishPool } from "./stake-utils";
import fs from "fs";
import path from "path";

/** True to create the svsp on-ramp, false to skip */
const create = false;
/** True to crank the svsp on-ramp, false to skip */
const crank = true;

async function main() {
  loadEnvFile(".env.api");
  const apiUrl = process.env.API_URL || DEFAULT_API_URL;
  console.log("api: " + apiUrl);
  const connection = new Connection(apiUrl, "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");
  console.log("payer: " + wallet.publicKey);

  const jsonUrl = "https://storage.googleapis.com/mrgn-public/mrgn-staked-bank-metadata-cache.json";
  const response = await fetch(jsonUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch JSON: ${response.statusText}`);
  }
  const pools: PoolEntry[] = (await response.json()) as PoolEntry[];
  // Or read it locally....
  //   const poolsJson = fs.readFileSync(path.join(__dirname, "svsp_pools.json"), "utf8");
  //   const pools: PoolEntry[] = JSON.parse(poolsJson);
  console.log("read " + pools.length + " pools");
  console.log("");

  for (let i = 0; i < pools.length; i++) {
    const voteAccount = new PublicKey(pools[i].validatorVoteAccount);
    console.log("svsp [" + i + "]: " + voteAccount);
    const [svspPool] = deriveSVSPpool(voteAccount);
    // const [poolStake] = deriveStakePool(svspPool);
    // const [poolAuthority] = deriveStakeAuthority(svspPool);
    const [onRamp] = deriveOnRampPool(svspPool);

    let tx = new Transaction();
    if (create) {
      const rent = await connection.getMinimumBalanceForRentExemption(StakeProgram.space);
      const rentIx = SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: onRamp,
        lamports: rent,
      });
      const createIx = createPoolOnramp(voteAccount);
      tx.add(rentIx, createIx);
    }
    if (crank) {
      const replenishIx = replenishPool(voteAccount);
      tx.add(replenishIx);
    }

    try {
      const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
      console.log("Transaction signature:", signature);
    } catch (error) {
      console.error("Transaction failed:", error);
    }

    if (create) {
      console.log("Init on ramp: " + onRamp);
    }
    if (crank) {
      console.log("Cranked replenish for: " + voteAccount);
    }
    console.log("");

    // const onrampAcc = await connection.getAccountInfo(onRamp);
    // const onrampDecoded = getStakeAccount(onrampAcc.data);
    // console.log("--------On Ramp Account----");
    // console.log("stake: " + onrampDecoded.stake.delegation.stake.toString());
    // console.log("lamps: " + onrampAcc.lamports);

    // const stakeAcc = await connection.getAccountInfo(poolStake);
    // const stakeDecoded = getStakeAccount(stakeAcc.data);
    // console.log("--------Main stake Account----");
    // console.log("stake: " + stakeDecoded.stake.delegation.stake.toString());
    // console.log("lamps: " + stakeAcc.lamports);
  }
}

main().catch((err) => {
  console.error(err);
});

/**
 * JSON file format of our staked banks endpoint
 * (https://storage.googleapis.com/mrgn-public/mrgn-staked-bank-metadata-cache.json)
 */
type PoolEntry = {
  bankAddress: string;
  validatorVoteAccount: string;
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
};
