// Change settings for an existing group's staked settings. To update banks and force them to accept
// these settings, propagate them to the banks (presumably there's an API for this by the time
// you're reading this)
import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Marginfi } from "../../marginfi-client-v2/src/idl/marginfi-types";
import marginfiIdl from "../../marginfi-client-v2/src/idl/marginfi.json";
import { DEFAULT_API_URL, loadEnvFile, loadKeypairFromFile } from "./utils";
import { bigNumberToWrappedI80F48, WrappedI80F48, wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";
import { assertBNEqual, assertI80F48Approx, assertKeysEqual } from "./softTests";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

/**
 * If true, send the tx. If false, output the unsigned b58 tx to console.
 */
const sendTx = true;
const verbose = true;

type Config = {
  PROGRAM_ID: string;
  GROUP_KEY: PublicKey;
  // Keep undefined for any field you wish to leave as-is on-chain
  MULTISIG_PAYER?: PublicKey; // May be omitted if not using squads
  SOL_ORACLE?: PublicKey;
  ASSET_WEIGHT_INIT?: number;
  ASSET_WEIGHT_MAINT?: number;
  DEPOSIT_LIMIT?: BN;
  TOTAL_ASSET_VALUE_INIT_LIMIT?: BN;
  ORACLE_MAX_AGE?: number;
  RISK_TIER: { collateral: {} } | { isolated: {} } | null;
};

const config: Config = {
  PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
  GROUP_KEY: new PublicKey("FCPfpHA69EbS8f9KKSreTRkXbzFpunsKuYf5qNmnJjpo"),
  MULTISIG_PAYER: new PublicKey("AZtUUe9GvTFq9kfseu9jxTioSgdSfjgmZfGQBmhVpTj1"),

  // Leave these undefined if you do NOT want them to be changed
  SOL_ORACLE: new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"),
  ASSET_WEIGHT_INIT: 0.0001,
  ASSET_WEIGHT_MAINT: 0.0002,
  DEPOSIT_LIMIT: undefined,
  TOTAL_ASSET_VALUE_INIT_LIMIT: undefined,
  ORACLE_MAX_AGE: undefined,
  RISK_TIER: undefined,
};

// TODO remove after package updates
export interface StakedSettingsEdit {
  oracle: PublicKey | null;

  assetWeightInit: WrappedI80F48 | null;
  assetWeightMaint: WrappedI80F48 | null;

  depositLimit: BN | null;
  totalAssetValueInitLimit: BN | null;

  oracleMaxAge: number | null;
  riskTier: { collateral: {} } | { isolated: {} } | null;
}

// TODO remove after package updates
const deriveStakedSettings = (programId: PublicKey, group: PublicKey) => {
  return PublicKey.findProgramAddressSync([Buffer.from("staked_settings", "utf-8"), group.toBuffer()], programId);
};

async function main() {
  marginfiIdl.address = config.PROGRAM_ID;
  loadEnvFile(".env.api");
  const apiUrl = process.env.API_URL || DEFAULT_API_URL;
  console.log("api: " + apiUrl);
  const connection = new Connection(apiUrl, "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

  const program = new Program<Marginfi>(marginfiIdl as Marginfi, provider);

  let [stakedSettingsKey] = deriveStakedSettings(program.programId, config.GROUP_KEY);

  const editSettings: StakedSettingsEdit = {
    oracle: config.SOL_ORACLE !== undefined ? config.SOL_ORACLE : null,
    assetWeightInit: config.ASSET_WEIGHT_INIT !== undefined ? bigNumberToWrappedI80F48(config.ASSET_WEIGHT_INIT) : null,
    assetWeightMaint:
      config.ASSET_WEIGHT_MAINT !== undefined ? bigNumberToWrappedI80F48(config.ASSET_WEIGHT_MAINT) : null,
    depositLimit: config.DEPOSIT_LIMIT !== undefined ? config.DEPOSIT_LIMIT : null,
    totalAssetValueInitLimit:
      config.TOTAL_ASSET_VALUE_INIT_LIMIT !== undefined ? config.TOTAL_ASSET_VALUE_INIT_LIMIT : null,
    oracleMaxAge: config.ORACLE_MAX_AGE !== undefined ? config.ORACLE_MAX_AGE : null,
    riskTier: config.RISK_TIER !== undefined ? config.RISK_TIER : null,
  };

  let stakedSettingsAccBefore = await program.account.stakedSettings.fetch(stakedSettingsKey);

  const transaction = new Transaction();
  transaction.add(
    await program.methods
      .editStakedSettings(editSettings)
      .accounts({
        // marginfiGroup: args.group, // implied from stakedSettings
        // admin: args.admin, // implied from group
        stakedSettings: stakedSettingsKey,
        // rent = SYSVAR_RENT_PUBKEY,
        // systemProgram: SystemProgram.programId,
      })
      .instruction()
  );

  if (sendTx) {
    try {
      const signature = await sendAndConfirmTransaction(connection, transaction, [wallet], {
        commitment: "confirmed",
      });
      console.log("Transaction signature:", signature);
      // await connection.confirmTransaction(signature, "finalized");
    } catch (error) {
      console.error("Couldn't confirm in time or error:", error);
    }

    if (verbose) {
      let stakedSettingsAcc = await program.account.stakedSettings.fetch(stakedSettingsKey);

      if (config.SOL_ORACLE !== undefined) {
        assertKeysEqual(stakedSettingsAcc.oracle, config.SOL_ORACLE);
        console.log("sol oracle: " + stakedSettingsAcc.oracle);
        console.log("was: " + stakedSettingsAccBefore.oracle);
      }

      if (config.ASSET_WEIGHT_INIT !== undefined) {
        assertI80F48Approx(stakedSettingsAcc.assetWeightInit, bigNumberToWrappedI80F48(config.ASSET_WEIGHT_INIT));
        console.log("assetWeightInit: " + wrappedI80F48toBigNumber(stakedSettingsAcc.assetWeightInit).toString());
        console.log("was: " + wrappedI80F48toBigNumber(stakedSettingsAccBefore.assetWeightInit).toString());
      }

      if (config.ASSET_WEIGHT_MAINT !== undefined) {
        assertI80F48Approx(stakedSettingsAcc.assetWeightMaint, bigNumberToWrappedI80F48(config.ASSET_WEIGHT_MAINT));
        console.log("assetWeightMaint: " + wrappedI80F48toBigNumber(stakedSettingsAcc.assetWeightMaint).toString());
        console.log("was: " + wrappedI80F48toBigNumber(stakedSettingsAccBefore.assetWeightMaint).toString());
      }

      if (config.DEPOSIT_LIMIT !== undefined) {
        assertBNEqual(stakedSettingsAcc.depositLimit, config.DEPOSIT_LIMIT);
        console.log("depositLimit: " + stakedSettingsAcc.depositLimit.toString());
        console.log("was: " + stakedSettingsAccBefore.depositLimit.toString());
      }

      if (config.TOTAL_ASSET_VALUE_INIT_LIMIT !== undefined) {
        assertBNEqual(stakedSettingsAcc.totalAssetValueInitLimit, config.TOTAL_ASSET_VALUE_INIT_LIMIT);
        console.log("totalAssetValueInitLimit: " + stakedSettingsAcc.totalAssetValueInitLimit.toString());
        console.log("was: " + stakedSettingsAccBefore.totalAssetValueInitLimit.toString());
      }

      if (config.ORACLE_MAX_AGE !== undefined) {
        assertBNEqual(new BN(stakedSettingsAcc.oracleMaxAge), new BN(config.ORACLE_MAX_AGE));
        console.log("oracleMaxAge: " + stakedSettingsAcc.oracleMaxAge);
        console.log("was: " + stakedSettingsAccBefore.oracleMaxAge);
      }

      if (config.RISK_TIER !== undefined) {
        console.log("oracle risk tier: " + stakedSettingsAcc.riskTier);
        console.log("was: " + stakedSettingsAccBefore.riskTier);
      }
    }
  } else {
    transaction.feePayer = config.MULTISIG_PAYER; // Set the fee payer to Squads wallet
    const { blockhash } = await connection.getLatestBlockhash();
    transaction.recentBlockhash = blockhash;
    const serializedTransaction = transaction.serialize({
      requireAllSignatures: false,
      verifySignatures: false,
    });
    const base58Transaction = bs58.encode(serializedTransaction);
    console.log("Base58-encoded transaction:", base58Transaction);
  }
}

main().catch((err) => {
  console.error(err);
});
