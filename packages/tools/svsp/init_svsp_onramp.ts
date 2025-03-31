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
import { DEFAULT_API_URL, loadEnvFile, loadKeypairFromFile } from "../scripts/utils";
import {
  createPoolOnramp,
  deriveOnRampPool,
  deriveStakePool,
  deriveSVSPpool,
  getStakeAccount,
  replenishPool,
} from "./stake-utils";

/** True to create the svsp on-ramp, false to skip */
const create = true;
/** True to crank the svsp on-ramp, false to skip */
const crank = true;

type Config = {
  VOTE_ACCOUNT: PublicKey;
};
const config: Config = {
  VOTE_ACCOUNT: new PublicKey("9us7TgKiJSz5fqT5Eb8ghV6b2C87zxv2VbXUWbbK5GRJ"),
};

async function main() {
  loadEnvFile(".env.api");
  const apiUrl = process.env.API_URL || DEFAULT_API_URL;
  console.log("api: " + apiUrl);
  const connection = new Connection(apiUrl, "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");
  console.log("payer: " + wallet.publicKey);

  const [svspPool] = deriveSVSPpool(config.VOTE_ACCOUNT);
  const [poolStake] = deriveStakePool(svspPool);
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
    const createIx = createPoolOnramp(config.VOTE_ACCOUNT);
    tx.add(rentIx, createIx);
  }
  if (crank) {
    const replenishIx = replenishPool(config.VOTE_ACCOUNT);
    tx.add(replenishIx);
  }

  try {
    const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
    console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  console.log("On ramp account: " + onRamp);

  const onrampAcc = await connection.getAccountInfo(onRamp);
  const onrampDecoded = getStakeAccount(onrampAcc.data);
  console.log("--------On Ramp Account----");
  console.log("stake: " + onrampDecoded.stake.delegation.stake.toString());
  console.log("lamps: " + onrampAcc.lamports);

  const stakeAcc = await connection.getAccountInfo(poolStake);
  const stakeDecoded = getStakeAccount(stakeAcc.data);
  console.log("--------Main stake Account----");
  console.log("stake: " + stakeDecoded.stake.delegation.stake.toString());
  console.log("lamps: " + stakeAcc.lamports);
}

main().catch((err) => {
  console.error(err);
});