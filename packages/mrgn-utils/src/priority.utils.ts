import { Connection, LAMPORTS_PER_SOL, PublicKey, RecentPrioritizationFees } from "@solana/web3.js";
import {
  getRecentPrioritizationFeesByPercentile,
  getCalculatedPrioritizationFeeByPercentile,
  MaxCapType,
  TransactionBroadcastType,
  TransactionPriorityType,
} from "@mrgnlabs/mrgn-common";
import { PriorityFees } from "@mrgnlabs/marginfi-client-v2";

const ABSOLUTE_MAX_PRIORITY_FEE = 0.008;

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
  maxCap: DEFAULT_MAX_CAP,
  maxCapType: "DYNAMIC" as MaxCapType,
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

export const calculateBundleTipCap = (
  bundleTipData: TipFloorDataResponse,
  userMaxCap: number,
  multiplier: number = 2
) => {
  const { ema_landed_tips_50th_percentile, landed_tips_95th_percentile } = bundleTipData;

  const maxCap = ABSOLUTE_MAX_PRIORITY_FEE; //Math.min(landed_tips_95th_percentile, ema_landed_tips_50th_percentile * multiplier);

  return Math.min(userMaxCap, Math.trunc(maxCap * LAMPORTS_PER_SOL) / LAMPORTS_PER_SOL);
};

export const calculatePriorityFeeCap = async (connection: Connection, userMaxCap: number, multiplier: number = 3) => {
  const { min, max, mean, median } = await getCalculatedPrioritizationFeeByPercentile(
    connection,
    {
      lockedWritableAccounts: [], // TODO: investigate this
      percentile: PriotitizationFeeLevels.MEDIAN,
      fallback: false,
    },
    20
  );

  return Math.min(
    // ABSOLUTE_MAX_PRIORITY_FEE,
    userMaxCap,
    microLamportsToUi(Math.max(median * multiplier, max.prioritizationFee))
  );
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

export const fetchPriorityFee = async (
  maxCapType: MaxCapType,
  maxCap: number,
  broadcastType: TransactionBroadcastType,
  priorityType: TransactionPriorityType,
  connection: Connection
): Promise<PriorityFees> => {
  const finalMaxCap =
    maxCapType === "DYNAMIC" || Number.isNaN(maxCap) || Number(maxCap) === 0 ? DEFAULT_MAX_CAP : maxCap;
  if (broadcastType === "BUNDLE") {
    const bundleTipUi = await getBundleTip(priorityType, finalMaxCap);
    return { bundleTipUi };
  } else if (broadcastType === "RPC") {
    const priorityFeeMicro = await getRpcPriorityFeeMicroLamports(connection, priorityType);
    return { priorityFeeMicro };
  } else {
    const bundleTipUi = await getBundleTip(priorityType, finalMaxCap);
    const priorityFeeMicro = await getRpcPriorityFeeMicroLamports(connection, priorityType);
    return { bundleTipUi, priorityFeeMicro };
  }
};

export const getBundleTip = async (priorityType: TransactionPriorityType, userMaxCap: number) => {
  const MIN_PRIORITY_FEE = 0.00001;

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
    bundleTipData = await response.json();
  }

  const maxCap = calculateBundleTipCap(bundleTipData, userMaxCap);

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

  return Math.min(maxCap, Math.trunc(priorityFee * LAMPORTS_PER_SOL) / LAMPORTS_PER_SOL);
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
