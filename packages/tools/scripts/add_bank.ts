import { AccountMeta, Connection, PublicKey, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { Program, AnchorProvider, BN } from "@coral-xyz/anchor";
import { Marginfi } from "@mrgnlabs/marginfi-client-v2/src/idl/marginfi-types_0.1.3";
import marginfiIdl from "../../marginfi-client-v2/src/idl/marginfi_0.1.3.json";
import { I80F48_ONE, loadKeypairFromFile } from "./utils";
import { bigNumberToWrappedI80F48, TOKEN_PROGRAM_ID } from "@mrgnlabs/mrgn-common";
// TODO move to package import after update
import { InterestRateConfigRaw, BankConfigCompactRaw } from "../../marginfi-client-v2/src/services";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";

/**
 * If true, send the tx. If false, output the unsigned b58 tx to console.
 */
const sendTx = false;
const verbose = true;

type Config = {
  PROGRAM_ID: string;
  GROUP_KEY: PublicKey;
  ORACLE: PublicKey;
  /** A pyth price feed that matches the configured Oracle */
  ORACLE_FEED: PublicKey;
  ADMIN: PublicKey;
  FEE_PAYER: PublicKey;
  BANK_MINT: PublicKey;
  SEED: number;
  MULTISIG_PAYER?: PublicKey; // May be omitted if not using squads
};

// Feed IDs can be taken from here: https://www.pyth.network/developers/price-feed-ids
// USDC
// const mint = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
// const oracle = "9km7RzRAuWPPeJGk9DNWTAjA8V5Xnm1o9CdUQuDG1654";
// const feed_id_hex = "eaa020c61cc479712813461ce153894a96a6c00b21ed0cfc2798d1f9a9e9c94a";
// BONK
const mint = "DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263";
const oracle = "DBE3N8uNjhKPRHfANdwGvCZghWXyLPdqdSbEW2XFwBiX";
const feed_id_hex = "72b021217ca3fe68922a19aaf990109cb9d84e9ad004b4d2025ad6f529314419";

const config: Config = {
  PROGRAM_ID: "MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA", // Staging - "stag8sTKds2h4KzjUw3zKTsxbqvT4XKHdaR9X9E6Rct"
  GROUP_KEY: new PublicKey("4qft5jS6ZkQtBX8WiSFYw9DUNTJcqUjSnv7sEUAH2dn3"),
  ORACLE: new PublicKey(oracle),
  ORACLE_FEED: new PublicKey(Buffer.from(feed_id_hex, "hex")),
  ADMIN: new PublicKey("AZtUUe9GvTFq9kfseu9jxTioSgdSfjgmZfGQBmhVpTj1"),
  FEE_PAYER: new PublicKey("AZtUUe9GvTFq9kfseu9jxTioSgdSfjgmZfGQBmhVpTj1"),
  BANK_MINT: new PublicKey(mint),
  SEED: 0,
  MULTISIG_PAYER: null, // new PublicKey("AZtUUe9GvTFq9kfseu9jxTioSgdSfjgmZfGQBmhVpTj1")

  // TODO configurable settings up here (currently, scroll down)
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
    console.log("fee state: " + feeState.key);
    console.log("fee wallet: " + feeState.globalFeeWallet);
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
    depositLimit: new BN(1000000000),
    interestRateConfig: rate,
    operationalState: {
      operational: undefined,
    },
    borrowLimit: new BN(1000000000),
    riskTier: {
      collateral: undefined,
    },
    totalAssetValueInitLimit: new BN(100000000000),
    oracleMaxAge: 100,
    assetTag: 0,
  };

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
        borrowLimit: new BN(bankConfig.borrowLimit.toString()),
        riskTier: bankConfig.riskTier,
        assetTag: 0, // 0 - normal asset, 1 - sol, 2 - staked
        pad0: [0, 0, 0, 0, 0, 0],
        totalAssetValueInitLimit: new BN(bankConfig.totalAssetValueInitLimit.toString()),
        oracleMaxAge: bankConfig.oracleMaxAge,
      },
      new BN(config.SEED)
    )
    .accounts({
      marginfiGroup: config.GROUP_KEY,
      // admin: config.ADMIN, // implied from group
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
    .instruction();
  transaction.add(ix);

  const [bankKey] = deriveBankWithSeed(program.programId, config.GROUP_KEY, config.BANK_MINT, new BN(config.SEED));
  console.log("bank key: " + bankKey);

  const oracleMeta: AccountMeta = {
    pubkey: config.ORACLE,
    isSigner: false,
    isWritable: false,
  };
  const config_ix = await program.methods
    .lendingPoolConfigureBankOracle(
      3, // 3 = PythPull, 4 = SwitchboardPull, 5 = StakedWithPythPush
      config.ORACLE_FEED
    )
    .accountsPartial({
      group: config.GROUP_KEY,
      bank: bankKey,
      admin: config.ADMIN,
    })
    .remainingAccounts([oracleMeta])
    .instruction();

  transaction.add(config_ix);

  if (sendTx) {
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
  } else {
    transaction.feePayer = config.MULTISIG_PAYER ?? config.FEE_PAYER;
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
const deriveBankWithSeed = (programId: PublicKey, group: PublicKey, bankMint: PublicKey, seed: BN) => {
  return PublicKey.findProgramAddressSync(
    [group.toBuffer(), bankMint.toBuffer(), seed.toArrayLike(Buffer, "le", 8)],
    programId
  );
};

main().catch((err) => {
  console.error(err);
});
