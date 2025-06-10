// Run deposit_single_pool first to convert to LST. In production, these will likely be atomic.
import { Connection, Keypair, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Marginfi } from "@mrgnlabs/marginfi-client-v2/src/idl/marginfi-types_0.1.3";
import marginfiIdl from "../../marginfi-client-v2/src/idl/marginfi_0.1.3.json";
import { loadKeypairFromFile, SINGLE_POOL_PROGRAM_ID } from "./utils";
import { getAssociatedTokenAddressSync } from "@mrgnlabs/mrgn-common";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

type Config = {
  PROGRAM_ID: string;
  ACCOUNT: PublicKey;
  BANK: PublicKey;
  STAKE_POOL: PublicKey;
  /** In native decimals */
  AMOUNT: BN;
};

const config: Config = {
  PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
  ACCOUNT: new PublicKey("E3uJyxW232EQAVZ9P9V6CFkxzjqqVdbh8XvUmxtZdGUt"),
  BANK: new PublicKey("3jt43usVm7qL1N5qPvbzYHWQRxamPCRhri4CxwDrf6aL"),
  STAKE_POOL: new PublicKey("AvS4oXtxWdrJGCJwDbcZ7DqpSqNQtKjyXnbkDbrSk6Fq"),
  AMOUNT: new BN(0.01 * 10 ** 9), // sol has 9 decimals
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

  const [lstMint] = PublicKey.findProgramAddressSync(
    [Buffer.from("mint"), config.STAKE_POOL.toBuffer()],
    SINGLE_POOL_PROGRAM_ID
  );
  const lstAta = getAssociatedTokenAddressSync(lstMint, wallet.publicKey);

  const depositUpToLimit = false;
  const transaction = new Transaction();
  transaction.add(
    await program.methods
      .lendingAccountDeposit(config.AMOUNT, depositUpToLimit)
      .accounts({
        marginfiAccount: config.ACCOUNT,
        bank: config.BANK,
        signerTokenAccount: lstAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction()
  );

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
    console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  console.log("deposit: " + config.AMOUNT.toString() + " to " + config.BANK);
}

main().catch((err) => {
  console.error(err);
});
