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

interface ChartDataPoint {
  timestamp: string;
  [bankSymbol: string]: number | string;
}

interface UseInterestChartReturn {
  data: ChartDataPoint[];
  bankSymbols: string[];
  error: Error | null;
  isLoading: boolean;
}

// Generic function to transform interest data (earned, paid, or total)
const transformInterestData = (
  data: InterestEarnedDataPoint[],
  dataType: "earned" | "paid" | "total"
): { chartData: ChartDataPoint[]; bankSymbols: string[] } => {
  if (!data.length) return { chartData: [], bankSymbols: [] };

  if (dataType === "total") {
    return transformTotalInterestData(data);
  }

  const fieldName =
    dataType === "earned" ? "cumulative_interest_earned_usd_close" : "cumulative_interest_paid_usd_close";

  // Get unique bank symbols
  const allBankSymbols = Array.from(new Set(data.map((item) => item.bank_symbol)));

  // FIRST: Filter out banks with no meaningful interest BEFORE gap filling
  const activeBankSymbols = allBankSymbols.filter((bankSymbol) => {
    const bankData = data.filter((item) => item.bank_symbol === bankSymbol);
    const hasSignificantValue = bankData.some((item) => Math.abs(item[fieldName]) > 0.01);
    return hasSignificantValue;
  });

  // If no active banks, return empty
  if (activeBankSymbols.length === 0) {
    return { chartData: [], bankSymbols: [] };
  }

  // Generate array of all dates for the last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 29); // 30 days total

  const allDates: string[] = [];
  for (let i = 0; i < 30; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    allDates.push(currentDate.toISOString().split("T")[0]); // YYYY-MM-DD format
  }

  // Group data by bank symbol (only for active banks)
  const dataByBank: Record<string, InterestEarnedDataPoint[]> = {};
  activeBankSymbols.forEach((symbol) => {
    dataByBank[symbol] = data
      .filter((item) => item.bank_symbol === symbol)
      .sort((a, b) => new Date(a.bank_snapshot_time).getTime() - new Date(b.bank_snapshot_time).getTime());
  });

  // Fill gaps for each active bank symbol
  const filledDataByBank: Record<string, Record<string, number>> = {};

  activeBankSymbols.forEach((bankSymbol) => {
    const bankData = dataByBank[bankSymbol];
    filledDataByBank[bankSymbol] = {};

    let lastKnownValue = 0;

    // For each date in our timeline
    allDates.forEach((dateStr) => {
      // Check if we have data for this date
      const existingData = bankData.find((item) => {
        const itemDate = new Date(item.bank_snapshot_time).toISOString().split("T")[0];
        return itemDate === dateStr;
      });

      if (existingData) {
        // Use actual data if available
        lastKnownValue = existingData[fieldName];
        filledDataByBank[bankSymbol][dateStr] = lastKnownValue;
      } else {
        // Fill gap with last known value (forward fill)
        // For cumulative interest, this makes sense as it should not decrease
        filledDataByBank[bankSymbol][dateStr] = lastKnownValue;
      }
    });

    // If we never found any data for this bank, try backfill from future data
    if (lastKnownValue === 0 && bankData.length > 0) {
      const firstDataValue = bankData[0][fieldName];
      allDates.forEach((dateStr) => {
        if (filledDataByBank[bankSymbol][dateStr] === 0) {
          filledDataByBank[bankSymbol][dateStr] = firstDataValue;
        }
      });
    }
  });

  // Convert filled data back to chart format (only include active banks)
  const chartData: ChartDataPoint[] = allDates.map((dateStr) => {
    const dataPoint: ChartDataPoint = {
      timestamp: `${dateStr}T12:00:00.000Z`, // Use noon to avoid timezone issues
    };

    activeBankSymbols.forEach((bankSymbol) => {
      dataPoint[bankSymbol] = filledDataByBank[bankSymbol][dateStr] || 0;
    });

    return dataPoint;
  });

  return { chartData, bankSymbols: activeBankSymbols };
};

// Transform API data into total interest format (earned + paid + net)
const transformTotalInterestData = (
  data: InterestEarnedDataPoint[]
): { chartData: ChartDataPoint[]; bankSymbols: string[] } => {
  if (!data.length) return { chartData: [], bankSymbols: [] };

  // Generate array of all dates for the last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 29); // 30 days total

  const allDates: string[] = [];
  for (let i = 0; i < 30; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    allDates.push(currentDate.toISOString().split("T")[0]); // YYYY-MM-DD format
  }

  // Group data by date and sum across all banks
  const dailyTotals: Record<string, { earned: number; paid: number }> = {};

  // Initialize all dates with zero values
  allDates.forEach((dateStr) => {
    dailyTotals[dateStr] = { earned: 0, paid: 0 };
  });

  // Aggregate data by date
  data.forEach((item) => {
    const itemDate = new Date(item.bank_snapshot_time).toISOString().split("T")[0];
    if (dailyTotals[itemDate]) {
      dailyTotals[itemDate].earned += item.cumulative_interest_earned_usd_close;
      dailyTotals[itemDate].paid += item.cumulative_interest_paid_usd_close;
    }
  });

  // Forward-fill missing data to ensure cumulative values don't decrease
  let lastEarned = 0;
  let lastPaid = 0;

  allDates.forEach((dateStr) => {
    const current = dailyTotals[dateStr];
    if (current.earned > 0 || current.paid > 0) {
      lastEarned = Math.max(lastEarned, current.earned);
      lastPaid = Math.max(lastPaid, current.paid);
    }
    dailyTotals[dateStr] = {
      earned: Math.max(lastEarned, current.earned),
      paid: Math.max(lastPaid, current.paid),
    };
  });

  // Convert to chart format
  const chartData: ChartDataPoint[] = allDates.map((dateStr) => {
    const totals = dailyTotals[dateStr];
    const netInterest = totals.earned - totals.paid;

    return {
      timestamp: `${dateStr}T12:00:00.000Z`,
      "Total Earned": totals.earned,
      "Total Paid": -totals.paid, // Make paid negative for proper visualization
      "Net Interest": netInterest,
    };
  });

  // Check if we have any meaningful data (threshold of $0.01)
  const hasSignificantData = chartData.some(
    (point) => Math.abs(point["Total Earned"] as number) > 0.01 || Math.abs(point["Total Paid"] as number) > 0.01
  );

  if (!hasSignificantData) {
    return { chartData: [], bankSymbols: [] };
  }

  return {
    chartData,
    bankSymbols: ["Total Earned", "Total Paid", "Net Interest"],
  };
};

const useInterestChart = (
  selectedAccount: string | null,
  dataType: "earned" | "paid" | "total"
): UseInterestChartReturn => {
  const [data, setData] = React.useState<ChartDataPoint[]>([]);
  const [bankSymbols, setBankSymbols] = React.useState<string[]>([]);
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

        // Transform data based on type
        const { chartData, bankSymbols: symbols } = transformInterestData(result, dataType);

        setData(chartData);
        setBankSymbols(symbols);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch interest data"));
        setData([]);
        setBankSymbols([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchInterestData();
  }, [selectedAccount, dataType]);

  return { data, bankSymbols, error, isLoading };
};

export { useInterestChart, type UseInterestChartReturn };
