import { EnrichedPortfolioDataPoint, PortfolioStatsData } from "../types";

/**
 * Calculate portfolio statistics using actual data range
 */
export function calculate7dPortfolioStats(data: Record<string, EnrichedPortfolioDataPoint[]>): {
  supplied7d: PortfolioStatsData;
  borrowed7d: PortfolioStatsData;
  netValue7d: PortfolioStatsData;
} {
  const now = new Date();
  const cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  type Snapshot = {
    timestamp: string;
    snapshotTime: string;
    deposits: number;
    borrows: number;
  };

  const snapshots: Snapshot[] = Object.entries(data)
    .flatMap(([lastSeenAt, entries]) => {
      return entries.map((entry) => ({
        timestamp: lastSeenAt,
        snapshotTime: entry.snapshotTime,
        deposits: entry.depositValueUsd,
        borrows: entry.borrowValueUsd,
      }));
    })
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  const start = snapshots.find((s) => new Date(s.snapshotTime) <= cutoff && cutoff < new Date(s.timestamp));

  const end = snapshots.at(-1);

  if (!start || !end) {
    const emptyStats = { value: 0, change: 0, changePercent: 0 };
    return {
      supplied7d: emptyStats,
      borrowed7d: emptyStats,
      netValue7d: emptyStats,
    };
  }

  const compute = (firstVal: number, lastVal: number): PortfolioStatsData => {
    const change = lastVal - firstVal;
    const changePercent = firstVal !== 0 ? (change / firstVal) * 100 : 0;
    return {
      value: lastVal,
      change,
      changePercent,
    };
  };

  return {
    supplied7d: compute(start.deposits, end.deposits),
    borrowed7d: compute(start.borrows, end.borrows),
    netValue7d: compute(start.deposits - start.borrows, end.deposits - end.borrows),
  };
}

export function normalizePortfolioSnapshots(
  data: Record<string, EnrichedPortfolioDataPoint[]>
): Record<string, EnrichedPortfolioDataPoint[]> {
  const allBankAddresses = new Set<string>();
  const bankMeta = new Map<string, Pick<EnrichedPortfolioDataPoint, "bankAddress" | "bankSymbol" | "bankAssetTag">>();
  const latestPositionType = new Map<string, "deposit" | "borrow">(); // track last known position per bank

  // Step 1: Extract all banks and metadata
  for (const entries of Object.values(data)) {
    for (const entry of entries) {
      allBankAddresses.add(entry.bankAddress);
      if (!bankMeta.has(entry.bankAddress)) {
        bankMeta.set(entry.bankAddress, {
          bankAddress: entry.bankAddress,
          bankSymbol: entry.bankSymbol,
          bankAssetTag: entry.bankAssetTag,
        });
      }

      // Update last known positionType
      if (entry.positionType === "deposit" || entry.positionType === "borrow") {
        latestPositionType.set(entry.bankAddress, entry.positionType);
      }
    }
  }

  const filledData: Record<string, EnrichedPortfolioDataPoint[]> = {};

  // Step 2: Normalize each timestamp
  for (const [timestamp, entries] of Object.entries(data)) {
    const currentMap = new Map(entries.map((e) => [e.bankAddress, e]));
    const normalizedArray: EnrichedPortfolioDataPoint[] = [];

    for (const address of allBankAddresses) {
      if (currentMap.has(address)) {
        const enriched = currentMap.get(address)!;
        latestPositionType.set(address, enriched.positionType);

        normalizedArray.push(enriched);
      } else {
        const meta = bankMeta.get(address)!;
        const fallbackType = latestPositionType.get(address)!;

        normalizedArray.push({
          assetShares: 0,
          liabilityShares: 0,
          lastSeenAt: timestamp,
          snapshotTime: timestamp,
          depositValueUsd: 0,
          borrowValueUsd: 0,
          netValueUsd: 0,
          bankAddress: meta.bankAddress,
          bankSymbol: meta.bankSymbol,
          bankAssetTag: meta.bankAssetTag,
          positionType: fallbackType,
        });
      }
    }

    filledData[timestamp] = normalizedArray;
  }

  return filledData;
}
