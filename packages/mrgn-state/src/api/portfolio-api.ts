import type { ExtendedBankInfo } from "../types/bank.types";
import { EnrichedPortfolioDataPoint, PortfolioDataPoint } from "../types";
import { enrichPortfolioData } from "../lib/portfolio.utils";

/**
 * Fetch portfolio data from API
 * @param selectedAccount The wallet address to fetch portfolio data for
 * @param banks Array of ExtendedBankInfo objects for price data
 * @returns Enriched portfolio data array
 */
export const fetchPortfolioData = async (
  selectedAccount: string | null,
  banks: ExtendedBankInfo[]
): Promise<EnrichedPortfolioDataPoint[]> => {
  if (!selectedAccount) {
    throw new Error("No account selected");
  }

  const response = await fetch(`/api/user/portfolio?account=${selectedAccount}`);
  if (!response.ok) {
    throw new Error(`Error fetching portfolio data: ${response.statusText}`);
  }

  const result: PortfolioDataPoint[] = await response.json();
  
  // Use the utility function to enrich the data with oracle prices
  return enrichPortfolioData(result, banks);
};
