import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import BN from "bn.js";
import * as sb from "@switchboard-xyz/on-demand";
import { AnchorProvider } from "@coral-xyz/anchor";

import {
  BankMetadataMap,
  Program,
  SolanaTransaction,
  bigNumberToWrappedI80F48,
  splitInstructionsToFitTransactions,
  wrappedI80F48toBigNumber,
} from "@mrgnlabs/mrgn-common";

import { feedIdToString } from "../../utils";
import { MarginfiProgram } from "../../types";
import instructions from "../../instructions";
import { OraclePrice } from "../price";
import { BankType, crankPythOracleIx, OracleSetup } from "../bank";
import { MarginfiIdlType } from "../../idl";
import { getSwitchboardProgram } from "../../vendor";
import { Balance } from "../../models/balance";
import { HealthCache } from "../../models/health-cache";
import { Bank } from "../../models/bank";
import { simulateBundle } from "../transaction/helpers";
import { MarginfiAccountWrapper, MarginfiAccount, MarginRequirementType } from "../../models/account";
import MarginfiClient, { BankMap, OraclePriceMap } from "../../clients/client";

import {
  computeHealthAccountMetas,
  computeHealthCheckAccounts,
  computeHealthComponentsLegacy,
  computeHealthComponentsWithoutBiasLegacy,
} from "./utils";
import { BalanceRaw, BalanceType, MarginfiAccountRaw } from "./types";

export async function simulateAccountHealthCacheWithFallback(props: {
  program: Program<MarginfiIdlType>;
  bankMap: Map<string, Bank>;
  oraclePrices: Map<string, OraclePrice>;
  marginfiAccount: MarginfiAccount;
  balances: Balance[];
  bankMetadataMap: BankMetadataMap;
}): Promise<MarginfiAccount> {
  let marginfiAccount = props.marginfiAccount;

  const activeBalances = props.balances.filter((b) => b.active);

  const { assets: assetValueEquity, liabilities: liabilityValueEquity } = computeHealthComponentsWithoutBiasLegacy(
    activeBalances,
    props.bankMap,
    props.oraclePrices,
    MarginRequirementType.Equity
  );

  try {
    const simulatedAccount = await simulateAccountHealthCache({
      program: props.program,
      bankMap: props.bankMap,
      oraclePrices: props.oraclePrices,
      marginfiAccountPk: props.marginfiAccount.address,
      balances: props.balances,
      bankMetadataMap: props.bankMetadataMap,
    });

    simulatedAccount.healthCache.assetValueEquity = bigNumberToWrappedI80F48(assetValueEquity);
    simulatedAccount.healthCache.liabilityValueEquity = bigNumberToWrappedI80F48(liabilityValueEquity);

    marginfiAccount = MarginfiAccount.fromAccountParsed(props.marginfiAccount.address, simulatedAccount);
  } catch (e) {
    console.log("e", e);
    const { assets: assetValueMaint, liabilities: liabilityValueMaint } = computeHealthComponentsLegacy(
      activeBalances,
      props.bankMap,
      props.oraclePrices,
      MarginRequirementType.Maintenance
    );

    const { assets: assetValueInitial, liabilities: liabilityValueInitial } = computeHealthComponentsLegacy(
      activeBalances,
      props.bankMap,
      props.oraclePrices,
      MarginRequirementType.Initial
    );

    marginfiAccount.setHealthCache(
      new HealthCache(
        assetValueInitial,
        liabilityValueInitial,
        assetValueMaint,
        liabilityValueMaint,
        assetValueEquity,
        liabilityValueEquity,
        new BigNumber(0),
        [],
        [],
        true
      )
    );
  }

  return marginfiAccount;
}

