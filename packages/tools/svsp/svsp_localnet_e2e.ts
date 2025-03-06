// Note: state a validator in a local terminal first. Make sure --ticks-per-slot 8 --slots-per-epoch
// 32 \ so epochs elapse very quickly
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  sendAndConfirmTransaction,
  StakeAuthorizationLayout,
  StakeProgram,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  VoteInit,
  VoteProgram,
} from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { loadKeypairFromFile } from "../scripts/utils";
import {
  createPoolOnramp,
  createStakeAccount,
  delegateStake,
  deriveOnRampPool,
  deriveStakeAuthority,
  deriveStakeMint,
  deriveStakePool,
  deriveSVSPpool,
  getEpochAndSlot,
  getStakeAccount,
  replenishPool,
  waitUntil,
} from "./stake-utils";
import { SinglePoolInstruction, SinglePoolProgram } from "@solana/spl-single-pool-classic";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { createAssociatedTokenAccountInstruction } from "@solana/spl-token";

const toStake = 2 * LAMPORTS_PER_SOL;
const toMockMev = 2 * LAMPORTS_PER_SOL;

async function main() {
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");
  console.log("payer: " + wallet.publicKey);

  const voteAccount = await initValidator(wallet);
  await initSinglePool(wallet, voteAccount);
  const stakeAcc = await initUserStakeAcc(wallet, toStake);
  await delegateUserStake(wallet, voteAccount, stakeAcc);

  console.log("Waiting a while...");
  await waitUntil(Date.now() / 1000 + 3);

  await depositIntoSinglePool(wallet, voteAccount, stakeAcc);
  await sendMockMev(wallet, voteAccount);
  await initSvspOnRamp(wallet, voteAccount);
  await svspReplenishPool(wallet, voteAccount);

  console.log("Waiting a while...");
  await waitUntil(Date.now() / 1000 + 3);

  await svspReplenishPool(wallet, voteAccount);

  console.log("Waiting a while...");
  await waitUntil(Date.now() / 1000 + 3);

  await svspReplenishPool(wallet, voteAccount);
}

