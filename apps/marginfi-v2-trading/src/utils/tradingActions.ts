import * as Sentry from "@sentry/nextjs";
import {
  AddressLookupTableProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  Transaction,
  VersionedTransaction,
} from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { WalletContextState } from "@solana/wallet-adapter-react";
import { QuoteResponse } from "@jup-ag/api";

import {
  BankConfigOpt,
  MarginfiAccountWrapper,
  MarginfiClient,
  PriorityFees,
  ProcessTransactionsClientOpts,
} from "@mrgnlabs/marginfi-client-v2";
import {
  calculateLoopingTransaction,
  ActionMessageType,
  calculateBorrowLendPositionParams,
  getMaybeSquadsOptions,
  STATIC_SIMULATION_ERRORS,
  extractErrorString,
  LoopActionTxns,
  ClosePositionActionTxns,
  ActionProcessingError,
  JupiterOptions,
} from "@mrgnlabs/mrgn-utils";
import { ExtendedBankInfo, clearAccountCache, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { WalletContextStateOverride } from "@mrgnlabs/mrgn-ui";
import { TransactionBroadcastType } from "@mrgnlabs/mrgn-common";
import { toastManager } from "@mrgnlabs/mrgn-toasts";

import { TradeSide } from "~/components/common/trade-box-v2";

export async function createMarginfiGroup({
  marginfiClient,
  additionalIxs,
  seed,
}: {
  marginfiClient: MarginfiClient;
  additionalIxs: TransactionInstruction[];
  seed?: Keypair;
}) {
  const multiStepToast = toastManager.createMultiStepToast("Group Creation", [{ label: `Creating group` }]);
  multiStepToast.start();

  try {
    const marginfiGroup = await marginfiClient.createMarginfiGroup(seed, additionalIxs, {});
    multiStepToast.successAndNext();
    return marginfiGroup;
  } catch (error: any) {
    const msg = extractErrorString(error);
    Sentry.captureException({ message: error });
    multiStepToast.setFailed(msg);
    console.log(`Error while withdrawing: ${msg}`);
    console.log(error);
    return;
  }
}

export async function createPoolLookupTable({
  client,
  bankKeys,
  oracleKeys,
  groupKey,
  walletKey,
}: {
  client: MarginfiClient;
  bankKeys: PublicKey[];
  oracleKeys: PublicKey[];
  groupKey: PublicKey;
  walletKey: PublicKey;
}) {
  let bankAddresses = [...bankKeys];
  let programs = [SystemProgram.programId, client.programId, TOKEN_PROGRAM_ID];

  bankKeys.forEach((bankPubkey) => {
    const liquidityVaultSeed = [Buffer.from("liquidity_vault"), bankPubkey.toBuffer()];
    const liquidityVaultAuthoritySeed = [Buffer.from("liquidity_vault_auth"), bankPubkey.toBuffer()];

    const [liquidityVault] = PublicKey.findProgramAddressSync(liquidityVaultSeed, client.program.programId);
    const [liquidityVaultAuthority] = PublicKey.findProgramAddressSync(
      liquidityVaultAuthoritySeed,
      client.program.programId
    );

    bankAddresses.push(...[liquidityVault, liquidityVaultAuthority]);
  });

  const lutKeys = [...bankAddresses, ...programs, ...[groupKey], ...oracleKeys];

  const slot = await client.provider.connection.getSlot();

  const [lookupTableInst, lookupTableAddress] = AddressLookupTableProgram.createLookupTable({
    authority: walletKey,
    payer: walletKey,
    recentSlot: slot,
  });

  const extendInstruction = AddressLookupTableProgram.extendLookupTable({
    payer: walletKey,
    authority: walletKey,
    lookupTable: lookupTableAddress,
    addresses: lutKeys,
  });

  return {
    lutAddress: lookupTableAddress,
    createLutIx: lookupTableInst,
    extendLutIx: extendInstruction,
  };
}

export async function createPermissionlessBank({
  marginfiClient,
  mint,
  group,
  bankConfig,
  admin,
  seed,
  processOpts,
}: {
  marginfiClient: MarginfiClient;
  mint: PublicKey;
  group: PublicKey;
  bankConfig: BankConfigOpt;
  admin: PublicKey;
  seed?: Keypair;
  processOpts?: ProcessTransactionsClientOpts;
}) {
  const multiStepToast = toastManager.createMultiStepToast("Bank Creation", [
    { label: `Creating permissionless bank` },
  ]);
  multiStepToast.start();

  try {
    const txnSig = await marginfiClient.createPermissionlessBank({
      mint,
      bankConfig,
      group,
      admin,
      seed,
      processOpts,
    });
    multiStepToast.successAndNext();
    return txnSig;
  } catch (error: any) {
    const msg = extractErrorString(error);
    Sentry.captureException({ message: error });
    multiStepToast.setFailed(msg);
    console.log(`Error while creating bank: ${msg}`);
    console.log(error);
    return;
  }
}

export async function executeLeverageAction({
  marginfiClient,
  marginfiAccount: _marginfiAccount,
  depositBank,
  borrowBank,
  walletContextState,
  connection,
  depositAmount,
  tradeState,
  loopActionTxns,
  priorityFees,
  slippageBps,
  broadcastType,
}: {
  marginfiClient: MarginfiClient | null;
  marginfiAccount: MarginfiAccountWrapper | null;
  depositBank: ExtendedBankInfo;
  borrowBank: ExtendedBankInfo;
  connection: Connection;
  walletContextState?: WalletContextState | WalletContextStateOverride;
  depositAmount: number;
  tradeState: TradeSide;
  loopActionTxns: LoopActionTxns | null;
  priorityFees: PriorityFees;
  slippageBps: number;
  broadcastType: TransactionBroadcastType;
}) {
  if (!marginfiClient) {
    toastManager.showErrorToast(STATIC_SIMULATION_ERRORS.NOT_INITIALIZED);
    return;
  }
  if (!loopActionTxns) {
    toastManager.showErrorToast(STATIC_SIMULATION_ERRORS.SIMULATION_NOT_READY);
    return;
  }

  let toastSteps: { label: string }[] = [];
  const tradeActionLabel = tradeState === "long" ? "Open long position" : "Open short position";

  if (!_marginfiAccount) {
    toastSteps.push(...[{ label: "Create account" }]);
  }

  if (!loopActionTxns.transactions.length) {
    toastSteps.push(...[{ label: `Generate transaction` }]);
  }

  toastSteps.push({ label: `Execute ${tradeState.slice(0, 1).toUpperCase() + tradeState.slice(1)} position` });

  const multiStepToast = toastManager.createMultiStepToast(
    `${tradeState.slice(0, 1).toUpperCase() + tradeState.slice(1)} 
      ${tradeState === "long" ? depositBank.meta.tokenSymbol : borrowBank.meta.tokenSymbol}`,
    toastSteps
  );
  multiStepToast.start();

  let marginfiAccount: MarginfiAccountWrapper | null = _marginfiAccount;

  if (!marginfiAccount) {
    try {
      const squadsOptions = await getMaybeSquadsOptions(walletContextState);
      marginfiAccount = await marginfiClient.createMarginfiAccount(squadsOptions, {
        ...priorityFees,
        broadcastType,
      });

      multiStepToast.successAndNext();
    } catch (error: any) {
      const msg = extractErrorString(error);
      Sentry.captureException({ message: error });
      multiStepToast.setFailed(msg);
      console.log(`Error while depositing: ${msg}`);
      console.log(error);
      return;
    }
  }

  let loopingObject = loopActionTxns;

  if (!loopActionTxns.transactions.length && loopActionTxns.actionQuote) {
    try {
      const result = await calculateLoopingTransaction({
        marginfiAccount,
        borrowBank,
        depositBank,
        connection,
        depositAmount,
        borrowAmount: loopActionTxns.borrowAmount,
        quote: loopActionTxns.actionQuote,
        actualDepositAmount: loopActionTxns.actualDepositAmount,
      });

      loopingObject = result;

      multiStepToast.successAndNext();
    } catch (error) {
      const msg = extractErrorString(error);
      Sentry.captureException({ message: error });
      multiStepToast.setFailed(msg);
      console.log(`Error while ${tradeActionLabel}: ${msg}`);
      console.log(error);
      return;
    }
  }

  try {
    if (loopingObject.transactions.length) {
      let txnSig: string[] = [];

      if (loopingObject.transactions.length) {
        txnSig = await marginfiClient.processTransactions([...loopingObject.transactions], {
          ...priorityFees,
          broadcastType,
        });
      } else {
        throw new Error("Something went wrong, please try again.");
      }

      multiStepToast.successAndNext();
      return txnSig;
    } else {
      throw new Error("Something went wrong, please try again.");
    }
  } catch (error: any) {
    const msg = extractErrorString(error);
    Sentry.captureException({ message: error });
    multiStepToast.setFailed(msg);
    console.log(`Error while depositing: ${msg}`);
    console.log(error);
    return;
  }
}

export async function calculateClosePositions({
  marginfiAccount,
  borrowBank,
  depositBanks,
  jupiterOptions,
  connection,
  platformFeeBps,
}: {
  marginfiAccount: MarginfiAccountWrapper;
  borrowBank: ActiveBankInfo | null;
  depositBanks: ActiveBankInfo[];
  jupiterOptions: JupiterOptions | null;
  connection: Connection;
  platformFeeBps: number;
}): Promise<ClosePositionActionTxns> {
  // user is borrowing and depositing
  if (borrowBank && depositBanks.length === 1 && jupiterOptions) {
    return calculateBorrowLendPositionParams({
      marginfiAccount,
      borrowBank,
      depositBank: depositBanks[0],
      connection,
      slippageBps: jupiterOptions.slippageBps,
      slippageMode: jupiterOptions.slippageMode,
      platformFeeBps,
    });
  }

  // user is only depositing
  if (!borrowBank && depositBanks.length > 0 && marginfiAccount) {
    const txn = await marginfiAccount.makeWithdrawAllTx(
      depositBanks.map((bank) => ({
        amount: bank.position.amount,
        bankAddress: bank.address,
      }))
    );
    return {
      transactions: [txn],
      maxAmount: 0,
      actionQuote: null,
    };
  }

  throw new ActionProcessingError(STATIC_SIMULATION_ERRORS.CLOSE_POSITION_INVALID);
}
