import { AddressLookupTableAccount, Keypair, PublicKey, TransactionInstruction } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import BN from "bn.js";
import * as sb from "@switchboard-xyz/on-demand";

import { Program, SolanaTransaction, bigNumberToWrappedI80F48, composeRemainingAccounts } from "@mrgnlabs/mrgn-common";

import MarginfiClient from "../../clients/client";
import { MarginfiAccountWrapper, MarginfiAccount } from "../../models/account";
import { BalanceRaw, MarginfiAccountRaw } from "./types";
import { MarginfiIdlType } from "../../idl";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getSwitchboardProgram } from "../../vendor";

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