export async function svspReplenishPool(wallet: Keypair, voteAccount: PublicKey) {
  const connection = new Connection("http://127.0.0.1:8899", "finalized");
  const [svspPool] = deriveSVSPpool(voteAccount);
  const [poolStake] = deriveStakePool(svspPool);
  const [onRamp] = deriveOnRampPool(svspPool);

  const replenishIx = replenishPool(voteAccount);
  let tx = new Transaction().add(replenishIx);

  try {
    const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
    // console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  console.log();
  console.log("-----REPLENISHED SVSP----");
  const { epoch, slot } = await getEpochAndSlot(connection);
  console.log("It's epoch: " + epoch + " slot " + slot);
  console.log();

  const onrampAcc = await connection.getAccountInfo(onRamp);
  const onrampDecoded = getStakeAccount(onrampAcc.data);
  console.log("--------On Ramp Account----");
  console.log("stake: " + onrampDecoded.stake.delegation.stake.toString());
  /**
   * Note: The "stake" field is INVALID if the discriminator is not 2 (Stake in the StakeStatev2 enum)
   */
  const discrimOnRamp = onrampDecoded.discriminant;
  console.log("discrim: " + discrimOnRamp + " stake is valid: " + (discrimOnRamp == 2));
  console.log("lamps: " + onrampAcc.lamports);
  console.log();

  const stakeAcc = await connection.getAccountInfo(poolStake);
  const stakeDecoded = getStakeAccount(stakeAcc.data);
  console.log("stake: " + stakeDecoded.stake.delegation.stake.toString());
  const discrimStake = stakeDecoded.discriminant;
  console.log("discrim: " + discrimStake + " stake is valid: " + (discrimStake == 2));
  console.log("lamps: " + stakeAcc.lamports);
  console.log("");
}

export async function initSvspOnRamp(wallet: Keypair, voteAccount: PublicKey) {
  const connection = new Connection("http://127.0.0.1:8899", "finalized");
  const [svspPool] = deriveSVSPpool(voteAccount);
  const [poolStake] = deriveStakePool(svspPool);
  // const [poolAuthority] = deriveStakeAuthority(svspPool);
  const [onRamp] = deriveOnRampPool(svspPool);

  const rent = await connection.getMinimumBalanceForRentExemption(StakeProgram.space);
  const rentIx = SystemProgram.transfer({
    fromPubkey: wallet.publicKey,
    toPubkey: onRamp,
    lamports: rent,
  });
  const createIx = createPoolOnramp(voteAccount);
  let tx = new Transaction().add(rentIx, createIx);

  try {
    const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
    // console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  console.log("-----INIT ON RAMP----");
  console.log("On ramp account: " + onRamp);

  const onrampAcc = await connection.getAccountInfo(onRamp);
  const onrampDecoded = getStakeAccount(onrampAcc.data);
  console.log("--------On Ramp Account----");
  console.log("stake: " + onrampDecoded.stake.delegation.stake.toString());
  console.log("lamps: " + onrampAcc.lamports);
  console.log("");

  const stakeAcc = await connection.getAccountInfo(poolStake);
  const stakeDecoded = getStakeAccount(stakeAcc.data);
  console.log("--------Main stake Account----");
  console.log("stake: " + stakeDecoded.stake.delegation.stake.toString());
  console.log("lamps: " + stakeAcc.lamports);
  console.log("");
}

export async function sendMockMev(wallet: Keypair, voteAccount: PublicKey) {
  const connection = new Connection("http://127.0.0.1:8899", "finalized");
  const [poolKey] = deriveSVSPpool(voteAccount);
  const [poolStake] = deriveStakePool(poolKey);
  const [onRamp] = deriveOnRampPool(poolKey);

  let tx = new Transaction();
  tx.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: poolStake,
      lamports: toMockMev,
    })
  );

  try {
    const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
    // console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  console.log("sent fake mev: " + toMockMev + " to stake account: " + poolStake + " which belongs to pool " + poolKey);

  const onrampAcc = await connection.getAccountInfo(onRamp);
  if (onrampAcc) {
    const onrampDecoded = getStakeAccount(onrampAcc.data);
    console.log("--------On Ramp Account----");
    console.log("stake: " + onrampDecoded.stake.delegation.stake.toString());
    console.log("lamps: " + onrampAcc.lamports);
    console.log("");
  } else {
    console.log("On Ramp does not yet exist!");
    console.log("");
  }

  const stakeAcc = await connection.getAccountInfo(poolStake);
  const stakeDecoded = getStakeAccount(stakeAcc.data);
  console.log("--------Main stake Account----");
  console.log("stake: " + stakeDecoded.stake.delegation.stake.toString());
  console.log("lamps: " + stakeAcc.lamports);
  console.log("");
}

