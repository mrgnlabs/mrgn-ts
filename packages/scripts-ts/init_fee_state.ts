import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Marginfi } from "../marginfi-client-v2/src/idl/marginfi-types";
import marginfiIdl from "../marginfi-client-v2/src/idl/marginfi.json";
import { bigNumberToWrappedI80F48, WrappedI80F48 } from "@mrgnlabs/mrgn-common";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { loadKeypairFromFile } from "./utils";

type Config = {
  PROGRAM_ID: string;
  ADMIN_PUBKEY: PublicKey;
  WALLET_PUBKEY: PublicKey;
};
const config: Config = {
  PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
  ADMIN_PUBKEY: new PublicKey("H4QMTHMVbJ3KrB5bz573cBBZKoYSZ2B4mSST1JKzPUrH"),
  WALLET_PUBKEY: new PublicKey("H4QMTHMVbJ3KrB5bz573cBBZKoYSZ2B4mSST1JKzPUrH"),
};

type InitGlobalFeeStateArgs = {
  payer: PublicKey;
  admin: PublicKey;
  wallet: PublicKey;
  bankInitFlatSolFee: number;
  programFeeFixed: WrappedI80F48;
  programFeeRate: WrappedI80F48;
};

const initGlobalFeeState = (program: Program<Marginfi>, args: InitGlobalFeeStateArgs) => {
  const ix = program.methods
    .initGlobalFeeState(args.admin, args.wallet, args.bankInitFlatSolFee, args.programFeeFixed, args.programFeeRate)
    .accounts({
      payer: args.payer,
      // feeState = deriveGlobalFeeState(id),
      // rent = SYSVAR_RENT_PUBKEY,
      // systemProgram: SystemProgram.programId,
    })
    .instruction();

  return ix;
};

async function main() {
  marginfiIdl.address = config.PROGRAM_ID;
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/.config/solana/id.json");

  const args: InitGlobalFeeStateArgs = {
    payer: wallet.publicKey,
    admin: config.ADMIN_PUBKEY,
    wallet: config.WALLET_PUBKEY,
    bankInitFlatSolFee: 5000,
    programFeeFixed: bigNumberToWrappedI80F48(0),
    programFeeRate: bigNumberToWrappedI80F48(0.01),
  };

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });
  const program: Program<Marginfi> = new Program(
    // @ts-ignore
    marginfiIdl as Marginfi,
    provider
  );
  const transaction = new Transaction().add(await initGlobalFeeState(program, args));

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
    console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }
}

main().catch((err) => {
  console.error(err);
});
