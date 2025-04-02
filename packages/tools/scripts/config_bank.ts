// Runs once per group, before any staked banks can be init.
import { AccountMeta, Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import { Marginfi } from "@mrgnlabs/marginfi-client-v2/src/idl/marginfi-types_0.1.2";
import marginfiIdl from "../../marginfi-client-v2/src/idl/marginfi.json";
import { I80F48_ONE, loadKeypairFromFile } from "./utils";
import {
  bigNumberToWrappedI80F48,
  TOKEN_PROGRAM_ID,
  WrappedI80F48,
  wrappedI80F48toBigNumber,
} from "@mrgnlabs/mrgn-common";
import { InterestRateConfigRaw, RiskTierRaw } from "@mrgnlabs/marginfi-client-v2";
import { assertBNEqual, assertI80F48Approx, assertKeysEqual } from "./softTests";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import dotenv from "dotenv";
import { BigNumber } from "bignumber.js";

dotenv.config();

/**
 * If true, send the tx. If false, output the unsigned b58 tx to console.
 */
const simulate = true;
const sendTx = true;
const verbose = true;

export type Config = {
  PROGRAM_ID: string;
  GROUP_KEY: PublicKey;
  BANK: PublicKey;
  ADMIN: PublicKey;

  // Keep default values to use the defaults...
  MULTISIG_PAYER?: PublicKey; // May be omitted if not using squads
};

const config: Config = {
  PROGRAM_ID: "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA",
  GROUP_KEY: new PublicKey("2v4DXmmnhqrERUYpZaScrXC1jdJoUYhzMjuEcytqsLeh"),
  BANK: new PublicKey("14pCPReiear5V7viGVtdafwm6yCfBoz7pTkigGzcrdQm"),
  ADMIN: new PublicKey("mfi1dtjy2mJ9J21UoaQ5dsRnbcg4MBU1CTacVyBp1HF"),

  // MULTISIG_PAYER: new PublicKey("AZtUUe9GvTFq9kfseu9jxTioSgdSfjgmZfGQBmhVpTj1"),
};

async function main() {
  let bankConfig = defaultBankConfigOptRaw();
  await updateBankConfig(bankConfig, process.env.MARGINFI_WALLET, config, { simulate, sendTx });
}

export async function updateBankConfig(
  bankConfig: BankConfigOptRaw,
  walletPath: string,
  config: Config,
  options?: { simulate?: boolean; sendTx?: boolean }
) {
  marginfiIdl.address = config.PROGRAM_ID;
  const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT, "confirmed");
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
        marginfiGroup: config.GROUP_KEY,
        admin: config.ADMIN,
        bank: config.BANK,
      })
      .instruction()
  );

  transaction.feePayer = config.ADMIN; // Set the fee payer to Squads wallet if using multisig

  if (options?.simulate) {
    try {
      const simulation = await connection.simulateTransaction(transaction);
      console.log("Simulation results:", simulation);
    } catch (error) {
      console.error("Simulation failed:", error);
    }
  }

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
      protocolOriginationFee: bigNumberToWrappedI80F48(new BigNumber(0.005)),
      protocolIrFee: null,
      protocolFixedFeeApr: null,
      insuranceIrFee: null,
      insuranceFeeFixedApr: null,
      maxInterestRate: null,
      optimalUtilizationRate: null,
      plateauInterestRate: null,
    },
    operationalState: null,
    oracleMaxAge: 300,
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
