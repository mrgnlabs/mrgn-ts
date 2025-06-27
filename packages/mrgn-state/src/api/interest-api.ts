import { InterestEarnedDataPoint, StatsData } from "../types";

/**
 * Fetches interest earned data for a specific account
 * @param accountAddress The wallet address to fetch interest data for
 * @returns Array of interest data points
 */
export const fetchInterestData = async (accountAddress: string | null): Promise<InterestEarnedDataPoint[]> => {
  if (!accountAddress) {
    throw new Error("No account selected");
  }

  const response = await fetch(`/api/user/interest-earned?account=${accountAddress}`);
  if (!response.ok) {
    throw new Error(`Error fetching interest data: ${response.statusText}`);
  }

  const result: InterestEarnedDataPoint[] = await response.json();
  return result;
};