export async function simulateAccountHealthCache(props: {
  program: Program<MarginfiIdlType>;
  bankMap: Map<string, Bank>;
  oraclePrices: Map<string, OraclePrice>;
  marginfiAccountPk: PublicKey;
  balances: Balance[];
  bankMetadataMap: BankMetadataMap;
}): Promise<MarginfiAccountRaw> {
  const { program, bankMap, oraclePrices, marginfiAccountPk, balances, bankMetadataMap } = props;

  const activeBalances = balances.filter((b) => b.active);

  const { stalePythFeeds, staleSwbOracles } = getActiveStaleBanks(activeBalances, bankMap, [], oraclePrices, 30);

  const computeIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 });
  const blockhash = (await program.provider.connection.getLatestBlockhash("confirmed")).blockhash;

  const crankPythIxs = await crankPythOracleIx(stalePythFeeds, program.provider);
  const crankSwbIxs =
    staleSwbOracles.length > 0
      ? await createUpdateFeedIx({
          swbPullOracles: staleSwbOracles.map((oracle) => oracle.oracleKey),
          provider: program.provider,
        })
      : { instructions: [], luts: [] };

  const healthPulseIxs = await makePulseHealthIx(
    program,
    marginfiAccountPk,
    bankMap,
    balances,
    activeBalances.map((b) => b.bankPk),
    [],
    bankMetadataMap
  );

  const pythLut = crankPythIxs.lut ? [crankPythIxs.lut] : [];

  const txs = splitInstructionsToFitTransactions(
    [computeIx],
    [
      ...crankPythIxs.postInstructions.map((ix) => ix.instruction),
      ...crankPythIxs.closeInstructions.map((ix) => ix.instruction),
      ...crankSwbIxs.instructions,
      ...healthPulseIxs.instructions,
    ],
    {
      blockhash,
      payerKey: program.provider.publicKey,
      luts: [...crankSwbIxs.luts, ...pythLut],
    }
  );

  if (txs.length > 5) {
    console.error("Too many transactions", txs.length);
    throw new Error("Too many transactions");
  }

  const simulationResult = await simulateBundle(program.provider.connection.rpcEndpoint, txs, [marginfiAccountPk]);

  const postExecutionAccount = simulationResult.find((result) => result.postExecutionAccounts.length > 0);

  if (!postExecutionAccount) {
    throw new Error("Account not found");
  }

  const marginfiAccountPost = MarginfiAccount.decodeAccountRaw(
    Buffer.from(postExecutionAccount.postExecutionAccounts[0].data[0], "base64"),
    program.idl
  );

  if (marginfiAccountPost.healthCache.mrgnErr || marginfiAccountPost.healthCache.internalErr) {
    console.log("MarginfiAccountPost healthCache internalErr", marginfiAccountPost.healthCache.internalErr);
    console.log("MarginfiAccountPost healthCache mrgnErr", marginfiAccountPost.healthCache.mrgnErr);

    if (marginfiAccountPost.healthCache.mrgnErr === 6009) {
      const assetValue = !wrappedI80F48toBigNumber(marginfiAccountPost.healthCache.assetValue).isZero();
      const liabilityValue = !wrappedI80F48toBigNumber(marginfiAccountPost.healthCache.liabilityValue).isZero();
      const assetValueEquity = !wrappedI80F48toBigNumber(marginfiAccountPost.healthCache.assetValueEquity).isZero();
      const liabilityValueEquity = !wrappedI80F48toBigNumber(
        marginfiAccountPost.healthCache.liabilityValueEquity
      ).isZero();
      const assetValueMaint = !wrappedI80F48toBigNumber(marginfiAccountPost.healthCache.assetValueMaint).isZero();
      const liabilityValueMaint = !wrappedI80F48toBigNumber(
        marginfiAccountPost.healthCache.liabilityValueMaint
      ).isZero();

      if (
        assetValue &&
        liabilityValue &&
        assetValueEquity &&
        liabilityValueEquity &&
        assetValueMaint &&
        liabilityValueMaint
      ) {
        return marginfiAccountPost;
      }
    }
    console.error("Account health cache simulation failed", marginfiAccountPost.healthCache.mrgnErr);
    throw new Error("Account health cache simulation failed");
  }

  return marginfiAccountPost;
}

export async function makePulseHealthIx(
  program: MarginfiProgram,
  marginfiAccountPk: PublicKey,
  banks: Map<string, BankType>,
  balances: BalanceType[],
  mandatoryBanks: PublicKey[],
  excludedBanks: PublicKey[],
  bankMetadataMap: BankMetadataMap
) {
  const healthAccounts = computeHealthCheckAccounts(balances, banks, mandatoryBanks, excludedBanks);
  const accountMetas = computeHealthAccountMetas(healthAccounts, bankMetadataMap);

  const sortIx = await instructions.makeLendingAccountSortBalancesIx(program, {
    marginfiAccount: marginfiAccountPk,
  });

  const ix = await instructions.makePulseHealthIx(
    program,
    {
      marginfiAccount: marginfiAccountPk,
    },
    accountMetas.map((account) => ({ pubkey: account, isSigner: false, isWritable: false }))
  );

  return { instructions: [sortIx, ix], keys: [] };
}
export async function createUpdateFeedIx(props: {
  swbPullOracles: PublicKey[];
  provider: AnchorProvider;
}): Promise<{ instructions: TransactionInstruction[]; luts: AddressLookupTableAccount[] }> {
  const sbProgram = getSwitchboardProgram(props.provider);
  const [pullIx, luts] = await sb.PullFeed.fetchUpdateManyIx(sbProgram, {
    feeds: props.swbPullOracles,
    numSignatures: 1,
    payer: props.provider.publicKey,
  });
  return { instructions: [pullIx], luts };
}

/**
 * This function creates a new Marginfi account transaction and returns a projected dummy account for simulation.
 * Note: This function is subject to future updates and improvements.
 */
