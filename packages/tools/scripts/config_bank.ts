// Runs once per group, before any staked banks can be init.
import { AccountMeta, Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import { Marginfi } from "../../marginfi-client-v2/src/idl/marginfi-types";
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

dotenv.config();

/**
 * If true, send the tx. If false, output the unsigned b58 tx to console.
 */
const simulate = true;
const sendTx = true;
const verbose = true;

type Config = {
  PROGRAM_ID: string;
  GROUP_KEY: PublicKey;
  BANK: PublicKey;
  ADMIN: PublicKey;

  // Keep default values to use the defaults...
  MULTISIG_PAYER?: PublicKey; // May be omitted if not using squads
};

const config: Config = {
  PROGRAM_ID: "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA",
  GROUP_KEY: new PublicKey("6b9vFQjfYav2tVzns2cD21xU7E4z9LDnHTv9wjCJsknf"),
  BANK: new PublicKey("CoikF9aDXU7xJheN7WePZAboe67wEW1h1ygjbLbQzZbe"),
  ADMIN: new PublicKey("mfi1dtjy2mJ9J21UoaQ5dsRnbcg4MBU1CTacVyBp1HF"),

  // MULTISIG_PAYER: new PublicKey("AZtUUe9GvTFq9kfseu9jxTioSgdSfjgmZfGQBmhVpTj1"),
};

async function main() {
  marginfiIdl.address = config.PROGRAM_ID;
  const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT, "confirmed");
  const wallet = loadKeypairFromFile(process.env.MARGINFI_WALLET);

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

  const program = new Program<Marginfi>(marginfiIdl as Marginfi, provider);

  const transaction = new Transaction();

  let bankConfig = defaultBankConfigOptRaw();

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

  if (simulate) {
    try {
      const simulation = await connection.simulateTransaction(transaction);
      console.log("Simulation results:", simulation);
    } catch (error) {
      console.error("Simulation failed:", error);
    }
  }

  if (sendTx) {
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

const ASSET_TAG_DEFAULT = 0;
const ASSET_TAG_SOL = 1;
const ASSET_TAG_STAKED = 2;

const defaultBankConfigOptRaw = () => {
  let bankConfigOpt: BankConfigOptRaw = {
    assetWeightInit: null,
    assetWeightMaint: null,
    liabilityWeightInit: null,
    liabilityWeightMaint: null,
    depositLimit: null,
    borrowLimit: null,
    riskTier: null,
    assetTag: null,
    totalAssetValueInitLimit: null,
    interestRateConfig: null,
    operationalState: null,
    oracleMaxAge: null,
    permissionlessBadDebtSettlement: true,
    freezeSettings: true,
  };

  return bankConfigOpt;
};

type InterestRateConfigRawWithOrigination = InterestRateConfigRaw & {
  protocolOriginationFee: WrappedI80F48;
};

type BankConfigOptRaw = {
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
