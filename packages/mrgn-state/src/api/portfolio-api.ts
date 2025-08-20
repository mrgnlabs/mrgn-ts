import { groupPortfolioData, normalizePortfolioSnapshots } from "../lib";
import { EnrichedPortfolioDataPoint, PortfolioDataPoint } from "../types";

/**
 * Fetch portfolio data from API
 * @param selectedAccount The wallet address to fetch portfolio data for
 * @returns Portfolio data array
 */
export const fetchPortfolioData = async (
  selectedAccount: string | null
): Promise<Record<string, EnrichedPortfolioDataPoint[]>> => {
  if (!selectedAccount) {
    throw new Error("No account selected");
  }

  const response = await fetch(`/api/user/portfolio?account=${selectedAccount}`);
  if (!response.ok) {
    throw new Error(`Error fetching portfolio data: ${response.statusText}`);
  }

  const result = await response.json();

  const groupedData = result ? groupPortfolioData(result) : {};

  const normalizedData = Object.keys(groupedData).length > 0 ? normalizePortfolioSnapshots(groupedData) : {};

  return normalizedData;
};
