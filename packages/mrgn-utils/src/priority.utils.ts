import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  getRecentPrioritizationFeesByPercentile,
  TransactionBroadcastType,
  TransactionPriorityType,
} from "@mrgnlabs/mrgn-common";

const enum PriotitizationFeeLevels {
  LOW = 2500,
  MEDIAN = 5000,
  HIGH = 7500,
  MAX = 10000,
}

interface TipFloorDataResponse {
  time: string;
  landed_tips_25th_percentile: number;
  landed_tips_50th_percentile: number;
  landed_tips_75th_percentile: number;
  landed_tips_95th_percentile: number;
  landed_tips_99th_percentile: number;
  ema_landed_tips_50th_percentile: number;
}

export const DEFAULT_PRIORITY_FEE_MAX_CAP = 0.004; // 4_000_000 lamports = 0.004 SOL

export const DEFAULT_PRIORITY_SETTINGS = {
  priorityType: "NORMAL" as TransactionPriorityType,
  broadcastType: "BUNDLE" as TransactionBroadcastType,
  maxCap: DEFAULT_PRIORITY_FEE_MAX_CAP,
};

export const uiToMicroLamports = (ui: number, limitCU: number = 1_400_000) => {
  const priorityFeeMicroLamports = ui * LAMPORTS_PER_SOL * 1_000_000;
  const microLamports = Math.round(priorityFeeMicroLamports / limitCU);
  return microLamports;
};

export const microLamportsToUi = (microLamports: number, limitCU: number = 1_400_000) => {
  const priorityFeeMicroLamports = microLamports * limitCU;
  const priorityFeeUi = priorityFeeMicroLamports / (LAMPORTS_PER_SOL * 1_000_000);
  return priorityFeeUi;
};

export const getBundleTip = async (priorityType: TransactionPriorityType) => {
  const response = await fetch("/api/bundles/tip", {
    method: "GET",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch bundle tip");
  }

  const bundleTipData: TipFloorDataResponse = await response.json();

  const { ema_landed_tips_50th_percentile, landed_tips_50th_percentile, landed_tips_75th_percentile } = bundleTipData;

  let priorityFee = 0;

  if (priorityType === "HIGH") {
    priorityFee =
      ema_landed_tips_50th_percentile > landed_tips_50th_percentile
        ? ema_landed_tips_50th_percentile
        : landed_tips_50th_percentile;
  } else if (priorityType === "MAMAS") {
    priorityFee = landed_tips_75th_percentile;
  } else {
    priorityFee =
      ema_landed_tips_50th_percentile > landed_tips_50th_percentile
        ? landed_tips_50th_percentile
        : ema_landed_tips_50th_percentile;
  }

  return priorityFee;
};

export const getRpcPriorityFeeMicroLamports = async (connection: Connection, priorityType: TransactionPriorityType) => {
  const recentPrioritizationFees = await getRecentPrioritizationFeesByPercentile(
    connection,
    {
      lockedWritableAccounts: [], // TODO: investigate this
      percentile: PriotitizationFeeLevels.HIGH,
      fallback: false,
    },
    20
  );

  const { min, max, sum } = recentPrioritizationFees.reduce(
    (acc, current) => {
      return {
        min: Math.min(acc.min, current.prioritizationFee),
        max: Math.max(acc.max, current.prioritizationFee),
        sum: acc.sum + current.prioritizationFee,
      };
    },
    { min: recentPrioritizationFees[0].prioritizationFee, max: recentPrioritizationFees[0].prioritizationFee, sum: 0 }
  );

  const average = sum / recentPrioritizationFees.length;

  let priorityFee = 0;

  if (priorityType === "HIGH") {
    priorityFee = average;
  } else if (priorityType === "MAMAS") {
    priorityFee = max;
  } else {
    priorityFee = min;
  }

  return priorityFee;
};
