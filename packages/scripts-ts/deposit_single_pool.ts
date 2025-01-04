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
import { Marginfi } from "../marginfi-client-v2/src/idl/marginfi-types";
import marginfiIdl from "../marginfi-client-v2/src/idl/marginfi.json";
import { loadKeypairFromFile, SINGLE_POOL_PROGRAM_ID } from "./utils";
import { createAssociatedTokenAccountInstruction, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { SinglePoolInstruction } from "@solana/spl-single-pool-classic";

type Config = {
  PROGRAM_ID: string;
  /** There's probably a way to derive this... */
  NATIVE_STAKE_ACCOUNT: PublicKey;
  STAKE_POOL: PublicKey;
  /** In native decimals */
  AMOUNT: BN;
};

const config: Config = {
  PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
  NATIVE_STAKE_ACCOUNT: new PublicKey("DEiot5s9VCUDxmsQbtsY33fZ7DkcTUzQvodgudnzLz7A"),
  STAKE_POOL: new PublicKey("AvS4oXtxWdrJGCJwDbcZ7DqpSqNQtKjyXnbkDbrSk6Fq"),
  AMOUNT: new BN(0.05 * 10 ** 9), // sol has 9 decimals
};

async function main() {
  marginfiIdl.address = config.PROGRAM_ID;
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/phantom-wallet.json");
  console.log("wallet: " + wallet.publicKey);

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

  const program = new Program<Marginfi>(
    // @ts-ignore
    marginfiIdl as Marginfi,
    provider
  );

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
  try {
    await connection.getAccountInfo(lstAta);
    console.log("Existing LST ata at: " + lstAta);
  } catch (err) {
    console.log("Failed to find ata, creating: " + lstAta);

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
