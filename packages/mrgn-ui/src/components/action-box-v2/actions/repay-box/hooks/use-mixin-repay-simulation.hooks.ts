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
  JupiterOptions,
  RepayActionTxns,
} from "@mrgnlabs/mrgn-utils";

// import { calculateSummary, generateActionTxns } from "../utils";
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
  MARGINFI_ACCOUNT_REPAY_RENT_SIZES,
} from "@mrgnlabs/mrgn-common";
import { buildComputerExtra, buildSystemCallInvoiceExtra } from "@mrgnlabs/mrgn-common/src/mixin";
import { formatTransactions } from "@mrgnlabs/marginfi-client-v2/dist/services/transaction/helpers";
import {
  MARGINFI_ACCOUNT_DEPOSIT_RENT_SIZES,
  MARGINFI_ACCOUNT_REPAY_COLLATERAL_RENT_SIZES,
} from "@mrgnlabs/mrgn-common/src/constants";
import BigNumber from "bignumber.js";
import { generateActionTxns } from "../../lend-box/utils";
import { calculateRepayTransactions, CalculateRepayTransactionsProps } from "../utils";

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

async function handleRepayMixinSimulation({
  amount,
  selectedAccount,
  marginfiClient,
  accountSummary,
  selectedBank,
  selectedSecondaryBank,
  actionTxns,

  simulationResult,

  platformFeeBps,
  jupiterOptions,

  setSimulationResult,
  setActionTxns,
  setErrorMessage,
  setRepayAmount,
  setIsLoading,
  setMaxAmountCollateral,
  setMaxOverflowHit,

  getUserMix,
  computerInfo,
  connection,
  computerAccount,
  getComputerRecipient,
  balanceAddressMap,
  selectedStakeAccount,
  processOptsArgs,
  txOpts,
}: {
  amount: number;
  selectedAccount: MarginfiAccountWrapper | null;
  marginfiClient: MarginfiClient | null;
  accountSummary?: AccountSummary;
  selectedBank: ExtendedBankInfo | null;
  selectedSecondaryBank: ExtendedBankInfo | null;
  actionTxns: RepayActionTxns;
  simulationResult: SimulationResult | null;
  isRefreshTxn: boolean;

  platformFeeBps: number;
  jupiterOptions: JupiterOptions | null;

  setSimulationResult: (simulationResult: SimulationResult | null) => void;
  setActionTxns: (actionTxns: RepayActionTxns) => void;
  setErrorMessage: (error: ActionMessageType | null) => void;
  setRepayAmount: (repayAmount: number) => void;
  setIsLoading: ({ isLoading, status }: { isLoading: boolean; status: SimulationStatus }) => void;
  setMaxAmountCollateral: (maxAmountCollateral?: number) => void;
  setMaxOverflowHit: (maxOverflowHit: boolean) => void;

  getUserMix: (() => string) | undefined;
  computerInfo: ComputerInfoResponse | undefined;
  connection: Connection | undefined;
  computerAccount: ComputerUserResponse | undefined;
  getComputerRecipient: (() => string) | undefined;
  balanceAddressMap: Record<string, UserAssetBalance> | undefined;
  selectedStakeAccount?: PublicKey;
  processOptsArgs?: ProcessTransactionsClientOpts;
  txOpts?: TransactionOptions;
}): Promise<ComputerSystemCallRequest[]> {
  if (!getUserMix || !computerInfo || !connection || !computerAccount || !getComputerRecipient || !balanceAddressMap) {
    throw new Error("Missing required props");
  }
  // 如果金额为0或缺少必要参数，直接返回空交易
  if (amount === 0 || !selectedBank || !marginfiClient) {
    return [];
  }
  if (!selectedSecondaryBank || !selectedAccount || !selectedBank || !jupiterOptions) {
    setActionTxns({ transactions: [], actionQuote: null });
    return [];
  }
  setIsLoading({ isLoading: true, status: SimulationStatus.SIMULATING });

  try {
    let actionType;

    if (selectedBank.address.toBase58() === selectedSecondaryBank.address.toBase58()) {
      actionType = ActionType.Repay;
    } else {
      actionType = ActionType.RepayCollat;
    }

    if (actionType === ActionType.RepayCollat) {
      throw new Error("Repay collateral not supported");
    }

    const props: CalculateRepayTransactionsProps = {
      marginfiAccount: selectedAccount,
      selectedBank: selectedBank,
      selectedSecondaryBank: selectedSecondaryBank,
      connection: marginfiClient.provider.connection,
      platformFeeBps,
      jupiterOptions,
      repayAmount: amount,
      actionType,
    };

    const repayActionTxns = await fetchRepayActionTxns(props);
    setRepayAmount(repayActionTxns.actionTxns.amount);

    console.log("repayActionTxns: ", repayActionTxns);

    let updatedTransactions: SolanaTransaction[] = repayActionTxns.actionTxns.repayCollatObject.transactions;
    const processOpts = {
      ...DEFAULT_PROCESS_TX_OPTS,
      ...processOptsArgs,
    };

    let broadcastType: BroadcastMethodType = "RPC";
    const maxCapUi = processOptsArgs?.maxCapUi;
    console.log("------ Transaction Details 👇 ------");
    console.log(`📝 Executing ${updatedTransactions.length} transaction${updatedTransactions.length > 1 ? "s" : ""}`);
    console.log(`📡 Broadcast type: ${broadcastType}`);
    updatedTransactions.forEach(async (tx, idx) => {
      const cu = getComputeBudgetUnits(tx);
      const priorityFeeUi = maxCapUi
        ? Math.min(processOpts.priorityFeeMicro ? microLamportsToUi(processOpts.priorityFeeMicro, cu) : 0, maxCapUi)
        : processOpts.priorityFeeMicro
          ? microLamportsToUi(processOpts.priorityFeeMicro, cu)
          : 0;
      console.log(`💸 Priority fee for tx ${idx}: ${priorityFeeUi} SOL`);
    });

    let versionedTransactions: VersionedTransaction[] = [];
    let blockhash: string;
    const commitment = connection.commitment ?? DEFAULT_CONFIRM_OPTS.commitment;

    try {
      const getLatestBlockhashAndContext = await connection.getLatestBlockhashAndContext(commitment);
      blockhash = getLatestBlockhashAndContext.value.blockhash;
    } catch (error) {
      console.error("Failed to get latest blockhash and context", error);
      if (error instanceof SolanaJSONRPCError) {
        throw error;
      }

      throw new ProcessTransactionError({
        message: "Failed to get latest blockhash and context.",
        type: ProcessTransactionErrorType.TransactionBuildingError,
        failedTxs: updatedTransactions,
      });
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

    // 这里假设 ata 已经创建过了,所以只处理系统调用
    const rentMap: Record<string, number> = {};
    // const sizes = Array.from(
    //   new Set([...MARGINFI_ACCOUNT_REPAY_RENT_SIZES, ...MARGINFI_ACCOUNT_REPAY_COLLATERAL_RENT_SIZES])
    // );
    // const rents = await Promise.all(sizes.map((size) => connection.getMinimumBalanceForRentExemption(size)));
    // sizes.forEach((size, index) => {
    //   rentMap[size] = rents[index];
    // });

    // 4. 构建最终交易
    const invoice = newMixinInvoice(getComputerRecipient());
    if (!invoice) throw new Error("invalid invoice recipient!");

    let resultTrace = "";
    if (versionedTransactions.length >= 1 && actionType === ActionType.Repay) {
      // 这里只处理 repay 的情况
      const nonce2 = await client.getNonce(getUserMix());

      const repayAddressLookupsRes = await Promise.all(
        (versionedTransactions[0] as VersionedTransaction).message.addressTableLookups.map((a) =>
          connection.getAddressLookupTable(a.accountKey)
        )
      );
      const repayAddressLookups = repayAddressLookupsRes
        .filter((r) => r.value)
        .map((r) => r.value) as AddressLookupTableAccount[];

      const repayInx = TransactionMessage.decompile(versionedTransactions[0].message, {
        addressLookupTableAccounts: repayAddressLookups,
      }).instructions;

      const nonce2Ins = SystemProgram.nonceAdvance({
        noncePubkey: new PublicKey(nonce2.nonce_address),
        authorizedPubkey: new PublicKey(computerInfo.payer),
      });
      const message1V0 = new TransactionMessage({
        payerKey: new PublicKey(computerInfo.payer),
        recentBlockhash: nonce2.nonce_hash,
        instructions: [nonce2Ins, ...repayInx],
      }).compileToV0Message();

      const repayTx = new VersionedTransaction(message1V0);
      if (!updatedTransactions[0].signers) {
        throw new Error("signers not found");
      }
      repayTx.sign(updatedTransactions[0].signers);
      console.log("repayTx: ", repayTx);

      // 5. 检查交易大小
      const repayTxBuf = Buffer.from(repayTx.serialize());
      if (!checkSystemCallSize(repayTxBuf)) {
        throw new Error("Transaction size exceeds limit");
      }
      const repayTrace = uniqueConversationID(repayTxBuf.toString("hex"), "system call");

      const repayExtra = buildComputerExtra(
        computerInfo.members.app_id,
        OperationTypeSystemCall,
        buildSystemCallInvoiceExtra(computerAccount.id, repayTrace, false)
      );

      const balance = balanceAddressMap[selectedBank.info.rawBank.mint.toBase58()];

      attachStorageEntry(invoice, uniqueConversationID(repayTrace, "storage"), repayTxBuf);
      attachInvoiceEntry(invoice, {
        trace_id: uniqueConversationID(repayTrace, balance.asset_id),
        asset_id: balance.asset_id,
        amount: amount.toString(),
        extra: computerEmptyExtra,
        index_references: [],
        hash_references: [],
      });

      console.log("repayExtra: ", repayExtra);
      console.log("repayTrace: ", repayTrace);
      resultTrace = repayTrace;

      attachInvoiceEntry(invoice, {
        trace_id: repayTrace,
        asset_id: XIN_ASSET_ID,
        amount: BigNumber(computerInfo.params.operation.price).toFixed(8, BigNumber.ROUND_CEIL),
        extra: Buffer.from(repayExtra),
        index_references: [0, 1],
        hash_references: [],
      });
      // } else if (actionType === ActionType.RepayCollat) {
      //   // 这里需要判断是否有 ata 创建
      //   for (const t of updatedTransactions) {
      //     if (t.type === TransactionType.CRANK) {
      //       // if crank then retry
      //       throw new Error("Retry to repay collateral");
      //     }
      //   }
      //   if (
      //     updatedTransactions.length === 2 &&
      //     updatedTransactions[0].type === TransactionType.CREATE_ATA &&
      //     updatedTransactions[1].type === TransactionType.REPAY_COLLAT
      //   ) {
      //     // 1. 创建 ata
      //     // 1. init account
      //     const initAccountAddressLookupsRes = await Promise.all(
      //       (versionedTransactions[0] as VersionedTransaction).message.addressTableLookups.map((a) =>
      //         connection.getAddressLookupTable(a.accountKey)
      //       )
      //     );
      //     const initAccountAddressLookups = initAccountAddressLookupsRes
      //       .filter((r) => r.value)
      //       .map((r) => r.value) as AddressLookupTableAccount[];

      //     const createAccountInx = TransactionMessage.decompile(versionedTransactions[0].message, {
      //       addressLookupTableAccounts: initAccountAddressLookups,
      //     }).instructions;
      //     const nonce1 = await client.getNonce(getUserMix());
      //     const nonce1Ins = SystemProgram.nonceAdvance({
      //       noncePubkey: new PublicKey(nonce1.nonce_address),
      //       authorizedPubkey: new PublicKey(computerInfo.payer),
      //     });
      //     const createAccountMessage = new TransactionMessage({
      //       payerKey: new PublicKey(computerInfo.payer),
      //       recentBlockhash: nonce1.nonce_hash,
      //       instructions: [nonce1Ins, ...createAccountInx],
      //     }).compileToV0Message();

      //     const createAccountTx = new VersionedTransaction(createAccountMessage);
      //     console.log("updatedTransactions[0]: ", updatedTransactions[0]);
      //     if (updatedTransactions[0].signers) {
      //       createAccountTx.sign(updatedTransactions[0].signers);
      //     }

      //     const createAccountTxBuf = Buffer.from(createAccountTx.serialize());
      //     if (!checkSystemCallSize(createAccountTxBuf)) {
      //       throw new Error("Transaction size exceeds limit");
      //     }

      //     const createAccountTrace = uniqueConversationID(createAccountTxBuf.toString("hex"), "system call");
      //     const solAmount = formatUnits(
      //       MARGINFI_ACCOUNT_REPAY_COLLATERAL_RENT_SIZES.reduce((prev, cur) => {
      //         const total = prev + rentMap[cur];
      //         return total;
      //       }, 0).toString(),
      //       SOL_DECIMAL
      //     ).toString();
      //     const fee = await client.getFeeOnXin(solAmount);
      //     const initAccountExtra = buildComputerExtra(
      //       computerInfo.members.app_id,
      //       OperationTypeSystemCall,
      //       buildSystemCallInvoiceExtra(computerAccount.id, createAccountTrace, false, fee.fee_id)
      //     );

      //     attachStorageEntry(invoice, uniqueConversationID(createAccountTrace, "storage"), createAccountTxBuf);
      //     attachInvoiceEntry(invoice, {
      //       trace_id: createAccountTrace,
      //       asset_id: XIN_ASSET_ID,
      //       amount: add(computerInfo.params.operation.price, fee.xin_amount).toFixed(8, BigNumber.ROUND_CEIL),
      //       extra: Buffer.from(initAccountExtra),
      //       index_references: [0],
      //       hash_references: [],
      //     });

      //     // repay collateral
      //     const nonce2 = await client.getNonce(getUserMix());
      //     const nonce2Ins = SystemProgram.nonceAdvance({
      //       noncePubkey: new PublicKey(nonce2.nonce_address),
      //       authorizedPubkey: new PublicKey(computerInfo.payer),
      //     });
      //     const repayCollatAddressLookupsRes = await Promise.all(
      //       (versionedTransactions[1] as VersionedTransaction).message.addressTableLookups.map((a) =>
      //         connection.getAddressLookupTable(a.accountKey)
      //       )
      //     );
      //     const repayCollatAddressLookups = repayCollatAddressLookupsRes
      //       .filter((r) => r.value)
      //       .map((r) => r.value) as AddressLookupTableAccount[];

      //     const repayCollatInx = TransactionMessage.decompile(versionedTransactions[1].message, {
      //       addressLookupTableAccounts: repayCollatAddressLookups,
      //     }).instructions;

      //     const repayCollatMessage = new TransactionMessage({
      //       payerKey: new PublicKey(computerInfo.payer),
      //       recentBlockhash: nonce2.nonce_hash,
      //       instructions: [nonce2Ins, ...repayCollatInx],
      //     }).compileToV0Message();

      //     const repayCollatTx = new VersionedTransaction(repayCollatMessage);
      //     if (updatedTransactions[1].signers) {
      //       repayCollatTx.sign(updatedTransactions[1].signers);
      //     }

      //     const repayCollatTxBuf = Buffer.from(repayCollatTx.serialize());
      //     if (!checkSystemCallSize(repayCollatTxBuf)) {
      //       throw new Error("Transaction size exceeds limit");
      //     }
      //     const repayCollatTrace = uniqueConversationID(repayCollatTxBuf.toString("hex"), "system call");
      //     const repayCollatExtra = buildComputerExtra(
      //       computerInfo.members.app_id,
      //       OperationTypeSystemCall,
      //       buildSystemCallInvoiceExtra(computerAccount.id, repayCollatTrace, false)
      //     );
      //     attachStorageEntry(invoice, uniqueConversationID(repayCollatTrace, "storage"), repayCollatTxBuf);

      //     const balance = balanceAddressMap[selectedSecondaryBank.info.rawBank.mint.toBase58()];
      //     console.log("balance: ", balance);

      //     attachInvoiceEntry(invoice, {
      //       trace_id: uniqueConversationID(repayCollatTrace, balance.asset_id),
      //       asset_id: balance.asset_id,
      //       amount: amount.toString(),
      //       extra: computerEmptyExtra,
      //       index_references: [],
      //       hash_references: [],
      //     });

      //     resultTrace = repayCollatTrace;
      //     attachInvoiceEntry(invoice, {
      //       trace_id: repayCollatTrace,
      //       asset_id: XIN_ASSET_ID,
      //       amount: BigNumber(computerInfo.params.operation.price).toFixed(8, BigNumber.ROUND_CEIL),
      //       extra: Buffer.from(repayCollatExtra),
      //       index_references: [2, 3],
      //       hash_references: [],
      //     });
      //   } else if (updatedTransactions.length === 1 && updatedTransactions[0].type === TransactionType.REPAY_COLLAT) {
      //     // repay collateral
      //     const nonce = await client.getNonce(getUserMix());
      //     const nonceIns = SystemProgram.nonceAdvance({
      //       noncePubkey: new PublicKey(nonce.nonce_address),
      //       authorizedPubkey: new PublicKey(computerInfo.payer),
      //     });
      //     const repayCollatAddressLookupsRes = await Promise.all(
      //       (versionedTransactions[1] as VersionedTransaction).message.addressTableLookups.map((a) =>
      //         connection.getAddressLookupTable(a.accountKey)
      //       )
      //     );
      //     const repayCollatAddressLookups = repayCollatAddressLookupsRes
      //       .filter((r) => r.value)
      //       .map((r) => r.value) as AddressLookupTableAccount[];

      //     const repayCollatInx = TransactionMessage.decompile(versionedTransactions[1].message, {
      //       addressLookupTableAccounts: repayCollatAddressLookups,
      //     }).instructions;

      //     const repayCollatMessage = new TransactionMessage({
      //       payerKey: new PublicKey(computerInfo.payer),
      //       recentBlockhash: nonce.nonce_hash,
      //       instructions: [nonceIns, ...repayCollatInx],
      //     }).compileToV0Message();

      //     const repayCollatTx = new VersionedTransaction(repayCollatMessage);
      //     if (!updatedTransactions[1].signers) {
      //       throw new Error("signers not found");
      //     }
      //     repayCollatTx.sign(updatedTransactions[1].signers);

      //     const repayCollatTxBuf = Buffer.from(repayCollatTx.serialize());
      //     if (!checkSystemCallSize(repayCollatTxBuf)) {
      //       throw new Error("Transaction size exceeds limit");
      //     }
      //     const repayCollatTrace = uniqueConversationID(repayCollatTxBuf.toString("hex"), "system call");

      //     const repayCollatExtra = buildComputerExtra(
      //       computerInfo.members.app_id,
      //       OperationTypeSystemCall,
      //       buildSystemCallInvoiceExtra(computerAccount.id, repayCollatTrace, false)
      //     );

      //     attachStorageEntry(invoice, uniqueConversationID(repayCollatTrace, "storage"), repayCollatTxBuf);

      //     const balance = balanceAddressMap[selectedSecondaryBank.info.rawBank.mint.toBase58()];
      //     attachInvoiceEntry(invoice, {
      //       trace_id: uniqueConversationID(repayCollatTrace, balance.asset_id),
      //       asset_id: balance.asset_id,
      //       amount: amount.toString(),
      //       extra: computerEmptyExtra,
      //       index_references: [],
      //       hash_references: [],
      //     });

      //     resultTrace = repayCollatTrace;
      //     attachInvoiceEntry(invoice, {
      //       trace_id: repayCollatTrace,
      //       asset_id: XIN_ASSET_ID,
      //       amount: amount.toString(),
      //       extra: Buffer.from(repayCollatExtra),
      //       index_references: [0, 1],
      //       hash_references: [],
      //     });
      //   }
    } else {
      throw new Error("Invalid action type");
    }

    console.log("resultTrace: ", resultTrace);
    console.log("invoice: ", invoice);
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

const fetchRepayActionTxns = async (props: CalculateRepayTransactionsProps) => {
  const repayActionTxns = await calculateRepayTransactions(props);
  return {
    actionTxns: { ...repayActionTxns, actionQuote: repayActionTxns.repayCollatObject.actionQuote },
  };
};

export { handleRepayMixinSimulation };
