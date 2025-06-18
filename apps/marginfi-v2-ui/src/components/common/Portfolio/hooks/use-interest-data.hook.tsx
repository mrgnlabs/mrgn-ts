"use client";

import React from "react";

// Interest earned data types
interface InterestEarnedDataPoint {
  account_id: number;
  account_address: string;
  bank_id: number;
  bank_address: string;
  bank_mint: string;
  mint_decimals: number;
  bank_snapshot_time: string;
  account_balance_snapshot_time: string;
  account_balance_id: number;
  bank_name: string;
  bank_symbol: string;
  asset_shares_normalized: number;
  liability_shares_normalized: number;
  current_deposit_value: number;
  current_debt_value: number;
  initial_asset_share_value: number;
  initial_liability_share_value: number;
  current_price_usd_close: number;
  current_price_timestamp_close: string;
  initial_deposit_value: number;
  initial_debt_value: number;
  interest_earned: number;
  interest_paid: number;
  current_deposit_value_usd_close: number;
  current_debt_value_usd_close: number;
  initial_deposit_value_usd_close: number;
  initial_debt_value_usd_close: number;
  interest_earned_usd_close: number;
  interest_paid_usd_close: number;
  past_positions_interest_earned: number;
  past_positions_interest_paid: number;
  past_positions_interest_earned_usd_close: number;
  past_positions_interest_paid_usd_close: number;
  cumulative_interest_earned: number;
  cumulative_interest_paid: number;
  cumulative_interest_earned_usd_close: number;
  cumulative_interest_paid_usd_close: number;
}

interface UseInterestDataReturn {
  data: InterestEarnedDataPoint[];
  latestNetInterest: number; // Latest net interest (earned - paid)
  error: Error | null;
  isLoading: boolean;
}

// Calculate latest net interest (earned - paid)
const calculateLatestNetInterest = (data: InterestEarnedDataPoint[]): number => {
  if (!data.length) return 0;

  // Get latest data per bank (since cumulative values, we want the most recent)
  const latestByBank: Record<string, InterestEarnedDataPoint> = {};

  data.forEach((item) => {
    const key = item.bank_address;
    if (!latestByBank[key] || new Date(item.bank_snapshot_time) > new Date(latestByBank[key].bank_snapshot_time)) {
      latestByBank[key] = item;
    }
  });

  // Sum across banks
  const totalEarned = Object.values(latestByBank).reduce(
    (sum, item) => sum + item.cumulative_interest_earned_usd_close,
    0
  );
  const totalPaid = Object.values(latestByBank).reduce((sum, item) => sum + item.cumulative_interest_paid_usd_close, 0);

  return totalEarned - totalPaid;
};

const useInterestData = (selectedAccount: string | null): UseInterestDataReturn => {
  const [data, setData] = React.useState<InterestEarnedDataPoint[]>([]);
  const [error, setError] = React.useState<Error | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const fetchInterestData = async () => {
      if (!selectedAccount) {
        setIsLoading(false);
        setError(new Error("No account selected"));
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/user/interest-earned?account=${selectedAccount}`);
        if (!response.ok) {
          if (response.status === 401) {
            throw new Error("Authentication required");
          }
          throw new Error(`Error fetching interest data: ${response.statusText}`);
        }

        const result: InterestEarnedDataPoint[] = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch interest data"));
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterestData();
  }, [selectedAccount]);

  // Calculate latest net interest
  const latestNetInterest = React.useMemo(() => calculateLatestNetInterest(data), [data]);

  return { data, latestNetInterest, error, isLoading };
};

export { useInterestData, type UseInterestDataReturn, type InterestEarnedDataPoint };
