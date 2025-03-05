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
import { createPoolOnramp, deriveOnRampPool, deriveSVSPpool, getStakeAccount } from "./stake-utils";

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

  const rent = await connection.getMinimumBalanceForRentExemption(StakeProgram.space);
  const rentIx = SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: onRamp,
    lamports: rent,
  });
  const createIx = createPoolOnramp(config.VOTE_ACCOUNT);
  let tx = new Transaction().add(rentIx, createIx);

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

// it("Realize income from MEV rewards", async () => {
//   // First, create the on-ramp account that will temporarily stake MEV rewards
//   const [onRampPoolKey] = deriveOnRampPool(validators[0].splPool);
//   const rent =
//     await bankRunProvider.connection.getMinimumBalanceForRentExemption(
//       StakeProgram.space
//     );
//   const rentIx = SystemProgram.transfer({
//     fromPubkey: wallet.payer.publicKey,
//     toPubkey: onRampPoolKey,
//     lamports: rent,
//   });
//   const ix = createPoolOnramp(validators[0].voteAccount);
//   let initOnRampTx = new Transaction().add(rentIx, ix);
//   initOnRampTx.recentBlockhash = await getBankrunBlockhash(bankrunContext);
//   initOnRampTx.sign(wallet.payer); // pays the tx fee and rent
//   await banksClient.processTransaction(initOnRampTx);

//   const onRampAccBefore = await bankRunProvider.connection.getAccountInfo(
//     onRampPoolKey
//   );
//   const onRampBefore = getStakeAccount(onRampAccBefore.data);
//   const stakeBefore = onRampBefore.stake.delegation.stake.toString();
//   if (verbose) {
//     console.log("On ramp lamps: " + onRampAccBefore.lamports);
//     console.log(" (rent was:    " + rent + ")");
//     console.log("On ramp stake: " + stakeBefore);
//   }

//   let { epoch: epochBeforeWarp, slot: slotBeforeWarp } =
//     await getEpochAndSlot(banksClient);
//   bankrunContext.warpToEpoch(BigInt(epochBeforeWarp + 1));
//   let { epoch: epochAfterWarp, slot: slotAfterWarp } = await getEpochAndSlot(
//     banksClient
//   );
//   for (let i = 0; i < 3; i++) {
//     bankrunContext.warpToSlot(BigInt(i + slotAfterWarp + 1));
//     const dummyTx = new Transaction();
//     dummyTx.add(
//       SystemProgram.transfer({
//         fromPubkey: users[0].wallet.publicKey,
//         toPubkey: bankrunProgram.provider.publicKey,
//         lamports: i,
//       })
//     );
//     dummyTx.recentBlockhash = await getBankrunBlockhash(bankrunContext);
//     dummyTx.sign(users[0].wallet);
//     await banksClient.processTransaction(dummyTx);
//   }

//   let { epoch, slot } = await getEpochAndSlot(banksClient);
//   if (verbose) {
//     console.log("It is now epoch: " + epoch + " slot " + slot);
//   }

//   // Next, the replenish crank cycles free SOL into the "on ramp" pool
//   let replenishTx = new Transaction().add(
//     replenishPool(validators[0].voteAccount)
//   );
//   replenishTx.recentBlockhash = await getBankrunBlockhash(bankrunContext);
//   replenishTx.sign(wallet.payer); // pays the tx fee and rent
//   let result = await banksClient.tryProcessTransaction(replenishTx);
//   dumpBankrunLogs(result);

//   const onRampAccAfter = await bankRunProvider.connection.getAccountInfo(
//     onRampPoolKey
//   );
//   const onRampAfter = getStakeAccount(onRampAccAfter.data);
//   const stakeAfter = onRampAfter.stake.delegation.stake.toString();
//   if (verbose) {
//     console.log("On ramp lamps: " + onRampAccAfter.lamports);
//     console.log(" (rent was:    " + rent + ")");
//     console.log("On ramp stake: " + stakeAfter);
//   }
// });
