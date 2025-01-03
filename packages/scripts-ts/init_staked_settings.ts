// Runs once per group, before any staked banks can be init.
import { AccountMeta, Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import { Marginfi } from "../marginfi-client-v2/src/idl/marginfi-types";
import marginfiIdl from "../marginfi-client-v2/src/idl/marginfi.json";
import { I80F48_ONE, loadKeypairFromFile } from "./utils";
import {
  bigNumberToWrappedI80F48,
  TOKEN_PROGRAM_ID,
  WrappedI80F48,
  wrappedI80F48toBigNumber,
} from "@mrgnlabs/mrgn-common";
import { RiskTierRaw } from "@mrgnlabs/marginfi-client-v2";
import { assertBNEqual, assertI80F48Approx, assertKeysEqual } from "./softTests";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

/**
 * If true, send the tx. If false, output the unsigned b58 tx to console.
 */
const sendTx = false;
const verbose = true;

type Config = {
  PROGRAM_ID: string;
  GROUP_KEY: PublicKey;
  SOL_ORACLE: PublicKey;
  // Keep default values to use the defaults...
  MULTISIG_PAYER?: PublicKey; // May be omitted if not using squads
  ASSET_WEIGHT_INIT?: number;
  ASSET_WEIGHT_MAIN?: number;
  DEPOSIT_LIMIT?: BN;
  TOTAL_ASSET_VALUE_INIT_LIMIT?: BN;
  ORACLE_MAX_AGE?: number;
};

const config: Config = {
  PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
  GROUP_KEY: new PublicKey("FCPfpHA69EbS8f9KKSreTRkXbzFpunsKuYf5qNmnJjpo"),
  SOL_ORACLE: new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG"),
  MULTISIG_PAYER: new PublicKey("AZtUUe9GvTFq9kfseu9jxTioSgdSfjgmZfGQBmhVpTj1"),

  // Leave out anything you want to remain as default...
  ASSET_WEIGHT_INIT: undefined,
  ASSET_WEIGHT_MAIN: undefined,
  DEPOSIT_LIMIT: undefined,
  TOTAL_ASSET_VALUE_INIT_LIMIT: undefined,
  ORACLE_MAX_AGE: undefined,
};

async function main() {
  marginfiIdl.address = config.PROGRAM_ID;
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

  const program = new Program<Marginfi>(marginfiIdl as Marginfi, provider);

  let settings = defaultStakedInterestSettings(config.SOL_ORACLE);

  if (config.ASSET_WEIGHT_INIT !== undefined) {
    settings.assetWeightInit = bigNumberToWrappedI80F48(config.ASSET_WEIGHT_INIT);
  }
  if (config.ASSET_WEIGHT_MAIN !== undefined) {
    settings.assetWeightMaint = bigNumberToWrappedI80F48(config.ASSET_WEIGHT_MAIN);
  }
  if (config.DEPOSIT_LIMIT !== undefined) {
    settings.depositLimit = config.DEPOSIT_LIMIT;
  }
  if (config.TOTAL_ASSET_VALUE_INIT_LIMIT !== undefined) {
    settings.totalAssetValueInitLimit = config.TOTAL_ASSET_VALUE_INIT_LIMIT;
  }
  if (config.ORACLE_MAX_AGE !== undefined) {
    settings.oracleMaxAge = config.ORACLE_MAX_AGE;
  }

  const transaction = new Transaction();

  transaction.add(
    await program.methods
      .initStakedSettings(settings)
      .accounts({
        marginfiGroup: config.GROUP_KEY,
        // admin: args.admin, // implied from group
        feePayer: wallet.publicKey,
        // staked_settings: deriveStakedSettings()
        // rent = SYSVAR_RENT_PUBKEY,
        // systemProgram: SystemProgram.programId,
      })
      .instruction()
  );

  if (sendTx) {
    try {
      const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
      console.log("Transaction signature:", signature);
    } catch (error) {
      console.error("Transaction failed:", error);
    }

    let [stakedSettingsKey] = deriveStakedSettings(program.programId, config.GROUP_KEY);
    if (verbose) {
      console.log("staked settings: " + stakedSettingsKey);
    }
    let stakedSettingsAcc = await program.account.stakedSettings.fetch(stakedSettingsKey);
    assertI80F48Approx(stakedSettingsAcc.assetWeightInit, settings.assetWeightInit);
    assertI80F48Approx(stakedSettingsAcc.assetWeightMaint, settings.assetWeightMaint);
    assertBNEqual(stakedSettingsAcc.depositLimit, settings.depositLimit);
    assertBNEqual(stakedSettingsAcc.totalAssetValueInitLimit, settings.totalAssetValueInitLimit);
    assertBNEqual(new BN(stakedSettingsAcc.oracleMaxAge), settings.oracleMaxAge);
    assertKeysEqual(stakedSettingsAcc.oracle, config.SOL_ORACLE);
    if (verbose) {
      console.log("oracle: " + stakedSettingsAcc.oracle);
      console.log("asset weight init: " + wrappedI80F48toBigNumber(stakedSettingsAcc.assetWeightInit).toString());
      console.log("asset weight maint: " + wrappedI80F48toBigNumber(stakedSettingsAcc.assetWeightMaint).toString());
      console.log("deposit limit: " + stakedSettingsAcc.depositLimit.toString());
      console.log("total asset value init: " + stakedSettingsAcc.totalAssetValueInitLimit.toString());
      console.log("oralce max age: " + stakedSettingsAcc.oracleMaxAge);
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

// TODO remove when package updates
type StakedSettingsConfig = {
  oracle: PublicKey;

  assetWeightInit: WrappedI80F48;
  assetWeightMaint: WrappedI80F48;

  depositLimit: BN;
  totalAssetValueInitLimit: BN;

  oracleMaxAge: number;
  /** Collateral = 0, Isolated = 1 */
  riskTier: RiskTierRaw;
};

const defaultStakedInterestSettings = (oracle: PublicKey) => {
  let settings: StakedSettingsConfig = {
    oracle: oracle,
    assetWeightInit: bigNumberToWrappedI80F48(0.8),
    assetWeightMaint: bigNumberToWrappedI80F48(0.9),
    depositLimit: new BN(1_000_000_000_000), // 1000 SOL
    totalAssetValueInitLimit: new BN(150_000_000),
    oracleMaxAge: 60,
    riskTier: {
      collateral: undefined,
    },
  };
  return settings;
};

const deriveStakedSettings = (programId: PublicKey, group: PublicKey) => {
  return PublicKey.findProgramAddressSync([Buffer.from("staked_settings", "utf-8"), group.toBuffer()], programId);
};

main().catch((err) => {
  console.error(err);
});
