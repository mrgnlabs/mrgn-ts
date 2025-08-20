import { EnrichedPortfolioDataPoint, PortfolioDataPoint, PortfolioStatsData, PositionType } from "../types";

/**
 * Calculate portfolio statistics using actual data range
 */
export function calculate7dPortfolioStats(data: Record<string, EnrichedPortfolioDataPoint[]>): {
  supplied7d: PortfolioStatsData;
  borrowed7d: PortfolioStatsData;
  netValue7d: PortfolioStatsData;
} {
  if (!data) {
    const emptyStats = { value: 0, change: 0, changePercent: 0 };
    return {
      supplied7d: emptyStats,
      borrowed7d: emptyStats,
      netValue7d: emptyStats,
    };
  }
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

  console.log(startEntries);
  console.log(endEntries);

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

/**
 * Group portfolio data by timestamp with mint-level aggregation
 * Mirrors MarginFi's approach but aggregates multiple banks per mint
 * @param data Raw portfolio data points
 * @param banks Array of enriched bank data for price/share calculations
 * @param oracleData Oracle price data for USD conversion
 * @returns Three-level grouped structure with enriched data
 */
type GroupedPortfolioData = Record<string, Record<string, PortfolioDataPoint>>;

export function groupPortfolioData(
  data: PortfolioDataPoint[],
  bucketKey: keyof Pick<PortfolioDataPoint, "start_time" | "end_time"> = "start_time"
): GroupedPortfolioData {
  const timestamps = [...new Set(data.map((d) => d[bucketKey]))] as string[];
  const banks = [...new Set(data.map((d) => d.bank_address))];

  // Template per bank
  const bankTemplate = new Map<string, PortfolioDataPoint>();
  for (const item of data) bankTemplate.set(item.bank_address, item);

  // Lookup: timestamp -> bank -> item
  const byTsBank = new Map<string, Map<string, PortfolioDataPoint>>();
  for (const item of data) {
    const ts = item[bucketKey];
    if (!byTsBank.has(ts)) byTsBank.set(ts, new Map());
    byTsBank.get(ts)!.set(item.bank_address, item);
  }

  const result: GroupedPortfolioData = {};

  for (const ts of timestamps) {
    result[ts] = {};

    for (const bank of banks) {
      const existing = byTsBank.get(ts)?.get(bank);

      if (existing) {
        result[ts][bank] = {
          ...existing,
          start_time: ts,
          end_time: ts,
        };
        continue;
      }

      // Mock from template (copy statics, zero shares & calculated fields)
      const template = bankTemplate.get(bank);
      if (!template) continue; // Skip if no template found

      result[ts][bank] = {
        // Copy all fields from template
        ...template,

        // Override time fields (force to bucket)
        start_time: ts,
        end_time: ts,

        // Ensure correct bank address
        bank_address: bank,

        // Zero out balance shares and calculated values. This makes the chart display 0 for empty positions, since the api does not return 0 for empty positions
        balance_asset_shares: 0,
        asset_share_value: 0,
        balance_liability_shares: 0,
        liability_share_value: 0,
        total_asset_shares: 0,
        total_liability_shares: 0,
        asset_value_native: 0,
        liability_value_native: 0,
        asset_value_usd: 0,
        liability_value_usd: 0,
        asset_share_percentage: 0,
        liability_share_percentage: 0,
      };
    }
  }

  return result;
}
/**
 * Convert grouped portfolio data to chart-compatible format
 * Converts Record<string, Record<string, PortfolioDataPoint>> to Record<string, EnrichedPortfolioDataPoint[]>
 * and maps RPC fields to expected chart fields
 */
export function normalizePortfolioSnapshots(
  data: Record<string, Record<string, PortfolioDataPoint>>
): Record<string, EnrichedPortfolioDataPoint[]> {
  const result: Record<string, EnrichedPortfolioDataPoint[]> = {};

  // Convert each timestamp from object of banks to array of enriched data points
  for (const [timestamp, bankData] of Object.entries(data)) {
    result[timestamp] = [];

    // Convert each bank's PortfolioDataPoint to EnrichedPortfolioDataPoint
    for (const portfolioPoint of Object.values(bankData)) {
      // Determine position type based on balance values
      const hasAssets = portfolioPoint.asset_value_usd > 0;
      const positionType: PositionType = hasAssets ? "deposit" : "borrow";

      // Create enriched portfolio data point with field mapping
      const enrichedPoint: EnrichedPortfolioDataPoint = {
        // Inherit all PortfolioDataPoint fields
        ...portfolioPoint,

        // Add EnrichedPortfolioDataPoint-specific fields with proper mapping
        depositValueUsd: portfolioPoint.asset_value_usd,
        borrowValueUsd: portfolioPoint.liability_value_usd,
        netValueUsd: portfolioPoint.asset_value_usd - portfolioPoint.liability_value_usd,
        positionType,
      };

      result[timestamp].push(enrichedPoint);
    }
  }

  return result;
}
