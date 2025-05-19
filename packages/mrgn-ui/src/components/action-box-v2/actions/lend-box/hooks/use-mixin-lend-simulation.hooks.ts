import React, { memo } from "react";

import {
  AddressLookupTableAccount,
  Connection,
  Keypair,
  MessageAddressTableLookup,
  PublicKey,
  SolanaJSONRPCError,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  TransactionMessage,
  VersionedTransaction,
} from "@solana/web3.js";
import {
  attachInvoiceEntry,
  attachStorageEntry,
  checkSystemCallSize,
  formatUnits,
  getInvoiceString,
  MixinApi,
  newMixinInvoice,
  OperationTypeSystemCall,
  uniqueConversationID,
} from "@mixin.dev/mixin-node-sdk";

import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  BroadcastMethodType,
  DEFAULT_PROCESS_TX_OPTS,
  DEFAULT_PROCESS_TX_STRATEGY,
  MarginfiAccountWrapper,
  MarginfiClient,
  ProcessTransactionError,
  ProcessTransactionErrorType,
  ProcessTransactionsClientOpts,
  SimulationResult,
  SpecificBroadcastMethod,
} from "@mrgnlabs/marginfi-client-v2";
import {
  ActionMessageType,
  usePrevious,
  STATIC_SIMULATION_ERRORS,
  ActionTxns,
  extractErrorString,
  ActionProcessingError,
} from "@mrgnlabs/mrgn-utils";

import { calculateSummary, generateActionTxns, getLendSimulationResult } from "../utils";
import { SimulationStatus } from "~/components/action-box-v2/utils";
import {
  ComputerUserResponse,
  computerEmptyExtra,
  buildInvoiceWithEntries,
  ComputerInfoResponse,
  initComputerClient,
  XIN_ASSET_ID,
  handleInvoiceSchema,
  UserAssetBalance,
  DEFAULT_CONFIRM_OPTS,
  SolanaTransaction,
  TransactionOptions,
  getComputeBudgetUnits,
  microLamportsToUi,
  ComputerSystemCallRequest,
  SOL_ASSET_ID,
  SOL_DECIMAL,
  MARGINFI_ACCOUNT_INITIALIZE_RENT_SIZES,
  TransactionType,
  add,
  MARGINFI_ACCOUNT_BORROW_RENT_SIZES,
  MARGINFI_ACCOUNT_WITHDRAW_RENT_SIZES,
} from "@mrgnlabs/mrgn-common";
import { buildComputerExtra, buildSystemCallInvoiceExtra } from "@mrgnlabs/mrgn-common/src/mixin";
import { formatTransactions } from "@mrgnlabs/marginfi-client-v2/dist/services/transaction/helpers";
import { MARGINFI_ACCOUNT_DEPOSIT_RENT_SIZES } from "@mrgnlabs/mrgn-common/src/constants";
import BigNumber from "bignumber.js";

type LendMixinSimulationProps = {
  debouncedAmount: number;
  selectedAccount: MarginfiAccountWrapper | null;
  marginfiClient: MarginfiClient | null;
  accountSummary?: AccountSummary;
  selectedBank: ExtendedBankInfo | null;
  lendMode: ActionType;
  actionTxns: ActionTxns;
  simulationResult: SimulationResult | null;
  selectedStakeAccount?: PublicKey;
  setSimulationResult: (result: SimulationResult | null) => void;
  setActionTxns: (actionTxns: ActionTxns) => void;
  setErrorMessage: (error: ActionMessageType | null) => void;
  setIsLoading: ({ isLoading, status }: { isLoading: boolean; status: SimulationStatus }) => void;

  getUserMix?: () => string;
  computerInfo?: ComputerInfoResponse;
  connection?: Connection;
  computerAccount?: ComputerUserResponse;
  getComputerRecipient?: () => string;
  balanceAddressMap?: Record<string, UserAssetBalance>;
  processOpts?: ProcessTransactionsClientOpts;
  txOpts?: TransactionOptions;
  //   tokenMap: Record<string, Token>;
};

// 核心目标: 构建 mixin pay url