export async function createMarginfiAccountTx(props: {
  marginfiAccount: MarginfiAccountWrapper | null;
  marginfiClient: MarginfiClient;
}): Promise<{ account: MarginfiAccountWrapper; tx: SolanaTransaction }> {
  const authority = props.marginfiAccount?.authority ?? props.marginfiClient.provider.publicKey;
  const marginfiAccountKeypair = Keypair.generate();

  // create a dummy account with 15 empty balances to be used in other transactions
  const dummyWrappedI80F48 = bigNumberToWrappedI80F48(new BigNumber(0));
  const dummyBalances: BalanceRaw[] = Array(15).fill({
    active: false,
    bankPk: new PublicKey("11111111111111111111111111111111"),
    assetShares: dummyWrappedI80F48,
    liabilityShares: dummyWrappedI80F48,
    emissionsOutstanding: dummyWrappedI80F48,
    lastUpdate: new BN(0),
  });
  const rawAccount: MarginfiAccountRaw = {
    group: props.marginfiClient.group.address,
    authority: authority,
    lendingAccount: { balances: dummyBalances },
    healthCache: {
      assetValue: {
        value: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
      liabilityValue: {
        value: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      },
      timestamp: new BN(0),
      flags: 0,
      prices: [],
      assetValueMaint: bigNumberToWrappedI80F48(new BigNumber(0)),
      liabilityValueMaint: bigNumberToWrappedI80F48(new BigNumber(0)),
      assetValueEquity: bigNumberToWrappedI80F48(new BigNumber(0)),
      liabilityValueEquity: bigNumberToWrappedI80F48(new BigNumber(0)),
      errIndex: 0,
      internalErr: 0,
      internalBankruptcyErr: 0,
      internalLiqErr: 0,
      mrgnErr: 0,
    },
    emissionsDestinationAccount: new PublicKey("11111111111111111111111111111111"),
    accountFlags: new BN([0, 0, 0]),
  };

  const account = MarginfiAccount.fromAccountParsed(marginfiAccountKeypair.publicKey, rawAccount);

  const wrappedAccount = new MarginfiAccountWrapper(marginfiAccountKeypair.publicKey, props.marginfiClient, account);

  return {
    account: wrappedAccount,
    tx: await props.marginfiClient.createMarginfiAccountTx({ accountKeypair: marginfiAccountKeypair }),
  };
}

export function getActiveStaleBanks(
  balances: Balance[],
  banks: BankMap,
  additionalBanks: Bank[],
  oraclePrices: OraclePriceMap,
  maxAgeOffset: number = 0
): { stalePythFeeds: { feedId: string; shardId: number }[]; staleSwbOracles: { oracleKey: PublicKey }[] } {
  const activeBanks = balances
    .filter((balance) => balance.active)
    .map((balance) => banks.get(balance.bankPk.toBase58()))
    .filter((bank): bank is NonNullable<typeof bank> => !!bank);

  const allBanks = [...activeBanks, ...additionalBanks];

  const staleBanks = allBanks.filter((bank) => {
    if (bank.config.oracleSetup === OracleSetup.SwitchboardPull) {
      // always crank swb banks
      return true;
    }
    const oraclePrice = oraclePrices.get(bank.address.toBase58());
    const maxAge = bank.config.oracleMaxAge;
    const currentTime = Math.round(Date.now() / 1000);
    const oracleTime = Math.round(oraclePrice?.timestamp ? oraclePrice.timestamp.toNumber() : new Date().getTime());
    const adjustedMaxAge = Math.max(maxAge - maxAgeOffset, 0);
    const isStale = currentTime - oracleTime > adjustedMaxAge;

    return isStale;
  });

  if (staleBanks.length > 0) {
    const stalePythFeeds: { feedId: string; shardId: number }[] = [];
    const staleSwbOracles: { oracleKey: PublicKey }[] = [];
    const seenSwbOracles = new Set<string>();
    const seenPythFeeds = new Set<string>();

    staleBanks.forEach((bank) => {
      if (bank.config.oracleSetup === OracleSetup.SwitchboardPull) {
        const key = bank.oracleKey.toBase58();
        if (!seenSwbOracles.has(key)) {
          seenSwbOracles.add(key);
          staleSwbOracles.push({ oracleKey: bank.oracleKey });
        }
      } else if (
        bank.config.oracleSetup === OracleSetup.PythPushOracle ||
        bank.config.oracleSetup === OracleSetup.StakedWithPythPush
      ) {
        const oraclePrice = oraclePrices.get(bank.address.toBase58());

        const shardId = oraclePrice?.pythShardId ?? 0;
        const feedId = bank.config.oracleKeys[0];
        const feedKey = feedIdToString(feedId);
        if (!seenPythFeeds.has(feedKey)) {
          seenPythFeeds.add(feedKey);
          stalePythFeeds.push({ feedId: feedKey, shardId });
        }
      }
    });

    return { stalePythFeeds, staleSwbOracles };
  }

  return { stalePythFeeds: [], staleSwbOracles: [] };
}
