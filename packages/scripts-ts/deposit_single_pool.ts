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
import { loadKeypairFromFile, SINGLE_POOL_PROGRAM_ID } from "./utils";
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { SinglePoolInstruction } from "@solana/spl-single-pool-classic";
/** Set to true the first time you run this script for a given wallet/pool */
const createAta = false;

type Config = {
  PROGRAM_ID: string;
  /** There's probably a way to derive this... 
   *
   * Note that this must be INACTIVE if the stake pool is currently activating (like it was created
   * recently), otherwise it must ACTIVE (the vast majority of the time, this is the case)
  */
  NATIVE_STAKE_ACCOUNT: PublicKey;
  STAKE_POOL: PublicKey;
  /** In native decimals */
  AMOUNT: BN;
};

const config: Config = {
  PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
  NATIVE_STAKE_ACCOUNT: new PublicKey("CBkEBnagcbmZrmbg9yV1d1gWxi6tmuR26616XXwVwus"),
  STAKE_POOL: new PublicKey("AvS4oXtxWdrJGCJwDbcZ7DqpSqNQtKjyXnbkDbrSk6Fq"),
  AMOUNT: new BN(0.002 * 10 ** 9), // sol has 9 decimals
};

async function main() {
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/phantom-wallet.json");
  console.log("wallet: " + wallet.publicKey);

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

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

  //console.log("deposit: " + config.AMOUNT.toString() + " to " + config.BANK);
}

main().catch((err) => {
  console.error(err);
});
