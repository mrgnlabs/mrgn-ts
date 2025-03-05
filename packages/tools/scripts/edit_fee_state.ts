import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Marginfi } from "../../marginfi-client-v2/src/idl/marginfi-types";
import marginfiIdl from "../../marginfi-client-v2/src/idl/marginfi.json";
import { bigNumberToWrappedI80F48, WrappedI80F48 } from "@mrgnlabs/mrgn-common";
import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { loadKeypairFromTxtFile } from "./utils";
import { assertBNEqual, assertI80F48Approx, assertKeysEqual } from "./softTests";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { wrappedI80F48toBigNumber } from "../../mrgn-common/dist";

/**
 * If true, send the tx. If false, output the unsigned b58 tx to console.
 */
const sendTx = false;

const deriveGlobalFeeState = (programId: PublicKey) => {
  return PublicKey.findProgramAddressSync([Buffer.from("feestate", "utf-8")], programId);
};

type Config = {
  PROGRAM_ID: string;
  ADMIN_PUBKEY: PublicKey;
  WALLET_PUBKEY: PublicKey;

  /** Multisig if using a MS */
  PAYER: PublicKey;

  FLAT_SOL_FEE: number;
  FIXED_FEE: number;
  RATE_FEE: number;
};

const config: Config = {
  PROGRAM_ID: "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA",
  ADMIN_PUBKEY: new PublicKey("AZtUUe9GvTFq9kfseu9jxTioSgdSfjgmZfGQBmhVpTj1"),
  WALLET_PUBKEY: new PublicKey("mfi4pDnfqbrHR9hEdnfqNin5LqBonWzRiUsFCTDRYRo"),

  PAYER: new PublicKey("CYXEgwbPHu2f9cY3mcUkinzDoDcsSan7myh1uBvYRbEw"),
  FLAT_SOL_FEE: 150000000,
  FIXED_FEE: 0,
  RATE_FEE: 0.075,
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

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });
  const program: Program<Marginfi> = new Program(
    // @ts-ignore
    marginfiIdl as Marginfi,
    provider
  );

  const [feeStateKey] = deriveGlobalFeeState(program.programId);
  const feeStateBefore = await program.account.feeState.fetch(feeStateKey);
  console.log("Fee state status BEFORE update:");
  console.log("Admin: " + feeStateBefore.globalFeeAdmin + " wallet " + feeStateBefore.globalFeeWallet);
  console.log(
    "flat sol: " +
      feeStateBefore.bankInitFlatSolFee +
      " fixed: " +
      wrappedI80F48toBigNumber(feeStateBefore.programFeeFixed) +
      " rate " +
      wrappedI80F48toBigNumber(feeStateBefore.programFeeRate)
  );

  const args: EditGlobalFeeStateArgs = {
    admin: config.ADMIN_PUBKEY,
    wallet: config.WALLET_PUBKEY,
    bankInitFlatSolFee: config.FLAT_SOL_FEE,
    programFeeFixed: bigNumberToWrappedI80F48(config.FIXED_FEE),
    programFeeRate: bigNumberToWrappedI80F48(config.RATE_FEE),
  };

  const transaction = new Transaction().add(await editGlobalFeeState(program, args));

  if (sendTx) {
    try {
      const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
      console.log("Transaction signature:", signature);
    } catch (error) {
      console.error("Transaction failed:", error);
    }

    const feeState = await program.account.feeState.fetch(feeStateKey);
    assertKeysEqual(feeState.globalFeeWallet, config.WALLET_PUBKEY);
    assertBNEqual(new BN(feeState.bankInitFlatSolFee), config.FLAT_SOL_FEE);
    assertI80F48Approx(feeState.programFeeFixed, config.FIXED_FEE);
    assertI80F48Approx(feeState.programFeeRate, config.RATE_FEE);
  } else {
    transaction.feePayer = config.PAYER; // Set the fee payer to Squads wallet
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: true,
    });
    const base58Transaction = bs58.encode(serializedTransaction);
    console.log("Base58-encoded transaction:", base58Transaction);
  }
}

main().catch((err) => {
  console.error(err);
});

/*
 * Status 2/28/2025
Admin: AZtUUe9GvTFq9kfseu9jxTioSgdSfjgmZfGQBmhVpTj1 wallet JAnRanMrsn5vxWmSpU5ndvtvQLAyzGJEenNzgVC1vNMC
flat sol: 150000000 fixed: 0 rate 0.0075000000000002842171
 */