export async function depositIntoSinglePool(wallet: Keypair, voteAccount: PublicKey, userStakeAccount: PublicKey) {
  const connection = new Connection("http://127.0.0.1:8899", "finalized");
  const [poolKey] = deriveSVSPpool(voteAccount);
  const [poolStake] = deriveStakePool(poolKey);
  const [lstMint] = deriveStakeMint(poolKey);
  const [auth] = deriveStakeAuthority(poolKey);
  const lstAta = getAssociatedTokenAddressSync(lstMint, wallet.publicKey);
  console.log("poolKey: " + poolKey);
  console.log("poolStake: " + poolStake);
  console.log("lstMint: " + lstMint);
  console.log("auth: " + auth);

  const ixes: TransactionInstruction[] = [];
  ixes.push(createAssociatedTokenAccountInstruction(wallet.publicKey, lstAta, wallet.publicKey, lstMint));

  const authorizeStakerIxes = StakeProgram.authorize({
    stakePubkey: userStakeAccount,
    authorizedPubkey: wallet.publicKey,
    newAuthorizedPubkey: auth,
    stakeAuthorizationType: StakeAuthorizationLayout.Staker,
  }).instructions;

  ixes.push(...authorizeStakerIxes);

  const authorizeWithdrawIxes = StakeProgram.authorize({
    stakePubkey: userStakeAccount,
    authorizedPubkey: wallet.publicKey,
    newAuthorizedPubkey: auth,
    stakeAuthorizationType: StakeAuthorizationLayout.Withdrawer,
  }).instructions;

  ixes.push(...authorizeWithdrawIxes);

  const depositIx = await SinglePoolInstruction.depositStake(poolKey, userStakeAccount, lstAta, wallet.publicKey);

  ixes.push(depositIx);

  const transaction = new Transaction();
  transaction.add(...ixes);

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
    // console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  console.log("svsp deposit of " + userStakeAccount + " done, vouchers to go ATA: " + lstAta);
  console.log("");
}

export async function delegateUserStake(wallet: Keypair, voteAccount: PublicKey, stakeAccount: PublicKey) {
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  let delegateTx = delegateStake(wallet.publicKey, stakeAccount, voteAccount);

  try {
    const signature = await sendAndConfirmTransaction(connection, delegateTx, [wallet]);
    // console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  console.log("Delegated " + stakeAccount + " to " + voteAccount);
  console.log("");
}

export async function initUserStakeAcc(wallet: Keypair, amt: number) {
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  let { createTx, stakeAccountKeypair } = createStakeAccount(wallet.publicKey, amt);

  try {
    const signature = await sendAndConfirmTransaction(connection, createTx, [wallet, stakeAccountKeypair]);
    // console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  console.log("Stake account: " + stakeAccountKeypair.publicKey);
  console.log("");

  return stakeAccountKeypair.publicKey;
}

export async function initSinglePool(wallet: Keypair, voteAccount: PublicKey) {
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const [poolKey] = deriveSVSPpool(voteAccount);
  const [poolStake] = deriveStakePool(poolKey);

  let tx = new Transaction();
  tx.add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: poolStake,
      lamports: LAMPORTS_PER_SOL * 1.1,
    })
  );

  tx.add(...(await SinglePoolProgram.initialize(connection, voteAccount, wallet.publicKey, true)).instructions);

  try {
    const signature = await sendAndConfirmTransaction(connection, tx, [wallet]);
    // console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  console.log("svsp pool:  " + poolKey);
  console.log("stake acc:  " + poolStake);
  console.log("");
}

export async function initValidator(wallet: Keypair) {
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  let authorizedVoter = wallet.publicKey;
  let authorizedWithdrawer = wallet.publicKey;
  console.log("payer, authorized voted and withdrawer: " + wallet.publicKey);

  const voteAccountKeypair = Keypair.generate();
  const node = Keypair.generate();

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });
  const tx = new Transaction().add(
    // Create the vote account
    SystemProgram.createAccount({
      fromPubkey: authorizedVoter,
      newAccountPubkey: voteAccountKeypair.publicKey,
      lamports: await provider.connection.getMinimumBalanceForRentExemption(VoteProgram.space),
      space: VoteProgram.space,
      programId: VoteProgram.programId,
    }),
    // Initialize the vote account
    VoteProgram.initializeAccount({
      votePubkey: voteAccountKeypair.publicKey,
      nodePubkey: node.publicKey,
      voteInit: new VoteInit(node.publicKey, authorizedVoter, authorizedWithdrawer, 0),
    })
  );

  try {
    const signature = await sendAndConfirmTransaction(connection, tx, [wallet, voteAccountKeypair, node]);
    // console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  console.log("vote account: " + voteAccountKeypair.publicKey);

  return voteAccountKeypair.publicKey;
}

main().catch((err) => {
  console.error(err);
});
