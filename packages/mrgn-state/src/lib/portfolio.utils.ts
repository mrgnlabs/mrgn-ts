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

  const sortedTimestamps = Object.keys(data).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

  if (sortedTimestamps.length === 0) {
    const emptyStats = { value: 0, change: 0, changePercent: 0 };
    return {
      supplied7d: emptyStats,
      borrowed7d: emptyStats,
      netValue7d: emptyStats,
    };
  }

  let startTimestamp = null;
  for (let i = sortedTimestamps.length - 1; i >= 0; i--) {
    if (new Date(sortedTimestamps[i]) <= cutoff) {
      startTimestamp = sortedTimestamps[i];
      break;
    }
  }

  if (!startTimestamp) {
    startTimestamp = sortedTimestamps[0];
  }

  const endTimestamp = sortedTimestamps[sortedTimestamps.length - 1];

  const startEntries = data[startTimestamp] || [];
  const endEntries = data[endTimestamp] || [];

  const startDeposits = startEntries.reduce((sum, entry) => sum + entry.depositValueUsd, 0);
  const startBorrows = startEntries.reduce((sum, entry) => sum + entry.borrowValueUsd, 0);
  const endDeposits = endEntries.reduce((sum, entry) => sum + entry.depositValueUsd, 0);
  const endBorrows = endEntries.reduce((sum, entry) => sum + entry.borrowValueUsd, 0);

  if (!startDeposits && !startBorrows && !endDeposits && !endBorrows) {
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
    supplied7d: compute(startDeposits, endDeposits),
    borrowed7d: compute(startBorrows, endBorrows),
    netValue7d: compute(startDeposits - startBorrows, endDeposits - endBorrows),
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
