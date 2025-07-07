import { PortfolioDataPoint } from "../types";

/**
 * Fetch portfolio data from API
 * @param selectedAccount The wallet address to fetch portfolio data for
 * @returns Portfolio data array
 */
export const fetchPortfolioData = async (selectedAccount: string | null): Promise<PortfolioDataPoint[]> => {
  if (!selectedAccount) {
    throw new Error("No account selected");
  }

  const response = await fetch(`/api/user/portfolio?account=${selectedAccount}`);
  if (!response.ok) {
    throw new Error(`Error fetching portfolio data: ${response.statusText}`);
  }

  const result = await response.json();

  return result.map((item: any) => ({
    assetShares: item.asset_shares,
    liabilityShares: item.liability_shares,
    lastSeenAt: item.last_seen_at,
    bankAddress: item.bank_address,
    bankAssetTag: item.bank_asset_tag,
    snapshotTime: item.snapshot_time,
  }));
};
