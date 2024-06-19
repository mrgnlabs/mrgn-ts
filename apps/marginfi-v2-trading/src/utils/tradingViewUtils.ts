export interface Bar {
  /** Bar time.
   * Amount of **milliseconds** since Unix epoch start in **UTC** timezone.
   * `time` for daily, weekly, and monthly bars is expected to be a trading day (not session start day) at 00:00 UTC.
   * The library adjusts time according to `session` from {@link LibrarySymbolInfo}.
   */
  time: number;
  /** Opening price */
  open: number;
  /** High price */
  high: number;
  /** Low price */
  low: number;
  /** Closing price */
  close: number;
  /** Trading Volume */
  volume?: number;
}

export function getNextBarTime(lastBar: any, resolution = "1D" as any) {
  if (!lastBar) return;

  const lastCharacter = resolution.slice(-1);
  let nextBarTime;

  switch (true) {
    case lastCharacter === "W":
      nextBarTime = 7 * 24 * 60 * 60 * 1000 + lastBar.time;
      break;

    case lastCharacter === "D":
      nextBarTime = 1 * 24 * 60 * 60 * 1000 + lastBar.time;
      break;

    default:
      nextBarTime = resolution * 60 * 1000 + lastBar.time;
      break;
  }

  return nextBarTime;
}

export const configurationData = {
  supported_resolutions: ["1", "3", "5", "15", "30", "60", "120", "240", "1D", "1W"],
  intraday_multipliers: ["1", "3", "5", "15", "30", "60", "120", "240"],
  exchanges: [],
};

export const RESOLUTION_MAPPING: { [key: string]: string } = {
  1: "1m",
  3: "3m",
  5: "5m",
  15: "15m",
  30: "30m",
  60: "1H",
  120: "2H",
  240: "4H",
  "1D": "1D",
  "1W": "1W",
};

export function parseResolution(resolution: number | string): string {
  if (!resolution || !RESOLUTION_MAPPING[resolution]) return RESOLUTION_MAPPING[0];

  return RESOLUTION_MAPPING[resolution];
}
