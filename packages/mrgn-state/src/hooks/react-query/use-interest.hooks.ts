import { useMemo } from "react";

import { useQuery } from "@tanstack/react-query";
import { fetchInterestData } from "../../api";
import { InterestDataResult, InterestEarnedDataPoint, InterestChartResult, InterestChartDataPoint } from "../../types";
import { calculateLatestNetInterest, calculateNetInterest30dStats } from "../../lib";

/**
 * React Query hook for fetching interest data
 * @param selectedAccount The wallet address to fetch interest data for
 * @returns Interest data with statistics
 */
export function useInterestData(selectedAccount: string | null): InterestDataResult {
  const { data, error, isLoading, isError } = useQuery({
    queryKey: ["interestData", selectedAccount],
    queryFn: () => fetchInterestData(selectedAccount),
    staleTime: 5 * 60_000, // 5 minutes
    retry: 2,
    enabled: !!selectedAccount,
  });

  // Calculate latest net interest
  const latestNetInterest = data ? calculateLatestNetInterest(data) : 0;

  // Calculate net interest change across actual data range
  const netInterest30d = data
    ? calculateNetInterest30dStats(data)
    : {
        value: 0,
        change: 0,
        changePercent: 0,
      };

  return {
    data: data || [],
    latestNetInterest,
    netInterest30d,
    error: error as Error | null,
    isLoading,
    isError,
  };
}

/**
 * Transform interest data into chart format
 * @param data Interest data points
 * @param dataType Type of interest data to display (earned, paid, or total)
 * @returns Transformed chart data and bank symbols
 */
