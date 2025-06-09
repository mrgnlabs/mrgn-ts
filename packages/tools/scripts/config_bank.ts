// Runs once per group, before any staked banks can be init.
import { Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Marginfi } from "@mrgnlabs/marginfi-client-v2/src/idl/marginfi-types_0.1.3";
import marginfiIdl from "../../marginfi-client-v2/src/idl/marginfi_0.1.3.json";
import { DEFAULT_API_URL, loadEnvFile, loadKeypairFromFile } from "./utils";
import {
  bigNumberToWrappedI80F48,
  WrappedI80F48,
} from "@mrgnlabs/mrgn-common";
import { InterestRateConfigRaw } from "@mrgnlabs/marginfi-client-v2";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import dotenv from "dotenv";
import { BigNumber } from "bignumber.js";

dotenv.config();

/**
 * If true, send the tx. If false, output the unsigned b58 tx to console.
 */
const simulate = true;
const sendTx = true;

export type Config = {
  PROGRAM_ID: string;
  BANK: PublicKey;

  // Keep default values to use the defaults...
  MULTISIG_PAYER?: PublicKey; // May be omitted if not using squads
};

const config: Config = {
  PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
  BANK: new PublicKey("B5ZzNsDNNPxcWQMPD33pFtNVfDWMXzzgBdExnU4aoJne"),

  // MULTISIG_PAYER: new PublicKey("AZtUUe9GvTFq9kfseu9jxTioSgdSfjgmZfGQBmhVpTj1"),
};

async function main() {
  let bankConfig = defaultBankConfigOptRaw();
  //bankConfig.borrowLimit = new BN(1000000 * 10 ** 5); // 1 mln * decimals
  bankConfig.assetWeightInit = bigNumberToWrappedI80F48(0.1);
  bankConfig.assetWeightMaint = bigNumberToWrappedI80F48(0.1);
  await updateBankConfig(bankConfig, process.env.MARGINFI_WALLET, config, { simulate, sendTx });
}

export async function updateBankConfig(
  bankConfig: BankConfigOptRaw,
  walletPath: string,
  config: Config,
  options?: { simulate?: boolean; sendTx?: boolean }
) {
  marginfiIdl.address = config.PROGRAM_ID;
  loadEnvFile(".env.api");
  const apiUrl = process.env.API_URL || DEFAULT_API_URL;
  console.log("api: " + apiUrl);
  const connection = new Connection(apiUrl, "confirmed");
  const wallet = loadKeypairFromFile(walletPath);

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

  const program = new Program<Marginfi>(marginfiIdl as Marginfi, provider);

  const transaction = new Transaction();
  transaction.add(
    await program.methods
      .lendingPoolConfigureBank(bankConfig)
      .accounts({
        bank: config.BANK,
      })
      .instruction()
  );

  if (options?.sendTx) {
    try {
      const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
      console.log("Transaction signature:", signature);
    } catch (error) {
      console.error("Transaction failed:", error);
    }
  } else {
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

export const ASSET_TAG_DEFAULT = 0;
export const ASSET_TAG_SOL = 1;
export const ASSET_TAG_STAKED = 2;

export const defaultBankConfigOptRaw = () => {
  let bankConfigOpt: BankConfigOptRaw = {
    assetWeightInit: null,
    assetWeightMaint: null,
    liabilityWeightInit: null,
    liabilityWeightMaint: null,
    depositLimit: null,
    borrowLimit: null,
    riskTier: { collateral: {} },
    assetTag: null,
    totalAssetValueInitLimit: null,
    interestRateConfig: {
      protocolOriginationFee: null,
      protocolIrFee: null,
      protocolFixedFeeApr: null,
      insuranceIrFee: null,
      insuranceFeeFixedApr: null,
      maxInterestRate: null,
      optimalUtilizationRate: null,
      plateauInterestRate: null,
    },
    operationalState: null,
    oracleMaxAge: null,
    permissionlessBadDebtSettlement: true,
    freezeSettings: null,
  };

  return bankConfigOpt;
};

export type InterestRateConfigRawWithOrigination = InterestRateConfigRaw & {
  protocolOriginationFee: WrappedI80F48;
};

export type BankConfigOptRaw = {
  assetWeightInit: WrappedI80F48 | null;
  assetWeightMaint: WrappedI80F48 | null;

  liabilityWeightInit: WrappedI80F48 | null;
  liabilityWeightMaint: WrappedI80F48 | null;

  depositLimit: BN | null;
  borrowLimit: BN | null;
  riskTier: { collateral: {} } | { isolated: {} } | null;
  assetTag: number;
  totalAssetValueInitLimit: BN | null;

  interestRateConfig: InterestRateConfigRawWithOrigination | null;
  operationalState: { paused: {} } | { operational: {} } | { reduceOnly: {} } | null;

  oracleMaxAge: number | null;
  permissionlessBadDebtSettlement: boolean | null;
  freezeSettings: boolean | null;
};

main().catch((err) => {
  console.error(err);
});
