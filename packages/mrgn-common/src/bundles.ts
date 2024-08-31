import { Signer } from "@solana/web3.js";
import { TransactionError } from "@solana/web3.js";
import { PublicKey } from "@solana/web3.js";
import { SimulatedTransactionResponse } from "@solana/web3.js";
import { RpcResponseAndContext, VersionedTransaction } from "@solana/web3.js";
import { Connection } from "@solana/web3.js";

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
    error: any,
    txSignature?: string,
  },
  transactionResults: RpcSimulateBundleTransactionResult[],
}

export interface RpcSimulateBundleTransactionResult {
  err?: TransactionError,
  logs: string[],
  preExecutionAccounts?: any, //UiAccount[],
  postExecutionAccounts?: any, //UiAccount[],
  units_consumed?: string,
  return_data?: any, //UiTransactionReturnData,
}

export async function simulateBundle(
  connection: Connection,
  transactions: VersionedTransaction[],
  signers?: Array<Signer>,
  includeAccounts?: boolean | Array<PublicKey>
): Promise<RpcResponseAndContext<SimulatedTransactionResponse>> {
  const encodedTransactions = transactions.map((tx) => {
    const serialized = tx.serialize();
    return Buffer.from(serialized).toString("base64");
  });

  const responseRaw = await fetch(connection.rpcEndpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "simulateBundle",
      params: [{ encodedTransactions }],
    }),
  });

  const response = await responseRaw.json() as JsonRpcResponse<RpcSimulateBundleResult>;
  if ("error" in response) {
    throw new Error(response.error.message);
  }

  const context = response.result.context;
  const value = response.result.value;
  console.log(value)

  return {
    context,
    value: {
      err: value.summary !== "succeeded" ? value.summary.error : {},
      logs: value.transactionResults.flatMap((tx) => tx.logs),
      accounts: value.transactionResults[value.transactionResults.length - 1].postExecutionAccounts,
    },
  }
}
