import { Connection, LAMPORTS_PER_SOL, PublicKey, RecentPrioritizationFees } from "@solana/web3.js";
import {
  getRecentPrioritizationFeesByPercentile,
  getCalculatedPrioritizationFeeByPercentile,
  MaxCapType,
  TransactionBroadcastType,
  TransactionPriorityType,
  MaxCap,
} from "@mrgnlabs/mrgn-common";
import { PriorityFees } from "@mrgnlabs/marginfi-client-v2";

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

export const DEFAULT_MAX_CAP = 0.01;

export const DEFAULT_PRIORITY_SETTINGS = {
  priorityType: "NORMAL" as TransactionPriorityType,
  broadcastType: "DYNAMIC" as TransactionBroadcastType,
  maxCapType: "DYNAMIC" as MaxCapType,
  maxCap: {
    manualMaxCap: DEFAULT_MAX_CAP,
    bundleTipCap: DEFAULT_MAX_CAP,
    priorityFeeCap: 1_000_000, // todo check
  } as MaxCap,
};

export const uiToMicroLamports = (ui: number, limitCU: number = 1_400_000) => {
  const priorityFeeMicroLamports = ui * LAMPORTS_PER_SOL * 1_000_000;
  const microLamports = Math.round(priorityFeeMicroLamports / limitCU);
  return microLamports;
};

export const microLamportsToUi = (microLamports: number, limitCU: number = 1_400_000) => {
  const priorityFeeMicroLamports = microLamports * limitCU;
  const priorityFeeUi = priorityFeeMicroLamports / (LAMPORTS_PER_SOL * 1_000_000);
  return Math.trunc(priorityFeeUi * LAMPORTS_PER_SOL) / LAMPORTS_PER_SOL;
};

export const calculateBundleTipCap = async (multiplier: number = 2) => {
  const bundleTipData = await getBundleTipData();

  const { ema_landed_tips_50th_percentile, landed_tips_95th_percentile } = bundleTipData;

  const maxCap = Math.min(landed_tips_95th_percentile, ema_landed_tips_50th_percentile * multiplier);

  return Math.trunc(maxCap * LAMPORTS_PER_SOL) / LAMPORTS_PER_SOL;
};

export const calculatePriorityFeeCap = async (connection: Connection, multiplier: number = 3) => {
  const { min, max, mean, median } = await getCalculatedPrioritizationFeeByPercentile(
    connection,
    {
      lockedWritableAccounts: [], // TODO: investigate this
      percentile: PriotitizationFeeLevels.MEDIAN,
      fallback: false,
    },
    20
  );

  return microLamportsToUi(Math.max(median * multiplier, max.prioritizationFee));
};

interface TipFloorDataResponse {
  time: string;
  landed_tips_25th_percentile: number;
  landed_tips_50th_percentile: number;
  landed_tips_75th_percentile: number;
  landed_tips_95th_percentile: number;
  landed_tips_99th_percentile: number;
  ema_landed_tips_50th_percentile: number;
}

export const fetchMaxCap = async (connection: Connection) => {
  const bundleTipCap = await calculateBundleTipCap();
  const priorityFeeCap = await calculatePriorityFeeCap(connection);
  return { bundleTipCap, priorityFeeCap };
};

export const fetchPriorityFee = async (
  broadcastType: TransactionBroadcastType,
  priorityType: TransactionPriorityType,
  connection: Connection
): Promise<PriorityFees> => {
  if (broadcastType === "BUNDLE") {
    const bundleTipUi = await getBundleTip(priorityType);
    return { bundleTipUi };
  } else if (broadcastType === "RPC") {
    const priorityFeeMicro = await getRpcPriorityFeeMicroLamports(connection, priorityType);
    return { priorityFeeMicro };
  } else {
    const bundleTipUi = await getBundleTip(priorityType);
    const priorityFeeMicro = await getRpcPriorityFeeMicroLamports(connection, priorityType);
    return { bundleTipUi, priorityFeeMicro };
  }
};

export const getBundleTipData = async () => {
  const response = await fetch("/api/bundles/tip", {
    method: "GET",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  }).catch((err) => {});

  let bundleTipData: TipFloorDataResponse = {
    time: "",
    landed_tips_25th_percentile: 0.00001,
    landed_tips_50th_percentile: 0.00005,
    landed_tips_75th_percentile: 0.0001,
    landed_tips_95th_percentile: 0.001,
    landed_tips_99th_percentile: 0.001,
    ema_landed_tips_50th_percentile: 0.00005,
  };

  if (!response || !response.ok) {
    console.error("Failed to fetch bundle tip");
  } else {
    const data = await response.json();
    if (data) {
      bundleTipData = data;
    }
  }

  return bundleTipData;
};

export const getBundleTip = async (priorityType: TransactionPriorityType) => {
  const MIN_PRIORITY_FEE = 0.00001;

  const bundleTipData = await getBundleTipData();

  const { ema_landed_tips_50th_percentile, landed_tips_50th_percentile, landed_tips_75th_percentile } = bundleTipData;

  let priorityFee = 0;

  if (priorityType === "HIGH") {
    priorityFee = landed_tips_75th_percentile * 1.2;
    // priorityFee = Math.max(ema_landed_tips_50th_percentile, landed_tips_50th_percentile);
  } else if (priorityType === "MAMAS") {
    // priorityFee = landed_tips_75th_percentile;
    priorityFee = landed_tips_75th_percentile * 1.3;
  } else {
    // NORMAL
    priorityFee = landed_tips_75th_percentile;
    // priorityFee = Math.min(ema_landed_tips_50th_percentile, landed_tips_50th_percentile);
  }

  if (priorityFee === 0) {
    priorityFee = MIN_PRIORITY_FEE;
  }

  return Math.trunc(priorityFee * LAMPORTS_PER_SOL) / LAMPORTS_PER_SOL;
};

type PriorityFeesPercentile = {
  min: RecentPrioritizationFees;
  mean: number;
  median: number;
  max: RecentPrioritizationFees;
};

export const getRpcPriorityFeeMicroLamports = async (connection: Connection, priorityType: TransactionPriorityType) => {
  const MIN_PRIORITY_FEE = 50_000;

  const response = await fetch("/api/priorityFees", {
    method: "GET",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
  }).catch((err) => {});

  let priorityFees: PriorityFeesPercentile = {
    min: {
      prioritizationFee: 50,
      slot: 0,
    },
    mean: 1000000,
    median: 128352,
    max: {
      prioritizationFee: 13281448,
      slot: 0,
    },
  };

  if (!response || !response.ok) {
    console.error("Failed to fetch priority fees");
  } else {
    priorityFees = await response.json();
  }

  let priorityFee = 0;

  if (priorityType === "HIGH") {
    priorityFee = priorityFees.mean;
  } else if (priorityType === "MAMAS") {
    priorityFee = priorityFees.max.prioritizationFee;
  } else {
    priorityFee = Math.min(priorityFees.median, priorityFees.mean);
  }

  if (priorityFee === 0) {
    priorityFee = MIN_PRIORITY_FEE;
  }

  return priorityFee;
};
