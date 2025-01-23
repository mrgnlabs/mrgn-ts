import type { RecentPrioritizationFees } from "@solana/web3.js";
import { Connection, type GetRecentPrioritizationFeesConfig } from "@solana/web3.js";

export type TransactionBroadcastType = "BUNDLE" | "RPC" | "DYNAMIC";

export type TransactionPriorityType = "NORMAL" | "HIGH" | "MAMAS";

export type MaxCapType = "DYNAMIC" | "MANUAL";

export type TransactionSettings = {
  broadcastType: TransactionBroadcastType;
  priorityType: TransactionPriorityType;
  maxCapType: MaxCapType;
  maxCap: number;
};

// easy to use values for user convenience
export const enum PriotitizationFeeLevels {
  LOW = 2500,
  MEDIAN = 5000,
  HIGH = 7500,
  MAX = 10000,
}

// extending the original interface to include the percentile and fallback options and maintain compatibility
interface GetRecentPrioritizationFeesByPercentileConfig extends GetRecentPrioritizationFeesConfig {
  percentile?: PriotitizationFeeLevels | number;
  fallback?: boolean;
}

interface RpcResponse {
  jsonrpc: String;
  id?: String;
  result?: [];
  error?: any;
}

type PriorityFeeCapByPercentileResponse = {
  min: RecentPrioritizationFees;
  max: RecentPrioritizationFees;
  mean: number;
  median: number;
};

export const getCalculatedPrioritizationFeeByPercentile = async (
  connection: Connection,
  config: GetRecentPrioritizationFeesByPercentileConfig,
  slotsToReturn?: number
): Promise<PriorityFeeCapByPercentileResponse> => {
  const fees = await getRecentPrioritizationFeesByPercentile(connection, config, slotsToReturn);

  // Calculate min, max, mean
  const { min, max, sum } = fees.reduce(
    (acc, fee) => ({
      min: fee.prioritizationFee < acc.min.prioritizationFee ? fee : acc.min,
      max: fee.prioritizationFee > acc.max.prioritizationFee ? fee : acc.max,
      sum: acc.sum + fee.prioritizationFee,
    }),
    { min: fees[0], max: fees[0], sum: 0 }
  );

  const mean = Math.ceil(sum / fees.length);

  // Calculate median
  const sortedFees = [...fees].sort((a, b) => a.prioritizationFee - b.prioritizationFee);
  const midIndex = Math.floor(fees.length / 2);

  const median =
    fees.length % 2 === 0
      ? Math.ceil((sortedFees[midIndex - 1].prioritizationFee + sortedFees[midIndex].prioritizationFee) / 2)
      : sortedFees[midIndex].prioritizationFee;

  return {
    min,
    max,
    mean,
    median,
  };
};

export const getMinPrioritizationFeeByPercentile = async (
  connection: Connection,
  config: GetRecentPrioritizationFeesByPercentileConfig,
  slotsToReturn?: number
): Promise<number> => {
  const recentPrioritizationFees = await getRecentPrioritizationFeesByPercentile(connection, config, slotsToReturn);

  const minPriorityFee = recentPrioritizationFees.reduce((min, current) => {
    return current.prioritizationFee < min.prioritizationFee ? current : min;
  });

  return minPriorityFee.prioritizationFee;
};

export const getMaxPrioritizationFeeByPercentile = async (
  connection: Connection,
  config: GetRecentPrioritizationFeesByPercentileConfig,
  slotsToReturn?: number
): Promise<number> => {
  const recentPrioritizationFees = await getRecentPrioritizationFeesByPercentile(connection, config, slotsToReturn);

  const maxPriorityFee = recentPrioritizationFees.reduce((max, current) => {
    return current.prioritizationFee > max.prioritizationFee ? current : max;
  });

  return maxPriorityFee.prioritizationFee;
};

