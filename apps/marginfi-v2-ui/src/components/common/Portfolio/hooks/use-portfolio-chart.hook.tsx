"use client";

import React from "react";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

// Portfolio data types
interface PortfolioDataPoint {
  account_id: number;
  account_address: string;
  bank_address: string;
  bank_name: string;
  bank_symbol: string;
  bucket_start: string;
  bucket_end: string;
  asset_shares: number;
  liability_shares: number;
  price: number;
  deposit_value_usd: number;
  borrow_value_usd: number;
  net_value_usd: number;
}

interface ChartDataPoint {
  timestamp: string;
  [bankSymbol: string]: number | string;
}

interface UsePortfolioChartReturn {
  data: ChartDataPoint[] | null;
  bankSymbols: string[];
  error: Error | null;
  isLoading: boolean;
}

// Function to fill gaps in portfolio chart data by duplicating the most recent values
const fillDataGaps = (data: ChartDataPoint[], daysToFill: number = 30): ChartDataPoint[] => {
  if (!data || data.length === 0) {
    return [];
  }

  // Sort data by timestamp to ensure proper ordering
  const sortedData = [...data].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Generate array of all dates for the last N days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - (daysToFill - 1));

  const allDates: string[] = [];
  for (let i = 0; i < daysToFill; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    allDates.push(currentDate.toISOString().split("T")[0]); // YYYY-MM-DD format
  }

  const filledData: ChartDataPoint[] = [];
  let lastKnownData: ChartDataPoint | null = null;

  for (const dateStr of allDates) {
    // Check if we have data for this date
    const existingData = sortedData.find((item) => item.timestamp.split("T")[0] === dateStr);

    if (existingData) {
      // Use actual data if available
      filledData.push(existingData);
      lastKnownData = existingData;
    } else if (lastKnownData) {
      // Fill gap with most recent known data, but update timestamp
      filledData.push({
        ...lastKnownData,
        timestamp: `${dateStr}T12:00:00.000Z`,
      });
    } else {
      // If no previous data exists, look for next available data point
      const futureData = sortedData.find((item) => new Date(item.timestamp) > new Date(`${dateStr}T12:00:00.000Z`));

      if (futureData) {
        filledData.push({
          ...futureData,
          timestamp: `${dateStr}T12:00:00.000Z`,
        });
        lastKnownData = futureData;
      } else {
        // If no data at all, create zero entry (this should be rare)
        filledData.push({
          timestamp: `${dateStr}T12:00:00.000Z`,
        });
      }
    }
  }

  return filledData;
};

