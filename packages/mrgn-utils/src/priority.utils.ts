import { Connection, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { getRecentPrioritizationFeesByPercentile, PriotitizationFeeLevels } from "./grpf";

export const DEFAULT_BUNDLE_TIP_LAMPORTS = 0.0001; // 100_000 lamports = 0.0001 SOL
export const DEFAULT_BUNDLE_TIP_UPPER_BOUND = 0.003; // 1_000_000 lamports = 0.003 SOL

export interface TipFloorDataResponse {
  time: string;
  landed_tips_25th_percentile: number;
  landed_tips_50th_percentile: number;
  landed_tips_75th_percentile: number;
  landed_tips_95th_percentile: number;
  landed_tips_99th_percentile: number;
  ema_landed_tips_50th_percentile: number;
}

export const handleBundleTip = (tipFloorData: TipFloorDataResponse) => {
  const { ema_landed_tips_50th_percentile, landed_tips_50th_percentile, landed_tips_25th_percentile } = tipFloorData;

  if (ema_landed_tips_50th_percentile > DEFAULT_BUNDLE_TIP_UPPER_BOUND) {
    return { isCongested: true, bundleTip: DEFAULT_BUNDLE_TIP_UPPER_BOUND };
  } else {
    return { isCongested: false, bundleTip: ema_landed_tips_50th_percentile };
  }
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

export const getRpcPriorityFee = async (connection: Connection) => {
  const result = await getRecentPrioritizationFeesByPercentile(
    connection,
    {
      lockedWritableAccounts: [], // TODO: investigate this
      percentile: PriotitizationFeeLevels.LOW,
      fallback: false,
    },
    10
  );

  const uiResult = result.map((r) => microLamportsToUi(r.prioritizationFee));

  return uiResult[0];
};

const fetchBundleTip = async () => {
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

  const { isCongested, bundleTip } = handleBundleTip(bundleTipData);

  return bundleTip;
};
