import {
  AddressLookupTableAccount,
  ComputeBudgetProgram,
  Keypair,
  PublicKey,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import BigNumber from "bignumber.js";
import BN from "bn.js";
import * as sb from "@switchboard-xyz/on-demand";

import { Program, SolanaTransaction, bigNumberToWrappedI80F48, composeRemainingAccounts } from "@mrgnlabs/mrgn-common";

import MarginfiClient from "../../clients/client";
import { MarginfiAccountWrapper, MarginfiAccount, MarginRequirementType } from "../../models/account";
import { BalanceRaw, MarginfiAccountRaw } from "./types";
import { MarginfiIdlType } from "../../idl";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getSwitchboardProgram } from "../../vendor";
import { Bank } from "../../models/bank";
import { OraclePrice } from "../price";
import { Balance } from "../../models/balance";
import { feedIdToString } from "../../utils";
import { crankPythOracleIx, OracleSetup } from "../bank";
import { computeHealthComponentsWithoutBiasLegacy } from "./utils";

export async function simulateAccountHealthCache(props: {
  program: Program<MarginfiIdlType>;
  bankMap: Map<string, Bank>;
  oraclePrices: Map<string, OraclePrice>;
  marginfiAccountPk: PublicKey;
  activeBalances: Balance[];
}) {
  const { program, bankMap, oraclePrices, marginfiAccountPk, activeBalances } = props;

  const banks = activeBalances
    .map((b) => {
      const bank = bankMap.get(b.bankPk.toBase58());
      if (!bank) return undefined;
      return bank;
    })
    .filter((b) => b !== undefined);

  const bankAddressAndOraclePair = banks.map((b) => {
    return [b.address, b.oracleKey];
  });

  const pythFeedIds: { feedId: string; shardId: number }[] = [];
  const swbOracleKeys: PublicKey[] = [];

  // checks for duplicate oracle keys
  const seenPyth = new Set<string>();
  const seenSwb = new Set<string>();

  for (const b of banks) {
    const setup = b.config.oracleSetup;
    const oracleKey = b.oracleKey;
    const feedIdKey = feedIdToString(b.config.oracleKeys[0]);
    const oracleKeyBase = oracleKey.toBase58();

    if (
      (setup === OracleSetup.PythPushOracle || setup === OracleSetup.StakedWithPythPush) &&
      !seenPyth.has(feedIdKey)
    ) {
      seenPyth.add(feedIdKey);
      pythFeedIds.push({ feedId: feedIdKey, shardId: b.pythShardId ?? 0 });
    }

    if (setup === OracleSetup.SwitchboardPull && !seenSwb.has(oracleKeyBase)) {
      seenSwb.add(oracleKeyBase);
      swbOracleKeys.push(oracleKey);
    }
  }

  // const crankPythIxs = await crankPythOracleIx(pythFeedIds, program.provider);

  // console.log("crankPythIxs", crankPythIxs.instructions);

  const computeIx = ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 });
  const updateFeedIxs =
    swbOracleKeys.length > 0
      ? await createUpdateFeedIx({ swbPullOracles: swbOracleKeys, provider: program.provider })
      : { instructions: [], luts: [] };
  const healthPulseIxs = await createHealthPulseIx({
    bankAddressAndOraclePair,
    marginfiAccount: marginfiAccountPk,
    program,
  });

  const blockhash = (await program.provider.connection.getLatestBlockhash("confirmed")).blockhash;

  const tx = new VersionedTransaction(
    new TransactionMessage({
      instructions: [computeIx, ...updateFeedIxs.instructions, ...healthPulseIxs.instructions],
      payerKey: program.provider.publicKey,
      recentBlockhash: blockhash,
    }).compileToV0Message([...updateFeedIxs.luts, ...healthPulseIxs.luts])
  );

  const simulationResult = await program.provider.connection.simulateTransaction(tx, {
    accounts: {
      encoding: "base64",
      addresses: [marginfiAccountPk.toBase58()],
    },
    sigVerify: false,
  });

  if (!simulationResult?.value?.accounts?.[0]) {
    throw new Error("Account not found");
  }

  const marginfiAccountPost = MarginfiAccount.decodeAccountRaw(
    Buffer.from(simulationResult?.value?.accounts?.[0].data[0], "base64"),
    program.idl
  );

  console.log("marginfiAccountPost", marginfiAccountPost);

  const { assets: assetValueEquity, liabilities: liabilityValueEquity } = computeHealthComponentsWithoutBiasLegacy(
    activeBalances,
    bankMap,
    oraclePrices,
    MarginRequirementType.Equity
  );

  marginfiAccountPost.healthCache.assetValueEquity = bigNumberToWrappedI80F48(assetValueEquity);
  marginfiAccountPost.healthCache.liabilityValueEquity = bigNumberToWrappedI80F48(liabilityValueEquity);

  return marginfiAccountPost;
}

export async function createHealthPulseIx(props: {
  bankAddressAndOraclePair: PublicKey[][];
  marginfiAccount: PublicKey;
  program: Program<MarginfiIdlType>;
}): Promise<{ instructions: TransactionInstruction[]; luts: AddressLookupTableAccount[] }> {
  const remainingAccounts = composeRemainingAccounts(props.bankAddressAndOraclePair);

  const healthPulseIx = await props.program.methods
    .lendingAccountPulseHealth()
    .accounts({
      marginfiAccount: props.marginfiAccount,
    })
    .remainingAccounts(remainingAccounts.map((account) => ({ pubkey: account, isSigner: false, isWritable: false })))
    .instruction();

  return { instructions: [healthPulseIx], luts: [] };
}

export async function createUpdateFeedIx(props: {
  swbPullOracles: PublicKey[];
  provider: AnchorProvider;
}): Promise<{ instructions: TransactionInstruction[]; luts: AddressLookupTableAccount[] }> {
  const sbProgram = getSwitchboardProgram(props.provider);
  const [pullIx, luts] = await sb.PullFeed.fetchUpdateManyIx(sbProgram, {
    feeds: props.swbPullOracles,
    numSignatures: 1,
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