// Transform API data into total portfolio format (deposits + borrows + net)
const transformTotalPortfolioData = (
  data: PortfolioDataPoint[],
  banks: ExtendedBankInfo[]
): { chartData: ChartDataPoint[]; bankSymbols: string[] } => {
  if (!data.length || !banks.length) return { chartData: [], bankSymbols: [] };

  // Create a map of bank addresses to bank info for quick lookup
  const bankMap = banks.reduce(
    (map, bank) => {
      map[bank.address.toBase58()] = bank;
      return map;
    },
    {} as Record<string, ExtendedBankInfo>
  );

  // Calculate proper USD values using oracle prices with decimals
  const enrichedData = data.map((item) => {
    const bank = bankMap[item.bank_address];
    const oraclePrice = bank?.info.oraclePrice.priceRealtime.price.toNumber() || 0;
    const mintDecimals = bank?.info.rawBank.mintDecimals || 0;

    // Convert shares to tokens by dividing by decimals, then multiply by price
    const assetTokens = item.asset_shares / 10 ** mintDecimals;
    const liabilityTokens = item.liability_shares / 10 ** mintDecimals;

    return {
      ...item,
      deposit_value_usd: assetTokens * oraclePrice,
      borrow_value_usd: liabilityTokens * oraclePrice,
      net_value_usd: (assetTokens - liabilityTokens) * oraclePrice,
    };
  });

  // Generate array of all dates for the last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 29);

  const allDates: string[] = [];
  for (let i = 0; i < 30; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    allDates.push(currentDate.toISOString().split("T")[0]);
  }

  // Group data by date and sum across all banks
  const dailyTotals: Record<string, { deposits: number; borrows: number }> = {};

  // Initialize all dates with zero values
  allDates.forEach((dateStr) => {
    dailyTotals[dateStr] = { deposits: 0, borrows: 0 };
  });

  // Aggregate data by date
  enrichedData.forEach((item) => {
    const itemDate = new Date(item.bucket_start).toISOString().split("T")[0];
    if (dailyTotals[itemDate]) {
      dailyTotals[itemDate].deposits += item.deposit_value_usd;
      dailyTotals[itemDate].borrows += item.borrow_value_usd;
    }
  });

  // Forward-fill missing data with last known values (allow decreases)
  let lastDeposits = 0;
  let lastBorrows = 0;

  allDates.forEach((dateStr) => {
    const current = dailyTotals[dateStr];
    if (current.deposits > 0) {
      lastDeposits = current.deposits;
    }
    if (current.borrows > 0) {
      lastBorrows = current.borrows;
    }

    // Use actual values if available, otherwise use last known values
    dailyTotals[dateStr] = {
      deposits: current.deposits > 0 ? current.deposits : lastDeposits,
      borrows: current.borrows > 0 ? current.borrows : lastBorrows,
    };
  });

  // Convert to chart format
  const chartData: ChartDataPoint[] = allDates.map((dateStr) => {
    const totals = dailyTotals[dateStr];
    const netValue = totals.deposits - totals.borrows;

    return {
      timestamp: `${dateStr}T12:00:00.000Z`,
      "Total Deposits": totals.deposits,
      "Total Borrows": -totals.borrows, // Make borrows negative for display below 0
      "Net Portfolio": netValue,
    };
  });

  // Check if we have any meaningful data (threshold of $0.01)
  const hasSignificantData = chartData.some(
    (point) => Math.abs(point["Total Deposits"] as number) > 0.01 || Math.abs(point["Total Borrows"] as number) > 0.01
  );

  if (!hasSignificantData) {
    return { chartData: [], bankSymbols: [] };
  }

  return {
    chartData,
    bankSymbols: ["Total Deposits", "Total Borrows", "Net Portfolio"],
  };
};