export const getMeanPrioritizationFeeByPercentile = async (
  connection: Connection,
  config: GetRecentPrioritizationFeesByPercentileConfig,
  slotsToReturn?: number
): Promise<number> => {
  const recentPrioritizationFees = await getRecentPrioritizationFeesByPercentile(connection, config, slotsToReturn);

  const mean = Math.ceil(
    recentPrioritizationFees.reduce((acc, fee) => acc + fee.prioritizationFee, 0) / recentPrioritizationFees.length
  );

  return mean;
};

export const getMedianPrioritizationFeeByPercentile = async (
  connection: Connection,
  config: GetRecentPrioritizationFeesByPercentileConfig,
  slotsToReturn?: number
): Promise<number> => {
  const recentPrioritizationFees = await getRecentPrioritizationFeesByPercentile(connection, config, slotsToReturn);

  recentPrioritizationFees.sort((a, b) => a.prioritizationFee - b.prioritizationFee);

  const half = Math.floor(recentPrioritizationFees.length / 2);

  if (recentPrioritizationFees.length % 2) {
    return recentPrioritizationFees[half].prioritizationFee;
  }

  return Math.ceil(
    (recentPrioritizationFees[half - 1].prioritizationFee + recentPrioritizationFees[half].prioritizationFee) / 2
  );
};

// this function gets the recent prioritization fees from the RPC. The `rpcRequest` comes from webjs.Connection
const getRecentPrioritizationFeesFromRpc = async (config: any, rpcRequest: any) => {
  const accounts = config?.lockedWritableAccounts?.map((key: { toBase58: () => any }) => key.toBase58());
  const args = accounts?.length ? [accounts] : [[]];
  config.percentile && args.push({ percentile: config.percentile });

  const response = await rpcRequest("getRecentPrioritizationFees", args);

  return response;
};

export const getRecentPrioritizationFeesByPercentile = async (
  connection: Connection,
  config: GetRecentPrioritizationFeesByPercentileConfig,
  slotsToReturn?: number
): Promise<RecentPrioritizationFees[]> => {
  const { fallback = true, lockedWritableAccounts = [] } = config || {};
  slotsToReturn = slotsToReturn && Number.isInteger(slotsToReturn) ? slotsToReturn : -1;

  const promises = [];

  let tritonRpcResponse: RpcResponse | undefined = undefined;
  let fallbackRpcResponse: RpcResponse | undefined = undefined;

  // @solana/web3.js uses the private method `_rpcRequest` internally to make RPC requests which is not exposed by TypeScript
  // it is available in JavaScript, however, TypeScript enforces it as unavailable and complains, the following line is a workaround

  /* @ts-ignore */
  const rpcRequest = connection._rpcRequest;

  // to save fallback roundtrips if your RPC is not Triton, both RPCs are called in parallel to minimize latency
  promises.push(
    getRecentPrioritizationFeesFromRpc(config, rpcRequest).then((result) => {
      tritonRpcResponse = result;
    })
  );

  if (fallback) {
    promises.push(
      getRecentPrioritizationFeesFromRpc({ lockedWritableAccounts }, rpcRequest).then((result) => {
        fallbackRpcResponse = result;
      })
    );
  }

  await Promise.all(promises);

  // satisfying typescript by casting the response to RpcResponse
  const tritonGRPFResponse = tritonRpcResponse as unknown as RpcResponse;
  const fallbackGRPFResponse = fallbackRpcResponse as unknown as RpcResponse;

  let recentPrioritizationFees: RecentPrioritizationFees[] = [];

  if (tritonGRPFResponse?.result) {
    recentPrioritizationFees = tritonGRPFResponse.result!;
  }

  if (fallbackGRPFResponse?.result && !tritonGRPFResponse?.result) {
    recentPrioritizationFees = fallbackGRPFResponse.result!;
  }

  if (fallback && fallbackGRPFResponse.error) {
    return fallbackGRPFResponse.error;
  }

  if (tritonGRPFResponse?.error) {
    return tritonGRPFResponse.error;
  }

  // sort the prioritization fees by slot
  recentPrioritizationFees.sort((a, b) => a.slot - b.slot);

  // return the first n prioritization fees
  if (slotsToReturn > 0) return recentPrioritizationFees.slice(0, slotsToReturn);

  return recentPrioritizationFees;
};
