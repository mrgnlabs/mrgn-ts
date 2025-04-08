import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider } from "@coral-xyz/anchor";

import { loadKeypairFromFile } from "./utils";
import { assertI80F48Approx, assertKeysEqual } from "./softTests";

import { wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";
import { Marginfi } from "../../marginfi-client-v2/src/idl/marginfi-types";
import marginfiIdl from "../../marginfi-client-v2/src/idl/marginfi.json";

const verbose = true;

type Config = {
  PROGRAM_ID: string;
  BANK: PublicKey;
};

const config: Config = {
  PROGRAM_ID: "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA",
  BANK: new PublicKey("CCKtUs6Cgwo4aaQUmBPmyoApH2gUDErxNZCAntD6LYGh"),
};

async function main() {
  marginfiIdl.address = config.PROGRAM_ID;
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/.config/solana/id.json");

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

  const program = new Program<Marginfi>(marginfiIdl as Marginfi, provider);
  let bank = await program.account.bank.fetch(config.BANK);

  console.log("group: " + bank.group);
  console.log("mint: " + bank.mint);
  console.log("flags: " + bank.flags.toNumber());
  console.log("borrow cap: " + bank.config.borrowLimit.toNumber());
  console.log("ui limit: " + bank.config.totalAssetValueInitLimit.toNumber());
  console.log(
    "interest to insurance: " + wrappedI80F48toBigNumber(bank.config.interestRateConfig.insuranceIrFee).toString()
  );
  console.log(
    "interest to insurance (fixed): " +
      wrappedI80F48toBigNumber(bank.config.interestRateConfig.insuranceFeeFixedApr).toString()
  );
  console.log(
    "interest to group: " + wrappedI80F48toBigNumber(bank.config.interestRateConfig.protocolIrFee).toString()
  );
  console.log(
    "interest to group (fixed): " +
      wrappedI80F48toBigNumber(bank.config.interestRateConfig.protocolFixedFeeApr).toString()
  );

  console.log(
    "fees owed (to insurance): " +
      wrappedI80F48toBigNumber(bank.collectedInsuranceFeesOutstanding).toString()
  );
  console.log(
    "fees owed (to group): " +
      wrappedI80F48toBigNumber(bank.collectedGroupFeesOutstanding).toString()
  );
  console.log(
    "fees owed (to program): " +
      wrappedI80F48toBigNumber(bank.collectedProgramFeesOutstanding).toString()
  );
}

main().catch((err) => {
  console.error(err);
});
