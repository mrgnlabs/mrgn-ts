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
  error: Error | null;
  isLoading: boolean;
}

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

  return { data, error, isLoading };
};

export { useInterestData, type UseInterestDataReturn, type InterestEarnedDataPoint };
