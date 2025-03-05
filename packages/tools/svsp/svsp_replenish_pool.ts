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

type Config = {
  VOTE_ACCOUNT: PublicKey;
};
const config: Config = {
  VOTE_ACCOUNT: new PublicKey("9us7TgKiJSz5fqT5Eb8ghV6b2C87zxv2VbXUWbbK5GRJ"),
};

async function main() {
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");
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