function transformInterestData(
  data: InterestEarnedDataPoint[],
  dataType: "earned" | "paid" | "total"
): { chartData: InterestChartDataPoint[]; bankSymbols: string[] } {
  if (!data.length) return { chartData: [], bankSymbols: [] };

  if (dataType === "total") {
    return transformTotalInterestData(data);
  }

  const fieldName =
    dataType === "earned" ? "cumulative_interest_earned_usd_close" : "cumulative_interest_paid_usd_close";

  // Get unique bank symbols
  const allBankSymbols = Array.from(new Set(data.map((item) => item.bank_symbol)));

  // Filter out banks with no meaningful interest BEFORE gap filling
  const activeBankSymbols = allBankSymbols.filter((bankSymbol) => {
    const bankData = data.filter((item) => item.bank_symbol === bankSymbol);
    const hasSignificantValue = bankData.some((item) => Math.abs(item[fieldName]) > 0.01);
    return hasSignificantValue;
  });

  // If no active banks, return empty
  if (activeBankSymbols.length === 0) {
    return { chartData: [], bankSymbols: [] };
  }

  // Use actual data date range (same approach as portfolio charts)
  const allDataDates = Array.from(new Set(data.map((item) => item.bank_snapshot_time.split("T")[0]))).sort();

  if (allDataDates.length === 0) {
    return { chartData: [], bankSymbols: [] };
  }

  // Generate all dates between first and last actual date (inclusive)
  const firstDate = allDataDates[0];
  const lastDate = allDataDates[allDataDates.length - 1];
  const startDateObj = new Date(firstDate);
  const endDateObj = new Date(lastDate);

  const allDates: string[] = [];
  const currentDate = new Date(startDateObj);

  while (currentDate <= endDateObj) {
    allDates.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Group data by bank symbol (only for active banks)
  const dataByBank: Record<string, InterestEarnedDataPoint[]> = {};
  activeBankSymbols.forEach((symbol) => {
    dataByBank[symbol] = data
      .filter((item) => item.bank_symbol === symbol)
      .sort((a, b) => new Date(a.bank_snapshot_time).getTime() - new Date(b.bank_snapshot_time).getTime());
  });

  // Fill gaps for each active bank symbol (within actual date range only)
  const filledDataByBank: Record<string, Record<string, number>> = {};

  activeBankSymbols.forEach((bankSymbol) => {
    const bankData = dataByBank[bankSymbol];
    filledDataByBank[bankSymbol] = {};

    let lastKnownValue = 0;

    // For each date in our actual timeline
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
        // Fill gap with last known value (forward fill within actual range)
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
  const chartData: InterestChartDataPoint[] = allDates.map((dateStr) => {
    const dataPoint: InterestChartDataPoint = {
      timestamp: `${dateStr}T12:00:00.000Z`,
    };

    activeBankSymbols.forEach((bankSymbol) => {
      dataPoint[bankSymbol] = filledDataByBank[bankSymbol][dateStr] || 0;
    });

    return dataPoint;
  });

  return { chartData, bankSymbols: activeBankSymbols };
}

/**
 * Transform API data into total interest format (earned + paid + net)
 */
function transformTotalInterestData(data: InterestEarnedDataPoint[]): {
  chartData: InterestChartDataPoint[];
  bankSymbols: string[];
} {
  if (!data.length) return { chartData: [], bankSymbols: [] };

  // Get banks that would appear in individual earned chart
  const allBankSymbols = Array.from(new Set(data.map((item) => item.bank_symbol)));

  const earnedActiveBanks = allBankSymbols.filter((bankSymbol) => {
    const bankData = data.filter((item) => item.bank_symbol === bankSymbol);
    return bankData.some((item) => Math.abs(item.cumulative_interest_earned_usd_close) > 0.01);
  });

  // Get banks that would appear in individual paid chart
  const paidActiveBanks = allBankSymbols.filter((bankSymbol) => {
    const bankData = data.filter((item) => item.bank_symbol === bankSymbol);
    return bankData.some((item) => Math.abs(item.cumulative_interest_paid_usd_close) > 0.01);
  });

  // For total chart, we need ALL banks that appear in either chart for date range calculation
  const allActiveBanks = Array.from(new Set([...earnedActiveBanks, ...paidActiveBanks]));

  // If no active banks, return empty
  if (allActiveBanks.length === 0) {
    return { chartData: [], bankSymbols: [] };
  }

  // Use all active banks for date range calculation
  const allActiveBankData = data.filter((item) => allActiveBanks.includes(item.bank_symbol));

  // Use actual data date range (same approach as portfolio charts)
  const allDataDates = Array.from(
    new Set(allActiveBankData.map((item) => item.bank_snapshot_time.split("T")[0]))
  ).sort();

  if (allDataDates.length === 0) {
    return { chartData: [], bankSymbols: [] };
  }

  // Generate all dates between first and last actual date (inclusive)
  const firstDate = allDataDates[0];
  const lastDate = allDataDates[allDataDates.length - 1];
  const startDateObj = new Date(firstDate);
  const endDateObj = new Date(lastDate);

  const allDates: string[] = [];
  const currentDate = new Date(startDateObj);

  while (currentDate <= endDateObj) {
    allDates.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Use the same gap-filling approach as individual charts for each bank
  // Calculate earned totals: gap-fill each earned bank then sum final values by date
  const earnedByBankByDate: Record<string, Record<string, number>> = {};

  earnedActiveBanks.forEach((bankSymbol) => {
    const bankData = data
      .filter((item) => item.bank_symbol === bankSymbol)
      .sort((a, b) => new Date(a.bank_snapshot_time).getTime() - new Date(b.bank_snapshot_time).getTime());

    earnedByBankByDate[bankSymbol] = {};
    let lastKnownValue = 0;

    allDates.forEach((dateStr) => {
      const existingData = bankData.find((item) => {
        const itemDate = new Date(item.bank_snapshot_time).toISOString().split("T")[0];
        return itemDate === dateStr;
      });

      if (existingData) {
        lastKnownValue = existingData.cumulative_interest_earned_usd_close;
        earnedByBankByDate[bankSymbol][dateStr] = lastKnownValue;
      } else {
        earnedByBankByDate[bankSymbol][dateStr] = lastKnownValue;
      }
    });

    // Backfill if we never found data
    if (lastKnownValue === 0 && bankData.length > 0) {
      const firstDataValue = bankData[0].cumulative_interest_earned_usd_close;
      allDates.forEach((dateStr) => {
        if (earnedByBankByDate[bankSymbol][dateStr] === 0) {
          earnedByBankByDate[bankSymbol][dateStr] = firstDataValue;
        }
      });
    }
  });

  // Calculate paid totals: gap-fill each paid bank then sum final values by date
  const paidByBankByDate: Record<string, Record<string, number>> = {};

  paidActiveBanks.forEach((bankSymbol) => {
    const bankData = data
      .filter((item) => item.bank_symbol === bankSymbol)
      .sort((a, b) => new Date(a.bank_snapshot_time).getTime() - new Date(b.bank_snapshot_time).getTime());

    paidByBankByDate[bankSymbol] = {};
    let lastKnownValue = 0;

    allDates.forEach((dateStr) => {
      const existingData = bankData.find((item) => {
        const itemDate = new Date(item.bank_snapshot_time).toISOString().split("T")[0];
        return itemDate === dateStr;
      });

      if (existingData) {
        lastKnownValue = existingData.cumulative_interest_paid_usd_close;
        paidByBankByDate[bankSymbol][dateStr] = lastKnownValue;
      } else {
        paidByBankByDate[bankSymbol][dateStr] = lastKnownValue;
      }
    });

    // Backfill if we never found data
    if (lastKnownValue === 0 && bankData.length > 0) {
      const firstDataValue = bankData[0].cumulative_interest_paid_usd_close;
      allDates.forEach((dateStr) => {
        if (paidByBankByDate[bankSymbol][dateStr] === 0) {
          paidByBankByDate[bankSymbol][dateStr] = firstDataValue;
        }
      });
    }
  });

  // Convert to chart format by summing gap-filled values per date
  const chartData: InterestChartDataPoint[] = allDates.map((dateStr) => {
    // Sum earned values across all earned banks for this date
    const totalEarned = earnedActiveBanks.reduce((sum, bankSymbol) => {
      return sum + (earnedByBankByDate[bankSymbol][dateStr] || 0);
    }, 0);

    // Sum paid values across all paid banks for this date
    const totalPaid = paidActiveBanks.reduce((sum, bankSymbol) => {
      return sum + (paidByBankByDate[bankSymbol][dateStr] || 0);
    }, 0);

    const netInterest = totalEarned - totalPaid;

    return {
      timestamp: `${dateStr}T12:00:00.000Z`,
      "Total Earned": totalEarned,
      "Total Paid": -totalPaid, // Make paid negative for proper visualization
      "Net Interest": netInterest,
    };
  });

  // Check if we have any meaningful data (threshold of $0.01) - should pass since we filtered banks
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
}

/**
 * React Query hook for interest chart data
 * @param selectedAccount The wallet address to fetch interest data for
 * @param dataType Type of interest data to display (earned, paid, or total)
 * @returns Chart-ready data and bank symbols
 */
export function useInterestChart(
  selectedAccount: string | null,
  dataType: "earned" | "paid" | "total"
): InterestChartResult {
  // Use the data hook for fetching interest data
  const { data: interestData, error, isLoading, isError } = useInterestData(selectedAccount);

  // Transform data into chart format based on type
  const { chartData, bankSymbols } = useMemo(() => {
    if (isLoading || isError || !interestData.length) {
      return { chartData: [], bankSymbols: [] };
    }
    return transformInterestData(interestData, dataType);
  }, [interestData, dataType, isLoading, isError]);

  return {
    data: chartData,
    bankSymbols,
    error,
    isLoading,
    isError,
  };
}
