import { Connection, LAMPORTS_PER_SOL, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";

import { DEFAULT_API_URL, loadEnvFile, loadKeypairFromFile, SINGLE_POOL_PROGRAM_ID } from "./utils";
import { assertI80F48Approx, assertKeysEqual } from "./softTests";

import { wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";
import { Marginfi } from "../marginfi-client-v2/src/idl/marginfi-types";
import marginfiIdl from "../marginfi-client-v2/src/idl/marginfi.json";
import { getMint } from "@solana/spl-token";

const verbose = true;

type Config = {
  VALIDATOR_VOTE_ACCOUNT: PublicKey;
  SOL_PRICE: number;
};

const config: Config = {
  VALIDATOR_VOTE_ACCOUNT: new PublicKey("mrgn4t2JabSgvGnrCaHXMvz8ocr4F52scsxJnkQMQsQ"),
  SOL_PRICE: 200,
};

async function main() {
  loadEnvFile(".env.api");
  const apiUrl = process.env.API_URL || DEFAULT_API_URL;
  console.log("api: " + apiUrl);
  const connection = new Connection(apiUrl, "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

  const [pool] = PublicKey.findProgramAddressSync(
    [Buffer.from("pool"), config.VALIDATOR_VOTE_ACCOUNT.toBuffer()],
    SINGLE_POOL_PROGRAM_ID
  );
  const [lstMint] = PublicKey.findProgramAddressSync([Buffer.from("mint"), pool.toBuffer()], SINGLE_POOL_PROGRAM_ID);
  const [solPool] = PublicKey.findProgramAddressSync([Buffer.from("stake"), pool.toBuffer()], SINGLE_POOL_PROGRAM_ID);
  console.log("stake pool: " + pool);
  console.log("mint: " + lstMint);
  console.log("sol pool: " + solPool);

  const [mintAcc, solPoolAcc] = await Promise.all([getMint(connection, lstMint), connection.getAccountInfo(solPool)]);

  let supply = Number(mintAcc.supply);
  let lamps = solPoolAcc.lamports - LAMPORTS_PER_SOL;

  console.log("supply: " + supply.toLocaleString());
  console.log("sol pool lamps: " + lamps.toLocaleString());

  let multiplier = lamps / supply;
  console.log("multiplier: " + multiplier);

  let price = config.SOL_PRICE * multiplier;
  console.log("value per LST: " + price);
}

main().catch((err) => {
  console.error(err);
});
