import { TransactionError, PublicKey, SimulatedTransactionResponse, RpcResponseAndContext, VersionedTransaction, Connection } from "@solana/web3.js";

export interface JsonRpcContext {
  apiVersion: number;
  slot: number;
}

export interface JsonRpcError {
  code: number;
  message: string;
}

export type JsonRpcResponse<T> = {
  id: number;
  jsonrpc: string;
  result: RpcResponseAndContext<T>;
} | {
  id: number;
  jsonrpc: string;
  error: JsonRpcError;
}

export interface RpcSimulateBundleResult {
  summary: "succeeded" | {
    failed: {
      error: any,
      txSignature?: string,
    }
  },
  transactionResults: RpcSimulateBundleTransactionResult[],
}

export interface RpcSimulateBundleTransactionResult {
  err?: TransactionError,
  logs: string[],
  preExecutionAccounts?: any, //UiAccount[],
  postExecutionAccounts?: any, //UiAccount[],
  unitsConsumed?: string,
  returnData?: any, //UiTransactionReturnData,
}

export interface RpcSimulateBundleConfig {
  preExecutionAccountsConfigs: (RpcSimulateTransactionAccountsConfig | undefined)[],
  postExecutionAccountsConfigs: (RpcSimulateTransactionAccountsConfig | undefined)[],
  transactionEncoding?: any,
  simulationBank?: SimulationSlotConfig,
  skipSigVerify?: boolean,
  replaceRecentBlockhash?: boolean,
}

export interface RpcSimulateTransactionAccountsConfig {
  encoding?: any, // UiAccountEncoding,
  addresses: string[],
}

export type SimulationSlotConfig = "confirmed" | "processed" | number;


export async function simulateBundle(
  rpcEndpoint: string,
  transactions: VersionedTransaction[],
  includeAccounts?: Array<PublicKey>
): Promise<RpcResponseAndContext<SimulatedTransactionResponse>> {
  if (transactions.length === 0) {
    throw new Error("Empty bundle");
  }
  const encodedTransactions = transactions.map((tx) => {
    const serialized = tx.serialize();
    return Buffer.from(serialized).toString("base64");
  });
  const preExecutionAccountsConfigs = transactions.map(() => ({ addresses: [] }));
  let postExecutionAccountsConfigs = transactions.map((_, index) => {
    if (index === transactions.length - 1) {
      return {
        addresses: includeAccounts ? includeAccounts.map((account) => account.toBase58()) : []
      };
    } else {
      return ({ addresses: [] })
    }
  });

  const config: RpcSimulateBundleConfig = {
    skipSigVerify: true,
    replaceRecentBlockhash: true,
    preExecutionAccountsConfigs,
    postExecutionAccountsConfigs,
  };

  const responseRaw = await fetch(rpcEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "simulateBundle",
      params: [{ encodedTransactions }, config],
    }),
  });

  const response = await responseRaw.json() as JsonRpcResponse<RpcSimulateBundleResult>;
  if ("error" in response) {
    throw new Error(response.error.message);
  }

  const context = response.result.context;
  const value = response.result.value;

  const err = value.summary !== "succeeded" ? JSON.stringify(value.summary.failed.error) : null;
  return {
    context,
    value: {
      err,
      logs: value.transactionResults.flatMap((tx) => tx.logs),
      accounts: value.transactionResults[value.transactionResults.length - 1].postExecutionAccounts,
    },
  }
}