// 移除 React Hook，改成普通的异步函数
async function handleLendMixinSimulation({
  amount,
  selectedAccount,
  selectedBank,
  lendMode,
  marginfiClient,
  getUserMix,
  computerInfo,
  connection,
  computerAccount,
  getComputerRecipient,
  balanceAddressMap,
  selectedStakeAccount,
  processOpts: processOptsArgs,
  txOpts,
  setIsLoading,
}: {
  amount: number;
  selectedAccount: MarginfiAccountWrapper | null;
  selectedBank: ExtendedBankInfo;
  lendMode: ActionType;
  marginfiClient: MarginfiClient;
  getUserMix: (() => string) | undefined;
  computerInfo: ComputerInfoResponse | undefined;
  connection: Connection | undefined;
  computerAccount: ComputerUserResponse | undefined;
  getComputerRecipient: (() => string) | undefined;
  balanceAddressMap: Record<string, UserAssetBalance> | undefined;
  selectedStakeAccount?: PublicKey;
  processOpts?: ProcessTransactionsClientOpts;
  txOpts?: TransactionOptions;
  setIsLoading: ({ isLoading, status }: { isLoading: boolean; status: SimulationStatus }) => void;
}): Promise<ComputerSystemCallRequest[]> {
  if (!getUserMix || !computerInfo || !connection || !computerAccount || !getComputerRecipient || !balanceAddressMap) {
    throw new Error("Missing required props");
  }

  // 如果金额为0或缺少必要参数，直接返回空交易
  if (amount === 0 || !selectedBank || !marginfiClient) {
    return [];
  }
  setIsLoading({ isLoading: true, status: SimulationStatus.SIMULATING });

  try {
    // 1. 获取交易
    const actionTxns = await generateActionTxns({
      marginfiAccount: selectedAccount,
      marginfiClient,
      bank: selectedBank,
      lendMode,
      amount,
      stakeAccount: selectedStakeAccount,
    });

    if (!actionTxns.finalAccount) {
      throw new Error("Account not initialized");
    }
    console.log("actionTxns: ", actionTxns);

    let broadcastType: BroadcastMethodType = "RPC";
    let finalFallbackMethod: SpecificBroadcastMethod[] = DEFAULT_PROCESS_TX_STRATEGY.fallbackSequence.filter(
      (method) => method.broadcastType === "RPC"
    );

    let versionedTransactions: VersionedTransaction[] = [];
    let minContextSlot: number;
    let blockhash: string;
    let lastValidBlockHeight: number;
    const commitment = connection.commitment ?? DEFAULT_CONFIRM_OPTS.commitment;

    try {
      const getLatestBlockhashAndContext = await connection.getLatestBlockhashAndContext(commitment);

      minContextSlot = getLatestBlockhashAndContext.context.slot - 4;
      blockhash = getLatestBlockhashAndContext.value.blockhash;
      lastValidBlockHeight = getLatestBlockhashAndContext.value.lastValidBlockHeight;
    } catch (error) {
      console.error("Failed to get latest blockhash and context", error);

      if (error instanceof SolanaJSONRPCError) {
        throw error;
      }

      throw new ProcessTransactionError({
        message: "Failed to get latest blockhash and context.",
        type: ProcessTransactionErrorType.TransactionBuildingError,
        failedTxs: actionTxns.transactions,
      });
    }

    let updatedTransactions: SolanaTransaction[] = actionTxns.transactions;
    const processOpts = {
      ...DEFAULT_PROCESS_TX_OPTS,
      ...processOptsArgs,
    };

    const maxCapUi = processOptsArgs?.maxCapUi;

    console.log("------ Transaction Details 👇 ------");
    console.log(
      `📝 Executing ${actionTxns.transactions.length} transaction${actionTxns.transactions.length > 1 ? "s" : ""}`
    );
    console.log(`📡 Broadcast type: ${broadcastType}`);
    let txAction: TransactionType | undefined;
    updatedTransactions.forEach(async (tx, idx) => {
      if (tx.type === TransactionType.DEPOSIT) {
        txAction = TransactionType.DEPOSIT;
      } else if (tx.type === TransactionType.BORROW) {
        txAction = TransactionType.BORROW;
      } else if (tx.type === TransactionType.WITHDRAW) {
        txAction = TransactionType.WITHDRAW;
      } else if (tx.type === TransactionType.CREATE_ACCOUNT) {
      } else {
        throw new Error("Invalid transaction type");
      }
      const cu = getComputeBudgetUnits(tx);
      const priorityFeeUi = maxCapUi
        ? Math.min(processOpts.priorityFeeMicro ? microLamportsToUi(processOpts.priorityFeeMicro, cu) : 0, maxCapUi)
        : processOpts.priorityFeeMicro
          ? microLamportsToUi(processOpts.priorityFeeMicro, cu)
          : 0;
      console.log(`💸 Priority fee for tx ${idx}: ${priorityFeeUi} SOL`);
    });
    if (
      !txAction ||
      (txAction !== TransactionType.DEPOSIT &&
        txAction !== TransactionType.BORROW &&
        txAction !== TransactionType.WITHDRAW)
    ) {
      throw new Error("Invalid transaction type");
    }

    console.log("--------------------------------");

    versionedTransactions = formatTransactions(
      updatedTransactions,
      broadcastType,
      blockhash,
      {
        priorityFeeMicro: processOpts.priorityFeeMicro ?? 0,
        bundleTipUi: processOpts.bundleTipUi ?? 0,
        feePayer: new PublicKey(computerInfo.payer),

        maxCapUi,
      },
      processOpts.addArenaTxTag
    );

    if (txOpts?.dryRun || processOpts?.isReadOnly) {
      // await dryRunTransaction(processOpts, connection, versionedTransactions);
      return [];
    }

    // 2. 获取 nonce
    const client = initComputerClient();

    // 3. 处理交易指令
    for (const txn of versionedTransactions) {
      const txBuf = Buffer.from(txn.serialize());
      if (!checkSystemCallSize(txBuf)) {
        throw new Error("Transaction size exceeds limit");
      } else {
        console.log("Transaction size is within limit");
      }
    }

    if (versionedTransactions.length > 2) {
      throw new Error("Transaction size exceeds limit");
    }

    const rentMap: Record<string, number> = {};
    const sizes = Array.from(
      new Set([
        ...MARGINFI_ACCOUNT_INITIALIZE_RENT_SIZES,
        ...MARGINFI_ACCOUNT_DEPOSIT_RENT_SIZES,
        ...MARGINFI_ACCOUNT_BORROW_RENT_SIZES,
        ...MARGINFI_ACCOUNT_WITHDRAW_RENT_SIZES,
      ])
    );
    const rents = await Promise.all(sizes.map((size) => connection.getMinimumBalanceForRentExemption(size)));
    sizes.forEach((size, index) => {
      rentMap[size] = rents[index];
    });

    // 4. 构建最终交易
    const invoice = newMixinInvoice(getComputerRecipient());
    if (!invoice) throw new Error("invalid invoice recipient!");

    let resultTrace = "";
    if (versionedTransactions.length === 1) {
      if (txAction === TransactionType.DEPOSIT) {
        // 2. deposit
        const nonce2 = await client.getNonce(getUserMix());
        const depositAddressLookupsRes = await Promise.all(
          (versionedTransactions[0] as VersionedTransaction).message.addressTableLookups.map((a) =>
            connection.getAddressLookupTable(a.accountKey)
          )
        );
        const depositAddressLookups = depositAddressLookupsRes
          .filter((r) => r.value)
          .map((r) => r.value) as AddressLookupTableAccount[];

        const depositInx = TransactionMessage.decompile(versionedTransactions[0].message, {
          addressLookupTableAccounts: depositAddressLookups,
        }).instructions;

        const nonce2Ins = SystemProgram.nonceAdvance({
          noncePubkey: new PublicKey(nonce2.nonce_address),
          authorizedPubkey: new PublicKey(computerInfo.payer),
        });
        const message1V0 = new TransactionMessage({
          payerKey: new PublicKey(computerInfo.payer),
          recentBlockhash: nonce2.nonce_hash,
          instructions: [nonce2Ins, ...depositInx],
        }).compileToV0Message();

        const depositTx = new VersionedTransaction(message1V0);
        if (updatedTransactions[0].signers) {
          depositTx.sign(updatedTransactions[0].signers);
        }
        console.log("depositTx: ", depositTx);
        // 5. 检查交易大小
        const depositTxBuf = Buffer.from(depositTx.serialize());
        if (!checkSystemCallSize(depositTxBuf)) {
          throw new Error("Transaction size exceeds limit");
        }
        const depositTrace = uniqueConversationID(depositTxBuf.toString("hex"), "system call");

        const depositExtra = buildComputerExtra(
          computerInfo.members.app_id,
          OperationTypeSystemCall,
          buildSystemCallInvoiceExtra(computerAccount.id, depositTrace, false)
        );

        const balance = balanceAddressMap[selectedBank.info.rawBank.mint.toBase58()];

        attachStorageEntry(invoice, uniqueConversationID(depositTrace, "storage"), depositTxBuf);
        attachInvoiceEntry(invoice, {
          trace_id: uniqueConversationID(depositTrace, balance.asset_id),
          asset_id: balance.asset_id,
          amount: amount.toString(),
          extra: computerEmptyExtra,
          index_references: [],
          hash_references: [],
        });

        console.log("depositExtra: ", depositExtra);

        console.log("depositTrace: ", depositTrace);
        resultTrace = depositTrace;

        attachInvoiceEntry(invoice, {
          trace_id: depositTrace,
          asset_id: XIN_ASSET_ID,
          amount: BigNumber(computerInfo.params.operation.price).toFixed(8, BigNumber.ROUND_CEIL),
          extra: Buffer.from(depositExtra),
          index_references: [0, 1],
          hash_references: [],
        });
      } else if (txAction === TransactionType.BORROW) {
        // 2. borrow
        const nonce2 = await client.getNonce(getUserMix());
        const borrowAddressLookupsRes = await Promise.all(
          (versionedTransactions[0] as VersionedTransaction).message.addressTableLookups.map((a) =>
            connection.getAddressLookupTable(a.accountKey)
          )
        );
        const borrowAddressLookups = borrowAddressLookupsRes
          .filter((r) => r.value)
          .map((r) => r.value) as AddressLookupTableAccount[];

        const borrowInx = TransactionMessage.decompile(versionedTransactions[0].message, {
          addressLookupTableAccounts: borrowAddressLookups,
        }).instructions;

        const nonce2Ins = SystemProgram.nonceAdvance({
          noncePubkey: new PublicKey(nonce2.nonce_address),
          authorizedPubkey: new PublicKey(computerInfo.payer),
        });
        const message1V0 = new TransactionMessage({
          payerKey: new PublicKey(computerInfo.payer),
          recentBlockhash: nonce2.nonce_hash,
          instructions: [nonce2Ins, ...borrowInx],
        }).compileToV0Message();

        const borrowTx = new VersionedTransaction(message1V0);
        if (updatedTransactions[0].signers) {
          borrowTx.sign(updatedTransactions[0].signers);
        }
        console.log("borrowTx: ", borrowTx);
        const borrowTxBuf = Buffer.from(borrowTx.serialize());
        if (!checkSystemCallSize(borrowTxBuf)) {
          throw new Error("Transaction size exceeds limit");
        }
        const borrowTrace = uniqueConversationID(borrowTxBuf.toString("hex"), "system call");
        const solAmount = formatUnits(
          MARGINFI_ACCOUNT_BORROW_RENT_SIZES.reduce((prev, cur) => {
            const total = prev + rentMap[cur];
            return total;
          }, 0).toString(),
          SOL_DECIMAL
        ).toString();
        const fee = await client.getFeeOnXin(solAmount);

        const borrowExtra = buildComputerExtra(
          computerInfo.members.app_id,
          OperationTypeSystemCall,
          buildSystemCallInvoiceExtra(computerAccount.id, borrowTrace, false, fee.fee_id)
        );

        attachStorageEntry(invoice, uniqueConversationID(borrowTrace, "storage"), borrowTxBuf);

        console.log("borrowExtra: ", borrowExtra);

        console.log("borrowTrace: ", borrowTrace);
        resultTrace = borrowTrace;

        attachInvoiceEntry(invoice, {
          trace_id: borrowTrace,
          asset_id: XIN_ASSET_ID,
          amount: add(computerInfo.params.operation.price, fee.xin_amount).toFixed(8, BigNumber.ROUND_CEIL),
          extra: Buffer.from(borrowExtra),
          index_references: [0],
          hash_references: [],
        });
      } else if (txAction === TransactionType.WITHDRAW) {
        // 2. withdraw
        const nonce2 = await client.getNonce(getUserMix());
        const withdrawAddressLookupsRes = await Promise.all(
          (versionedTransactions[0] as VersionedTransaction).message.addressTableLookups.map((a) =>
            connection.getAddressLookupTable(a.accountKey)
          )
        );
        const withdrawAddressLookups = withdrawAddressLookupsRes
          .filter((r) => r.value)
          .map((r) => r.value) as AddressLookupTableAccount[];

        const withdrawInx = TransactionMessage.decompile(versionedTransactions[0].message, {
          addressLookupTableAccounts: withdrawAddressLookups,
        }).instructions;

        const nonce2Ins = SystemProgram.nonceAdvance({
          noncePubkey: new PublicKey(nonce2.nonce_address),
          authorizedPubkey: new PublicKey(computerInfo.payer),
        });

        const message1V0 = new TransactionMessage({
          payerKey: new PublicKey(computerInfo.payer),
          recentBlockhash: nonce2.nonce_hash,
          instructions: [nonce2Ins, ...withdrawInx],
        }).compileToV0Message();

        const withdrawTx = new VersionedTransaction(message1V0);
        if (updatedTransactions[0].signers) {
          withdrawTx.sign(updatedTransactions[0].signers);
        }
        console.log("withdrawTx: ", withdrawTx);
        const withdrawTxBuf = Buffer.from(withdrawTx.serialize());
        if (!checkSystemCallSize(withdrawTxBuf)) {
          throw new Error("Transaction size exceeds limit");
        }
        const withdrawTrace = uniqueConversationID(withdrawTxBuf.toString("hex"), "system call");
        const solAmount = formatUnits(
          MARGINFI_ACCOUNT_WITHDRAW_RENT_SIZES.reduce((prev, cur) => {
            const total = prev + rentMap[cur];
            return total;
          }, 0).toString(),
          SOL_DECIMAL
        ).toString();
        const fee = await client.getFeeOnXin(solAmount);

        const withdrawExtra = buildComputerExtra(
          computerInfo.members.app_id,
          OperationTypeSystemCall,
          buildSystemCallInvoiceExtra(computerAccount.id, withdrawTrace, false, fee.fee_id)
        );

        attachStorageEntry(invoice, uniqueConversationID(withdrawTrace, "storage"), withdrawTxBuf);

        console.log("withdrawExtra: ", withdrawExtra);

        console.log("withdrawTrace: ", withdrawTrace);
        resultTrace = withdrawTrace;

        attachInvoiceEntry(invoice, {
          trace_id: withdrawTrace,
          asset_id: XIN_ASSET_ID,
          amount: add(computerInfo.params.operation.price, fee.xin_amount).toFixed(8, BigNumber.ROUND_CEIL),
          extra: Buffer.from(withdrawExtra),
          index_references: [0],
          hash_references: [],
        });
      }
    } else if (versionedTransactions.length === 2) {
      // 1. init account
      const initAccountAddressLookupsRes = await Promise.all(
        (versionedTransactions[0] as VersionedTransaction).message.addressTableLookups.map((a) =>
          connection.getAddressLookupTable(a.accountKey)
        )
      );
      const initAccountAddressLookups = initAccountAddressLookupsRes
        .filter((r) => r.value)
        .map((r) => r.value) as AddressLookupTableAccount[];

      const createAccountInx = TransactionMessage.decompile(versionedTransactions[0].message, {
        addressLookupTableAccounts: initAccountAddressLookups,
      }).instructions;
      const nonce1 = await client.getNonce(getUserMix());
      const nonce1Ins = SystemProgram.nonceAdvance({
        noncePubkey: new PublicKey(nonce1.nonce_address),
        authorizedPubkey: new PublicKey(computerInfo.payer),
      });
      const createAccountMessage = new TransactionMessage({
        payerKey: new PublicKey(computerInfo.payer),
        recentBlockhash: nonce1.nonce_hash,
        instructions: [nonce1Ins, ...createAccountInx],
      }).compileToV0Message();

      const createAccountTx = new VersionedTransaction(createAccountMessage);
      if (updatedTransactions[0].signers) {
        createAccountTx.sign(updatedTransactions[0].signers);
      }

      const createAccountTxBuf = Buffer.from(createAccountTx.serialize());
      const createAccountTrace = uniqueConversationID(createAccountTxBuf.toString("hex"), "system call");
      const solAmount = formatUnits(
        MARGINFI_ACCOUNT_INITIALIZE_RENT_SIZES.reduce((prev, cur) => {
          const total = prev + rentMap[cur];
          return total;
        }, 0).toString(),
        SOL_DECIMAL
      ).toString();
      const fee = await client.getFeeOnXin(solAmount);
      const initAccountExtra = buildComputerExtra(
        computerInfo.members.app_id,
        OperationTypeSystemCall,
        buildSystemCallInvoiceExtra(computerAccount.id, createAccountTrace, false, fee.fee_id)
      );

      // const memo = Buffer.from(createAccountTx.serialize());
      attachStorageEntry(invoice, uniqueConversationID(createAccountTrace, "storage"), createAccountTxBuf);
      attachInvoiceEntry(invoice, {
        trace_id: createAccountTrace,
        asset_id: XIN_ASSET_ID,
        amount: add(computerInfo.params.operation.price, fee.xin_amount).toFixed(8, BigNumber.ROUND_CEIL),
        extra: Buffer.from(initAccountExtra),
        index_references: [0],
        hash_references: [],
      });

      // 2. deposit
      const nonce2 = await client.getNonce(getUserMix());
      const depositAddressLookupsRes = await Promise.all(
        (versionedTransactions[1] as VersionedTransaction).message.addressTableLookups.map((a) =>
          connection.getAddressLookupTable(a.accountKey)
        )
      );
      const depositAddressLookups = depositAddressLookupsRes
        .filter((r) => r.value)
        .map((r) => r.value) as AddressLookupTableAccount[];

      const depositInx = TransactionMessage.decompile(versionedTransactions[1].message, {
        addressLookupTableAccounts: depositAddressLookups,
      }).instructions;

      const nonce2Ins = SystemProgram.nonceAdvance({
        noncePubkey: new PublicKey(nonce2.nonce_address),
        authorizedPubkey: new PublicKey(computerInfo.payer),
      });
      const message1V0 = new TransactionMessage({
        payerKey: new PublicKey(computerInfo.payer),
        recentBlockhash: nonce2.nonce_hash,
        instructions: [nonce2Ins, ...depositInx],
      }).compileToV0Message();

      const depositTx = new VersionedTransaction(message1V0);
      if (updatedTransactions[1].signers) {
        depositTx.sign(updatedTransactions[1].signers);
      }
      console.log("depositTx: ", depositTx);
      // 5. 检查交易大小
      const depositTxBuf = Buffer.from(depositTx.serialize());
      if (!checkSystemCallSize(depositTxBuf)) {
        throw new Error("Transaction size exceeds limit");
      }
      const depositTrace = uniqueConversationID(depositTxBuf.toString("hex"), "system call");

      const depositExtra = buildComputerExtra(
        computerInfo.members.app_id,
        OperationTypeSystemCall,
        buildSystemCallInvoiceExtra(computerAccount.id, depositTrace, false)
      );

      const balance = balanceAddressMap[selectedBank.info.rawBank.mint.toBase58()];

      attachStorageEntry(invoice, uniqueConversationID(depositTrace, "storage"), depositTxBuf);
      attachInvoiceEntry(invoice, {
        trace_id: uniqueConversationID(depositTrace, balance.asset_id),
        asset_id: balance.asset_id,
        amount: amount.toString(),
        extra: computerEmptyExtra,
        index_references: [],
        hash_references: [],
      });

      console.log("depositExtra: ", depositExtra);

      console.log("depositTrace: ", depositTrace);
      resultTrace = depositTrace;

      attachInvoiceEntry(invoice, {
        trace_id: depositTrace,
        asset_id: XIN_ASSET_ID,
        amount: BigNumber(computerInfo.params.operation.price).toFixed(8, BigNumber.ROUND_CEIL),
        extra: Buffer.from(depositExtra),
        index_references: [2, 3],
        hash_references: [],
      });
    } else {
      throw new Error("Transaction size exceeds limit");
    }

    console.log("resultTrace: ", resultTrace);
    if (!resultTrace || resultTrace.length === 0) {
      throw new Error("resultTrace not found");
    }

    const url = handleInvoiceSchema(getInvoiceString(invoice));
    console.log(invoice, url);
    const mixinApi = MixinApi();
    const scheme = await mixinApi.code.schemes(url);
    const req1 = {
      trace: resultTrace,
      value: `https://mixin.one/schemes/${scheme.scheme_id}`,
    };
    setIsLoading({ isLoading: false, status: SimulationStatus.COMPLETE });
    return [req1];
  } catch (error) {
    console.error("Error in handleLendMixinSimulation:", error);
    setIsLoading({ isLoading: false, status: SimulationStatus.COMPLETE });
    return [];
  }
}

export { handleLendMixinSimulation };
