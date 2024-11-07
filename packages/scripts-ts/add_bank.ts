import { AccountMeta, Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider, Wallet, BN } from "@coral-xyz/anchor";
import { Marginfi } from "../marginfi-client-v2/src/idl/marginfi-types";
import marginfiIdl from "../marginfi-client-v2/src/idl/marginfi.json";
import { I80F48_ONE, loadKeypairFromFile } from "./utils";
import { assertI80F48Approx, assertKeysEqual } from "./softTests";
import { bigNumberToWrappedI80F48, TOKEN_PROGRAM_ID } from "@mrgnlabs/mrgn-common";
// TODO move to package import after update
import { InterestRateConfigRaw, BankConfigCompactRaw } from "../marginfi-client-v2/src/models/bank";

const verbose = true;

type Config = {
  PROGRAM_ID: string;
  GROUP_KEY: PublicKey;
  ORACLE: PublicKey;
  ADMIN: PublicKey;
  FEE_PAYER: PublicKey;
  BANK_MINT: PublicKey;
  SEED: number;
};

const config: Config = {
  PROGRAM_ID: "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct",
  GROUP_KEY: new PublicKey("FCPfpHA69EbS8f9KKSreTRkXbzFpunsKuYf5qNmnJjpo"),
  ORACLE: new PublicKey("HT2PLQBcG5EiCcNSaMHAjSgd9F98ecpATbk4Sk5oYuM"),
  ADMIN: new PublicKey("mfC1LoEk4mpM5yx1LjwR9QLZQ49AitxxWkK5Aciw7ZC"),
  FEE_PAYER: new PublicKey("mfC1LoEk4mpM5yx1LjwR9QLZQ49AitxxWkK5Aciw7ZC"),
  BANK_MINT: new PublicKey("Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB"),
  SEED: 0,
};

const deriveGlobalFeeState = (programId: PublicKey) => {
  return PublicKey.findProgramAddressSync([Buffer.from("feestate", "utf-8")], programId);
};

async function main() {
  marginfiIdl.address = config.PROGRAM_ID;
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const wallet = loadKeypairFromFile(process.env.HOME + "/keys/staging-deploy.json");

  // @ts-ignore
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: "confirmed",
  });

  const program = new Program<Marginfi>(
    // @ts-ignore
    marginfiIdl as Marginfi,
    provider
  );

  const [feeStateKey] = deriveGlobalFeeState(program.programId);
  const feeState = await program.account.feeState.fetch(feeStateKey);
  const feeWalletBefore = await provider.connection.getAccountInfo(feeState.globalFeeWallet);
  if (verbose) {
    console.log("flat sol init fee: " + feeState.bankInitFlatSolFee);
    console.log("fee wallet lamports before: " + feeWalletBefore.lamports);
  }

  const transaction = new Transaction();

  const rate: InterestRateConfigRaw = {
    optimalUtilizationRate: bigNumberToWrappedI80F48(0.5),
    plateauInterestRate: bigNumberToWrappedI80F48(0.6),
    maxInterestRate: bigNumberToWrappedI80F48(3),
    insuranceFeeFixedApr: bigNumberToWrappedI80F48(0.01),
    insuranceIrFee: bigNumberToWrappedI80F48(0.02),
    protocolFixedFeeApr: bigNumberToWrappedI80F48(0.03),
    protocolIrFee: bigNumberToWrappedI80F48(0.04),
    protocolOriginationFee: bigNumberToWrappedI80F48(0.1),
  };

  let bankConfig: BankConfigCompactRaw = {
    assetWeightInit: I80F48_ONE,
    assetWeightMaint: I80F48_ONE,
    liabilityWeightInit: I80F48_ONE,
    liabilityWeightMaint: I80F48_ONE,
    depositLimit: new BN(1_000_000_000),
    interestRateConfig: rate,
    operationalState: {
      operational: undefined,
    },
    oracleSetup: {
      pythPushOracle: undefined,
    },
    oracleKey: new PublicKey(Buffer.from("K4m53I/fnzRwmlsQa0cvDzm7bKnOBLD9fy6XFoji5Ts=", "base64")),
    borrowLimit: new BN(1_000_000_000),
    riskTier: {
      collateral: undefined,
    },
    totalAssetValueInitLimit: new BN(100_000_000_000),
    oracleMaxAge: 100,
  };

  const oracleMeta: AccountMeta = {
    pubkey: config.ORACLE,
    isSigner: false,
    isWritable: false,
  };
  console.log("oracle: " + bankConfig.oracleKey);

  // Note: the BN used by `BankConfigCompactRaw` is different from the kind used in the anchor
  // version here which requires this stupid hack where the BN is re-declared (or just TS-ignore it)
  const ix = await program.methods
    .lendingPoolAddBankWithSeed(
      {
        assetWeightInit: bankConfig.assetWeightInit,
        assetWeightMaint: bankConfig.assetWeightMaint,
        liabilityWeightInit: bankConfig.liabilityWeightInit,
        liabilityWeightMaint: bankConfig.liabilityWeightMaint,
        depositLimit: new BN(bankConfig.depositLimit.toString()),
        interestRateConfig: bankConfig.interestRateConfig,
        operationalState: bankConfig.operationalState,
        oracleSetup: bankConfig.oracleSetup,
        oracleKey: bankConfig.oracleKey,
        borrowLimit: new BN(bankConfig.borrowLimit.toString()),
        riskTier: bankConfig.riskTier,
        pad0: [0, 0, 0, 0, 0, 0, 0],
        totalAssetValueInitLimit: new BN(bankConfig.totalAssetValueInitLimit.toString()),
        oracleMaxAge: bankConfig.oracleMaxAge,
      },
      new BN(config.SEED)
    )
    .accounts({
      marginfiGroup: config.GROUP_KEY,
      admin: config.ADMIN,
      feePayer: config.FEE_PAYER,
      bankMint: config.BANK_MINT,
      // bank: // derived from mint/seed
      // globalFeeState: deriveGlobalFeeState(id),
      // globalFeeWallet: args.globalFeeWallet,
      // liquidityVaultAuthority = deriveLiquidityVaultAuthority(id, bank);
      // liquidityVault = deriveLiquidityVault(id, bank);
      // insuranceVaultAuthority = deriveInsuranceVaultAuthority(id, bank);
      // insuranceVault = deriveInsuranceVault(id, bank);
      // feeVaultAuthority = deriveFeeVaultAuthority(id, bank);
      // feeVault = deriveFeeVault(id, bank);
      // rent = SYSVAR_RENT_PUBKEY
      tokenProgram: TOKEN_PROGRAM_ID,
      // systemProgram: SystemProgram.programId,
    })
    .remainingAccounts([oracleMeta])
    .instruction();

  transaction.add(ix);

  try {
    const signature = await sendAndConfirmTransaction(connection, transaction, [wallet]);
    console.log("Transaction signature:", signature);
  } catch (error) {
    console.error("Transaction failed:", error);
  }

  const feeWalletAfter = await provider.connection.getAccountInfo(feeState.globalFeeWallet);
  if (verbose) {
    console.log("fee wallet lamports after: " + feeWalletAfter.lamports);
  }
}

main().catch((err) => {
  console.error(err);
});