// Transform portfolio data for different chart variants
const transformPortfolioData = (
  data: PortfolioDataPoint[],
  banks: ExtendedBankInfo[],
  variant: "deposits" | "borrows" | "net"
): { chartData: ChartDataPoint[]; bankSymbols: string[] } => {
  if (!data.length || !banks.length) return { chartData: [], bankSymbols: [] };

  // Handle net variant differently - show totals instead of per-bank breakdown
  if (variant === "net") {
    return transformTotalPortfolioData(data, banks);
  }

  // Create a map of bank addresses to bank info for quick lookup
  const bankMap = banks.reduce(
    (map, bank) => {
      map[bank.address.toBase58()] = bank;
      return map;
    },
    {} as Record<string, ExtendedBankInfo>
  );

  // Get unique bank symbols and calculate proper USD values using oracle prices
  const enrichedData = data.map((item) => {
    const bank = bankMap[item.bank_address];
    const oraclePrice = bank?.info.oraclePrice.priceRealtime.price.toNumber() || 0;
    const mintDecimals = bank?.info.rawBank.mintDecimals || 0;

    // Convert shares to tokens by dividing by decimals, then multiply by price
    const assetTokens = item.asset_shares / 10 ** mintDecimals;
    const liabilityTokens = item.liability_shares / 10 ** mintDecimals;

    return {
      ...item,
      // Use oracle price with proper decimal conversion for USD calculations
      deposit_value_usd: assetTokens * oraclePrice,
      borrow_value_usd: liabilityTokens * oraclePrice,
      net_value_usd: (assetTokens - liabilityTokens) * oraclePrice,
      bank_symbol: bank?.meta.tokenSymbol || item.bank_symbol || "Unknown",
    };
  });

  // Get unique bank symbols and filter out banks with no significant activity
  const allBankSymbols = Array.from(new Set(enrichedData.map((item) => item.bank_symbol)));
  const activeBankSymbols = allBankSymbols.filter((bankSymbol) => {
    const bankData = enrichedData.filter((item) => item.bank_symbol === bankSymbol);

    const hasSignificantValue = bankData.some((item) => {
      switch (variant) {
        case "deposits":
          return Math.abs(item.deposit_value_usd) > 0.01;
        case "borrows":
          return Math.abs(item.borrow_value_usd) > 0.01;
        default:
          return false;
      }
    });

    return hasSignificantValue;
  });

  if (activeBankSymbols.length === 0) {
    return { chartData: [], bankSymbols: [] };
  }

  // Generate array of all dates for the last 30 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(endDate.getDate() - 29);

  const allDates: string[] = [];
  for (let i = 0; i < 30; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    allDates.push(currentDate.toISOString().split("T")[0]);
  }

  // Group data by bank symbol and date
  const dataByBankAndDate: Record<string, Record<string, number>> = {};

  activeBankSymbols.forEach((bankSymbol) => {
    dataByBankAndDate[bankSymbol] = {};

    // Initialize all dates with zero
    allDates.forEach((dateStr) => {
      dataByBankAndDate[bankSymbol][dateStr] = 0;
    });

    // Populate with actual data
    const bankData = enrichedData.filter((item) => item.bank_symbol === bankSymbol);
    bankData.forEach((item) => {
      const dateStr = new Date(item.bucket_start).toISOString().split("T")[0];
      if (dataByBankAndDate[bankSymbol][dateStr] !== undefined) {
        switch (variant) {
          case "deposits":
            dataByBankAndDate[bankSymbol][dateStr] = item.deposit_value_usd;
            break;
          case "borrows":
            dataByBankAndDate[bankSymbol][dateStr] = item.borrow_value_usd; // Keep positive
            break;
        }
      }
    });

    // Forward fill missing data
    let lastKnownValue = 0;
    allDates.forEach((dateStr) => {
      const currentValue = dataByBankAndDate[bankSymbol][dateStr];
      if (currentValue !== 0) {
        lastKnownValue = currentValue;
      } else {
        dataByBankAndDate[bankSymbol][dateStr] = lastKnownValue;
      }
    });
  });

  // Convert to chart format
  const chartData: ChartDataPoint[] = allDates.map((dateStr) => {
    const dataPoint: ChartDataPoint = {
      timestamp: `${dateStr}T12:00:00.000Z`,
    };

    activeBankSymbols.forEach((bankSymbol) => {
      dataPoint[bankSymbol] = dataByBankAndDate[bankSymbol][dateStr] || 0;
    });

    return dataPoint;
  });

  // Fill any remaining gaps
  const filledChartData = fillDataGaps(chartData, 30);

  return { chartData: filledChartData, bankSymbols: activeBankSymbols };
};

const usePortfolioChart = (
  selectedAccount: string | null,
  variant: "deposits" | "borrows" | "net",
  banks: ExtendedBankInfo[]
): UsePortfolioChartReturn => {
  const [data, setData] = React.useState<ChartDataPoint[] | null>(null);
  const [bankSymbols, setBankSymbols] = React.useState<string[]>([]);
  const [error, setError] = React.useState<Error | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const fetchPortfolioData = async () => {
      if (!selectedAccount) {
        setIsLoading(false);
        setError(new Error("No account selected"));
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/user/portfolio?account=${selectedAccount}`);
        if (!response.ok) {
          throw new Error(`Error fetching portfolio data: ${response.statusText}`);
        }

        const result: PortfolioDataPoint[] = await response.json();

        // Transform data using oracle prices from state
        const { chartData, bankSymbols: symbols } = transformPortfolioData(result, banks, variant);

        setData(chartData);
        setBankSymbols(symbols);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch portfolio data"));
        setData(null);
        setBankSymbols([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolioData();
  }, [selectedAccount, variant, banks]);

  return { data, bankSymbols, error, isLoading };
};

export { usePortfolioChart, type UsePortfolioChartReturn, type ChartDataPoint };
