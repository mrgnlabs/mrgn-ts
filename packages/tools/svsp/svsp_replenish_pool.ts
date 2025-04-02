// This create the on-ramp for svsp accounts to be able to redeem MEV rewards
import {
  Connection,
  Keypair,
  PublicKey,
  sendAndConfirmTransaction,
  StakeProgram,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
import { loadKeypairFromFile } from "../scripts/utils";
import {
  createPoolOnramp,
  deriveOnRampPool,
  deriveStakePool,
  deriveSVSPpool,
  getEpochAndSlot,
  getStakeAccount,
  replenishPool,
} from "./stake-utils";
import dotenv from "dotenv";

dotenv.config();

type Config = {
  VOTE_ACCOUNT: PublicKey;
};
const config: Config = {
  VOTE_ACCOUNT: new PublicKey("J2nUHEAgZFRyuJbFjdqPrAa9gyWDuc7hErtDQHPhsYRp"),
};

async function main() {
  console.log(process.env.PRIVATE_RPC_ENDPOINT);
  const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT, "confirmed");
  const wallet = loadKeypairFromFile(process.env.MARGINFI_WALLET);
  console.log("payer: " + wallet.publicKey);

  const [svspPool] = deriveSVSPpool(config.VOTE_ACCOUNT);
  const [poolStake] = deriveStakePool(svspPool);
  // const [poolAuthority] = deriveStakeAuthority(svspPool);
  const [onRamp] = deriveOnRampPool(svspPool);

  const replenishIx = replenishPool(config.VOTE_ACCOUNT);
  let tx = new Transaction().add(replenishIx);

  try {
    const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
    console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  console.log();
  const { epoch, slot } = await getEpochAndSlot(connection);
  console.log("It's epoch: " + epoch + " slot " + slot);
  console.log();

  const onrampAcc = await connection.getAccountInfo(onRamp);
  const onrampDecoded = getStakeAccount(onrampAcc.data);
  console.log("--------On Ramp Account----");
  console.log("stake: " + onrampDecoded.stake.delegation.stake.toString());
  console.log("lamps: " + onrampAcc.lamports);
  console.log();

  const stakeAcc = await connection.getAccountInfo(poolStake);
  const stakeDecoded = getStakeAccount(stakeAcc.data);
  console.log("--------Main stake Account----");
  console.log("stake: " + stakeDecoded.stake.delegation.stake.toString());
  console.log("lamps: " + stakeAcc.lamports);
}

main().catch((err) => {
  console.error(err);
});
