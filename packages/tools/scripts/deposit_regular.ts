// Run deposit_single_pool first to convert to LST. In production, these will likely be atomic.
import { Connection, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Marginfi } from "@mrgnlabs/marginfi-client-v2/src/idl/marginfi-types_0.1.3";
import marginfiIdl from "../../marginfi-client-v2/src/idl/marginfi_0.1.3.json";
import { DEFAULT_API_URL, loadEnvFile, loadKeypairFromFile } from "./utils";
import {
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { createSyncNativeInstruction, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } from "@mrgnlabs/mrgn-common";

type Config = {
  PROGRAM_ID: string;
  GROUP: PublicKey;
  ACCOUNT: PublicKey;
  BANK: PublicKey;
  MINT: PublicKey;
  /** In native decimals */
  AMOUNT: BN;
};

const examples = {
  depositUSDCArena: {
    PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
    GROUP: new PublicKey("4qft5jS6ZkQtBX8WiSFYw9DUNTJcqUjSnv7sEUAH2dn3"),
    ACCOUNT: new PublicKey("EjaNvWcsPxVoKkADhpMre433bhdeU8uPgtgYPLsYKCjH"),
    BANK: new PublicKey("5n125hjbaeH4Ft5UrgFN3Tkv6qG5RNhfNLTRZpddkRag"),
    MINT: new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"),
    AMOUNT: new BN(10 * 10 ** 6), // 10 USDC (** 6 decimals)
    REMAINING: [
      new PublicKey("5n125hjbaeH4Ft5UrgFN3Tkv6qG5RNhfNLTRZpddkRag"), // usdc bank
      new PublicKey("9km7RzRAuWPPeJGk9DNWTAjA8V5Xnm1o9CdUQuDG1654"), // usdc oracle
    ],
  },
  depositBonkArena: {
    PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
    GROUP: new PublicKey("4qft5jS6ZkQtBX8WiSFYw9DUNTJcqUjSnv7sEUAH2dn3"),
    ACCOUNT: new PublicKey("EjaNvWcsPxVoKkADhpMre433bhdeU8uPgtgYPLsYKCjH"),
    BANK: new PublicKey("B5ZzNsDNNPxcWQMPD33pFtNVfDWMXzzgBdExnU4aoJne"),
    MINT: new PublicKey("DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263"),
    AMOUNT: new BN(900000 * 10 ** 5), // 900'000 BONK (** 5 decimals)
    REMAINING: [
      new PublicKey("B5ZzNsDNNPxcWQMPD33pFtNVfDWMXzzgBdExnU4aoJne"), // bonk bank
      new PublicKey("DBE3N8uNjhKPRHfANdwGvCZghWXyLPdqdSbEW2XFwBiX"), // bonk oracle
    ],
  },
}

const config: Config = examples.depositBonkArena;

async function main() {
  marginfiIdl.address = config.PROGRAM_ID;
  loadEnvFile(".env.api");
  const apiUrl = process.env.API_URL || DEFAULT_API_URL;
  console.log("api: " + apiUrl);
  const connection = new Connection(apiUrl, "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");
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

  const ata = getAssociatedTokenAddressSync(config.MINT, wallet.publicKey);

  const transaction = new Transaction();
  if (config.MINT.toString() == "So11111111111111111111111111111111111111112") {
    transaction.add(
      createAssociatedTokenAccountIdempotentInstruction(wallet.publicKey, ata, wallet.publicKey, config.MINT)
    );
    transaction.add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: ata,
        lamports: config.AMOUNT.toNumber(),
      })
    );
    transaction.add(createSyncNativeInstruction(ata));
  }
  const depositUpToLimit = false;
  transaction.add(
    await program.methods
      .lendingAccountDeposit(config.AMOUNT, depositUpToLimit)
      .accounts({
        // marginfiGroup: config.GROUP,
        marginfiAccount: config.ACCOUNT,
        bank: config.BANK,
        signerTokenAccount: ata,
        // bankLiquidityVault = deriveLiquidityVault(id, bank)
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
