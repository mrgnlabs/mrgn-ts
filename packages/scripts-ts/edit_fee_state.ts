import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Marginfi } from "../marginfi-client-v2/src/idl/marginfi-types";
import marginfiIdl from "../marginfi-client-v2/src/idl/marginfi.json";
import { bigNumberToWrappedI80F48, WrappedI80F48 } from "@mrgnlabs/mrgn-common";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { loadKeypairFromTxtFile } from "./utils";
import { assertBNEqual, assertI80F48Approx, assertKeysEqual } from "./softTests";

const deriveGlobalFeeState = (programId: PublicKey) => {
  return PublicKey.findProgramAddressSync([Buffer.from("feestate", "utf-8")], programId);
};

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

export type EditGlobalFeeStateArgs = {
  admin: PublicKey;
  wallet: PublicKey;
  bankInitFlatSolFee: number;
  programFeeFixed: WrappedI80F48;
  programFeeRate: WrappedI80F48;
};

export const editGlobalFeeState = (program: Program<Marginfi>, args: EditGlobalFeeStateArgs) => {
  const ix = program.methods
    .editGlobalFeeState(args.wallet, args.bankInitFlatSolFee, args.programFeeFixed, args.programFeeRate)
    .accounts({
      globalFeeAdmin: args.admin,
      // feeState = deriveGlobalFeeState(id),
    })
    .instruction();

  return ix;
};

async function main() {
  marginfiIdl.address = config.PROGRAM_ID;
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const wallet = loadKeypairFromTxtFile(process.env.HOME + "/keys/staging-fee-admin.txt");

  const flatSolFee = 20000;
  const fixedFeedRate = 0.01;
  const feeRate = 0.03;

  const args: EditGlobalFeeStateArgs = {
    admin: config.ADMIN_PUBKEY,
    wallet: config.WALLET_PUBKEY,
    bankInitFlatSolFee: flatSolFee,
    programFeeFixed: bigNumberToWrappedI80F48(fixedFeedRate),
    programFeeRate: bigNumberToWrappedI80F48(feeRate),
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
  const transaction = new Transaction().add(await editGlobalFeeState(program, args));

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
    console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  const [feeStateKey] = deriveGlobalFeeState(program.programId);
  const feeState = await program.account.feeState.fetch(feeStateKey);
  assertKeysEqual(feeState.globalFeeWallet, config.WALLET_PUBKEY);
  assertBNEqual(new BN(feeState.bankInitFlatSolFee), flatSolFee);
  assertI80F48Approx(feeState.programFeeFixed, fixedFeedRate);
  assertI80F48Approx(feeState.programFeeRate, feeRate);
}

main().catch((err) => {
  console.error(err);
});
