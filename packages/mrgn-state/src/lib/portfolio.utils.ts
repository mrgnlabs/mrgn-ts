import { EnrichedPortfolioDataPoint, PortfolioStatsData } from "../types";

/**
 * Calculate portfolio statistics using actual data range
 */
export function calculate7dPortfolioStats(data: Record<string, EnrichedPortfolioDataPoint[]>): {
  supplied7d: PortfolioStatsData;
  borrowed7d: PortfolioStatsData;
  netValue7d: PortfolioStatsData;
} {
  const dailyTotals: Record<string, { deposits: number; borrows: number }> = {};

  for (const [timestamp, entries] of Object.entries(data)) {
    const dateKey = timestamp.slice(0, 10); // "YYYY-MM-DD"
    if (!dailyTotals[dateKey]) {
      dailyTotals[dateKey] = { deposits: 0, borrows: 0 };
    }

    for (const item of entries) {
      dailyTotals[dateKey].deposits += item.depositValueUsd;
      dailyTotals[dateKey].borrows += item.borrowValueUsd;
    }
  }

  const sortedDates = Object.keys(dailyTotals).sort();
  const recentDates = sortedDates.slice(-7);

  if (recentDates.length < 2) {
    const emptyStats = { value: 0, change: 0, changePercent: 0 };
    return { supplied7d: emptyStats, borrowed7d: emptyStats, netValue7d: emptyStats };
  }

  const deposits = recentDates.map((date) => dailyTotals[date].deposits);
  const borrows = recentDates.map((date) => dailyTotals[date].borrows);
  const net = deposits.map((d, i) => d - borrows[i]);

  const buildStats = (values: number[]): PortfolioStatsData => {
    const first = values[0];
    const last = values[values.length - 1];
    const change = last - first;
    const changePercent = first !== 0 ? (change / Math.abs(first)) * 100 : 0;
    return { value: last, change, changePercent };
  };

  return {
    supplied7d: buildStats(deposits),
    borrowed7d: buildStats(borrows),
    netValue7d: buildStats(net),
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
