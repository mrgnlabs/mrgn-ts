// Run deposit_single_pool first to convert to LST. In production, these will likely be atomic.
import {
  AccountMeta,
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Marginfi } from "../marginfi-client-v2/src/idl/marginfi-types";
import marginfiIdl from "../marginfi-client-v2/src/idl/marginfi.json";
import { DEFAULT_API_URL, loadEnvFile, loadKeypairFromFile, SINGLE_POOL_PROGRAM_ID } from "./utils";
import {
  createAssociatedTokenAccountIdempotent,
  createAssociatedTokenAccountInstruction,
  createSyncNativeInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { createAssociatedTokenAccountIdempotentInstruction } from "@mrgnlabs/mrgn-common";

type Config = {
  PROGRAM_ID: string;
  GROUP: PublicKey;
  ACCOUNT: PublicKey;
  BANK: PublicKey;
  STAKE_POOL?: PublicKey;
  MINT: PublicKey;
  /** In native decimals */
  AMOUNT: BN;
  /** For each balance the user has, in order, pass
   * * bank0, oracle0, bank1, oracle1, etc
   * 
   * if a bank is a STAKED COLLATERAL bank, also pass the LST mint and SOL pool, like:
   * * bank0, oracle0, lstMint0, solPool0, bank1, oracle1
   * 
   * You can derive these with:
    ```
    const [lstMint] = PublicKey.findProgramAddressSync(
        [Buffer.from("mint"), config.STAKE_POOL.toBuffer()],
        SINGLE_POOL_PROGRAM_ID
    );
    ```
     and
    ```
    const [pool] = PublicKey.findProgramAddressSync(
        [Buffer.from("stake"), config.STAKE_POOL.toBuffer()],
        SINGLE_POOL_PROGRAM_ID
    );
    ```
   * or read them from the bank directly (oracles[1] and oracles[2])
   * */
  REMAINING: PublicKey[];
};

const examples = {
  borrowJupSOLAgainstUSDC: {
    PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
    GROUP: new PublicKey("FCPfpHA69EbS8f9KKSreTRkXbzFpunsKuYf5qNmnJjpo"),
    ACCOUNT: new PublicKey("2GMbwepeyW5xzgm3cQLivdPWLydrFevLy2iBbZab3pd6"),
    BANK: new PublicKey("EJuhmswifV6wumS28Sfr5W8B18CJ29m1ZNKkhbhbYDCA"),
    MINT: new PublicKey("jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v"),
    AMOUNT: new BN(0.0005 * 10 ** 9), // jupsol has 9 decimals
    REMAINING: [
      new PublicKey("Ek5JSFJFD8QgXM6rPDCzf31XhDp1q3xezaWYSkJWqbqc"), // usdc bank
      new PublicKey("Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX"), // usdc oracle
      new PublicKey("EJuhmswifV6wumS28Sfr5W8B18CJ29m1ZNKkhbhbYDCA"), // jupsol bank
      new PublicKey("HX5WM3qzogAfRCjBUWwnniLByMfFrjm1b5yo4KoWGR27"), // jupsol oracle
    ],
  },
  borrowSOLAgainstUSDC: {
    PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
    GROUP: new PublicKey("FCPfpHA69EbS8f9KKSreTRkXbzFpunsKuYf5qNmnJjpo"),
    ACCOUNT: new PublicKey("2GMbwepeyW5xzgm3cQLivdPWLydrFevLy2iBbZab3pd6"),
    BANK: new PublicKey("3evdJSa25nsUiZzEUzd92UNa13TPRJrje1dRyiQP5Lhp"),
    MINT: new PublicKey("So11111111111111111111111111111111111111112"),
    AMOUNT: new BN(0.0005 * 10 ** 9), // sol has 9 decimals
    REMAINING: [
      new PublicKey("Ek5JSFJFD8QgXM6rPDCzf31XhDp1q3xezaWYSkJWqbqc"), // usdc bank
      new PublicKey("Dpw1EAVrSB1ibxiDQyTAW6Zip3J4Btk2x4SgApQCeFbX"), // usdc oracle
      new PublicKey("EJuhmswifV6wumS28Sfr5W8B18CJ29m1ZNKkhbhbYDCA"), // jupsol bank
      new PublicKey("HX5WM3qzogAfRCjBUWwnniLByMfFrjm1b5yo4KoWGR27"), // jupsol oracle
      new PublicKey("3evdJSa25nsUiZzEUzd92UNa13TPRJrje1dRyiQP5Lhp"), // sol bank
      new PublicKey("7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE"), // sol oracle
    ],
  },
  borrowSOLAgainstStakedSOL: {
    PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
    GROUP: new PublicKey("FCPfpHA69EbS8f9KKSreTRkXbzFpunsKuYf5qNmnJjpo"),
    ACCOUNT: new PublicKey("7SBEjeEjhzRvWsrTq7UiNWBLjcYwE1hdbmMK5wUaeVhU"),
    BANK: new PublicKey("3evdJSa25nsUiZzEUzd92UNa13TPRJrje1dRyiQP5Lhp"),
    STAKE_POOL: new PublicKey("AvS4oXtxWdrJGCJwDbcZ7DqpSqNQtKjyXnbkDbrSk6Fq"),
    MINT: new PublicKey("So11111111111111111111111111111111111111112"),
    AMOUNT: new BN(0.00002 * 10 ** 6), // usdc has 6 decimals
    REMAINING: [
      new PublicKey("3jt43usVm7qL1N5qPvbzYHWQRxamPCRhri4CxwDrf6aL"), // staked sol bank
      new PublicKey("7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE"), // staked sol oracle
      new PublicKey("BADo3D6nMtGnsAaTv3iEes8mMcq92TuFoBWebFe8kzeA"), // lst mint
      new PublicKey("AvS4oXtxWdrJGCJwDbcZ7DqpSqNQtKjyXnbkDbrSk6Fq"), // lst pool
      new PublicKey("3evdJSa25nsUiZzEUzd92UNa13TPRJrje1dRyiQP5Lhp"), // usdc bank
      new PublicKey("7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE"), // usdc oracle
    ],
  },
};

const config: Config = examples.borrowJupSOLAgainstUSDC;

// const config: Config = {
//   PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
//   GROUP: new PublicKey("FCPfpHA69EbS8f9KKSreTRkXbzFpunsKuYf5qNmnJjpo"),
//   ACCOUNT: new PublicKey("E3uJyxW232EQAVZ9P9V6CFkxzjqqVdbh8XvUmxtZdGUt"),
//   BANK: new PublicKey("3evdJSa25nsUiZzEUzd92UNa13TPRJrje1dRyiQP5Lhp"),
//   STAKE_POOL: new PublicKey("AvS4oXtxWdrJGCJwDbcZ7DqpSqNQtKjyXnbkDbrSk6Fq"),
//   MINT: new PublicKey("So11111111111111111111111111111111111111112"),
//   AMOUNT: new BN(0.0002 * 10 ** 9), // sol has 9 decimals
//   REMAINING: [
//     new PublicKey("3jt43usVm7qL1N5qPvbzYHWQRxamPCRhri4CxwDrf6aL"),
//     new PublicKey("7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE"),
//     new PublicKey("BADo3D6nMtGnsAaTv3iEes8mMcq92TuFoBWebFe8kzeA"), // lst mint
//     new PublicKey("3e8RuaQMCPASZSMJAskHX6ZfuTtQ3JvoNPFoEvaVRn78"), // lst pool
//     new PublicKey("3evdJSa25nsUiZzEUzd92UNa13TPRJrje1dRyiQP5Lhp"),
//     new PublicKey("7UVimffxr9ow1uXYxsr4LHAcV58mLzhmwaeKvJ1pjLiE"),
//   ],
// };

async function main() {
  marginfiIdl.address = config.PROGRAM_ID;
  loadEnvFile(".env.api");
  const apiUrl = process.env.API_URL || DEFAULT_API_URL;
  console.log("api: " + apiUrl);
  const connection = new Connection(apiUrl, "confirmed");
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

  if (config.STAKE_POOL) {
    // Equivalent to findPoolMintAddress
    const [lstMint] = PublicKey.findProgramAddressSync(
      [Buffer.from("mint"), config.STAKE_POOL.toBuffer()],
      SINGLE_POOL_PROGRAM_ID
    );
    // Equivalent to findPoolStakeAuthorityAddress
    const [pool] = PublicKey.findProgramAddressSync(
      [Buffer.from("stake"), config.STAKE_POOL.toBuffer()],
      SINGLE_POOL_PROGRAM_ID
    );
    console.log("mint: " + lstMint + " pool " + pool);
  }

  const oracleMeta: AccountMeta[] = config.REMAINING.map((pubkey) => ({
    pubkey,
    isSigner: false,
    isWritable: false,
  }));

  const ata = getAssociatedTokenAddressSync(config.MINT, wallet.publicKey);
  const transaction = new Transaction();
  transaction.add(
    createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, ata, wallet.publicKey, config.MINT)
  );

  transaction.add(
    await program.methods
      .lendingAccountBorrow(config.AMOUNT)
      .accounts({
        marginfiGroup: config.GROUP,
        marginfiAccount: config.ACCOUNT,
        signer: wallet.publicKey,
        bank: config.BANK,
        destinationTokenAccount: ata,
        // bankLiquidityVaultAuthority = deriveLiquidityVaultAuthority(id, bank);
        // bankLiquidityVault = deriveLiquidityVault(id, bank)
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .remainingAccounts(oracleMeta)
      .instruction()
  );

  const priorityFee = 100000; // 0.0001 SOL (100,000 lamports)
  transaction.instructions.unshift(ComputeBudgetProgram.setComputeUnitPrice({ microLamports: priorityFee }));

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
    console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  console.log("borrow: " + config.AMOUNT.toString() + " from " + config.BANK);
}

main().catch((err) => {
  console.error(err);
});
