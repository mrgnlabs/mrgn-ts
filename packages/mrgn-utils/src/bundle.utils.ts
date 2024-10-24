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
