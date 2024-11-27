import {
  TransactionError,
  PublicKey,
  RpcResponseAndContext,
  VersionedTransaction,
  SolanaJSONRPCError,
  SimulatedTransactionResponse,
} from "@solana/web3.js";

export class BundleSimulationError extends Error {
  constructor(message: string, public readonly logs?: string[], public readonly cause?: unknown) {
    super(message);
    this.name = "BundleSimulationError";
  }

  static fromHttpError(status: number, statusText: string): BundleSimulationError {
    return new BundleSimulationError(`HTTP error ${status}: ${statusText}`);
  }

  static fromEncodingError(error: unknown, index?: number): BundleSimulationError {
    return new BundleSimulationError(`Failed to encode transaction${index !== undefined ? ` at index ${index}` : "s"}`);
  }
}

type JsonRpcResponse<T> =
  | {
      id: number;
      jsonrpc: string;
      result: RpcResponseAndContext<T>;
    }
  | {
      id: number;
      jsonrpc: string;
      error: SolanaJSONRPCError;
    };

interface RpcSimulateBundleResult {
  summary:
    | "succeeded"
    | {
        failed: {
          error: any;
          txSignature?: string;
        };
      };
  transactionResults: RpcSimulateBundleTransactionResult[];
}

export function isSimulatedTransactionResponse(
  response: SimulatedTransactionResponse | RpcSimulateBundleTransactionResult[]
): response is SimulatedTransactionResponse {
  return !Array.isArray(response) && "err" in response;
}

export interface RpcSimulateBundleTransactionResult {
  err?: TransactionError;
  logs: string[];
  preExecutionAccounts?: any; //UiAccount[],
  postExecutionAccounts?: any; //UiAccount[],
  unitsConsumed?: string;
  returnData?: any; //UiTransactionReturnData,
}

interface RpcSimulateBundleConfig {
  preExecutionAccountsConfigs: (RpcSimulateTransactionAccountsConfig | undefined)[];
  postExecutionAccountsConfigs: (RpcSimulateTransactionAccountsConfig | undefined)[];
  transactionEncoding?: any;
  simulationBank?: SimulationSlotConfig;
  skipSigVerify?: boolean;
  replaceRecentBlockhash?: boolean;
}

interface RpcSimulateTransactionAccountsConfig {
  encoding?: any; // UiAccountEncoding,
  addresses: string[];
}

type SimulationSlotConfig = "confirmed" | "processed" | number;

export async function simulateBundle(
  rpcEndpoint: string,
  transactions: VersionedTransaction[],
  includeAccounts?: Array<PublicKey>
): Promise<RpcSimulateBundleTransactionResult[]> {
  // Validate input
  if (!transactions.length) {
    throw new BundleSimulationError("No bundle provided for simulation");
  }

  try {
    // Prepare transaction data
    const encodedTransactions = encodeTransactions(transactions);
    const config = createBundleConfig(transactions, includeAccounts);

    // Execute simulation
    const result = await executeBundleSimulation(rpcEndpoint, encodedTransactions, config);

    return result;
  } catch (error) {
    // If it's already a SolanaJSONRPCError or BundleSimulationError, rethrow it
    if (error instanceof SolanaJSONRPCError || error instanceof BundleSimulationError) {
      throw error;
    } else {
      throw new BundleSimulationError("Failed to execute bundle simulation", undefined, error);
    }
  }
}

function encodeTransactions(transactions: VersionedTransaction[]): string[] {
  try {
    return transactions.map((tx, index) => {
      try {
        const serialized = tx.serialize();
        return Buffer.from(serialized).toString("base64");
      } catch (error) {
        throw BundleSimulationError.fromEncodingError(error, index);
      }
    });
  } catch (error) {
    if (error instanceof BundleSimulationError) throw error;
    throw BundleSimulationError.fromEncodingError(error);
  }
}

function createBundleConfig(
  transactions: VersionedTransaction[],
  includeAccounts?: Array<PublicKey>
): RpcSimulateBundleConfig {
  return {
    skipSigVerify: true,
    replaceRecentBlockhash: true,
    preExecutionAccountsConfigs: transactions.map(() => ({ addresses: [] })),
    postExecutionAccountsConfigs: transactions.map((_, index) => ({
      addresses:
        index === transactions.length - 1 && includeAccounts
          ? includeAccounts.map((account) => account.toBase58())
          : [],
    })),
  };
}

async function executeBundleSimulation(
  rpcEndpoint: string,
  encodedTransactions: string[],
  config: RpcSimulateBundleConfig
): Promise<RpcSimulateBundleTransactionResult[]> {
  const response = await fetch(rpcEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "simulateBundle",
      params: [{ encodedTransactions }, config],
    }),
  });

  if (!response.ok) {
    throw BundleSimulationError.fromHttpError(response.status, response.statusText);
  }

  const jsonResponse = (await response.json()) as JsonRpcResponse<RpcSimulateBundleResult>;

  if ("error" in jsonResponse) {
    throw jsonResponse.error;
  }

  const value = jsonResponse.result.value;

  if (value.summary !== "succeeded") {
    const logs = value.transactionResults.flatMap((tx) => tx.logs);

    throw new BundleSimulationError(JSON.stringify(value.summary.failed.error), logs);
  }

  return value.transactionResults;
}
