import {
  Connection,
  PublicKey,
  StakeAuthorizationLayout,
  StakeProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { loadKeypairFromFile, SINGLE_POOL_PROGRAM_ID } from "../scripts/utils";
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { SinglePoolInstruction } from "@solana/spl-single-pool-classic";
/** Set to true the first time you run this script for a given wallet/pool */
const createAta = true;

type Config = {
  /** There's probably a way to derive this...
   *
   * Note that this must be INACTIVE if the stake pool is currently activating (like it was created
   * recently), otherwise it must ACTIVE (the vast majority of the time, this is the case)
   *
   * This must be a native stake account that's delegated to the validator that the STAKE_POOL is
   * created for.
   */
  NATIVE_STAKE_ACCOUNT: PublicKey;
  STAKE_POOL: PublicKey;
};

const config: Config = {
  NATIVE_STAKE_ACCOUNT: new PublicKey("7k5fKNS1jPxuWf9cvaSiFqvpJvDgXLTwUpCi3UQC97P2"),
  STAKE_POOL: new PublicKey("3jWfwA53i3wD55YbcngzQpe7QW39uW84YnsxN18b1Z9H"),
};

async function main() {
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");
  console.log("wallet: " + wallet.publicKey);

  // Equivalent to findPoolMintAddress
  const [lstMint] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint"), config.STAKE_POOL.toBuffer()],
    SINGLE_POOL_PROGRAM_ID
  );
  // Equivalent to findPoolStakeAuthorityAddress
  const [auth] = PublicKey.findProgramAddressSync(
    [Buffer.from("stake_authority"), config.STAKE_POOL.toBuffer()],
    SINGLE_POOL_PROGRAM_ID
  );
  const lstAta = getAssociatedTokenAddressSync(lstMint, wallet.publicKey);

  const ixes: TransactionInstruction[] = [];
  if (createAta) {
    ixes.push(createAssociatedTokenAccountInstruction(wallet.publicKey, lstAta, wallet.publicKey, lstMint));
  }

  const authorizeStakerIxes = StakeProgram.authorize({
    stakePubkey: config.NATIVE_STAKE_ACCOUNT,
    authorizedPubkey: wallet.publicKey,
    newAuthorizedPubkey: auth,
    stakeAuthorizationType: StakeAuthorizationLayout.Staker,
  }).instructions;

  ixes.push(...authorizeStakerIxes);

  const authorizeWithdrawIxes = StakeProgram.authorize({
    stakePubkey: config.NATIVE_STAKE_ACCOUNT,
    authorizedPubkey: wallet.publicKey,
    newAuthorizedPubkey: auth,
    stakeAuthorizationType: StakeAuthorizationLayout.Withdrawer,
  }).instructions;

  ixes.push(...authorizeWithdrawIxes);

  const depositIx = await SinglePoolInstruction.depositStake(
    config.STAKE_POOL,
    config.NATIVE_STAKE_ACCOUNT,
    lstAta,
    wallet.publicKey
  );

  ixes.push(depositIx);

  const transaction = new Transaction();
  transaction.add(...ixes);

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
    console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  console.log("svsp deposit of " + config.NATIVE_STAKE_ACCOUNT + " done, vouchers to go ATA: " + lstAta);
}

main().catch((err) => {
  console.error(err);
});
