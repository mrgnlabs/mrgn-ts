import { InterestEarnedDataPoint, InterestChartDataPoint } from "../types";

/**
 * Transform interest data into chart format
 * @param data Interest data points
 * @param dataType Type of interest data to display (earned, paid, or total)
 * @returns Transformed chart data and bank symbols
 */
export function transformInterestData(
  data: InterestEarnedDataPoint[],
  dataType: "earned" | "paid"
): { chartData: InterestChartDataPoint[]; bankSymbols: string[] } {
  if (!data.length) return { chartData: [], bankSymbols: [] };

  const fieldName =
    dataType === "earned" ? "cumulative_interest_earned_usd_close" : "cumulative_interest_paid_usd_close";

  // Get unique bank symbols
  const allBankSymbols = Array.from(new Set(data.map((item) => item.bank_symbol)));

  // If no banks, return empty
  if (allBankSymbols.length === 0) {
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
  allBankSymbols.forEach((symbol) => {
    dataByBank[symbol] = data
      .filter((item) => item.bank_symbol === symbol)
      .sort((a, b) => new Date(a.bank_snapshot_time).getTime() - new Date(b.bank_snapshot_time).getTime());
  });

  // Fill gaps for each active bank symbol (within actual date range only)
  const filledDataByBank: Record<string, Record<string, number>> = {};

  allBankSymbols.forEach((bankSymbol) => {
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

    allBankSymbols.forEach((bankSymbol) => {
      dataPoint[bankSymbol] = filledDataByBank[bankSymbol][dateStr] || 0;
    });

    return dataPoint;
  });

  // Forward-fill data to current date
  const forwardFilledData = forwardFillDataToCurrentDate(chartData, allBankSymbols);

  return { chartData: forwardFilledData, bankSymbols: allBankSymbols };
}

/**
 * Transform API data into total interest format (earned + paid + net)
 */
export function transformTotalInterestData(data: InterestEarnedDataPoint[]): {
  chartData: InterestChartDataPoint[];
  bankSymbols: string[];
} {
  if (!data.length) return { chartData: [], bankSymbols: [] };

  // Get all bank symbols
  const allBankSymbols = Array.from(new Set(data.map((item) => item.bank_symbol)));

  const earnedActiveBanks = allBankSymbols.filter((bankSymbol) =>
    data.filter((item) => item.bank_symbol === bankSymbol)
  );

  const paidActiveBanks = allBankSymbols.filter((bankSymbol) => data.filter((item) => item.bank_symbol === bankSymbol));

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
  // Calculate earned totals: gap-fill each bank then sum final values by date
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

  // Calculate paid totals: gap-fill each bank then sum final values by date
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

  // Forward-fill data to current date
  const forwardFilledData = forwardFillDataToCurrentDate(chartData, ["Total Earned", "Total Paid", "Net Interest"]);

  return {
    chartData: forwardFilledData,
    bankSymbols: ["Total Earned", "Total Paid", "Net Interest"],
  };
}

/**
 * Forward-fills chart data to the current date if the last data point is not today
 * @param chartData Original chart data points
 * @param dataKeys Keys to copy from the last data point to new forward-filled points
 * @returns Chart data with forward-filled points added
 */
/**
 * Forward-fills chart data to extend the last known values up to the current date
 * This ensures consistent chart visualization without gaps between the last data point and today
 */
export function forwardFillDataToCurrentDate<T extends { timestamp: string }>(chartData: T[], dataKeys: string[]): T[] {
  if (!chartData.length) {
    console.log("forwardFillDataToCurrentDate: No chart data to forward-fill");
    return chartData;
  }

  // Get the current date and the last data point date
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const lastDataPoint = chartData[chartData.length - 1];
  const lastTimestamp =
    typeof lastDataPoint.timestamp === "string"
      ? lastDataPoint.timestamp.split("T")[0]
      : new Date(lastDataPoint.timestamp).toISOString().split("T")[0];

  // If the last data point is already today or in the future, no need to forward-fill
  if (lastTimestamp >= today) {
    return chartData;
  }

  // Generate dates from the day after the last date up to today
  const missingDates: string[] = [];
  const currentDate = new Date(lastTimestamp);
  currentDate.setDate(currentDate.getDate() + 1); // Start from the next day

  while (currentDate.toISOString().split("T")[0] <= today) {
    missingDates.push(currentDate.toISOString().split("T")[0]);
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // Create new data points for each missing date with the same values as the last data point
  const forwardFilledPoints = missingDates.map((date) => {
    // Create a new data point with the same structure as the last one
    const newPoint = { ...lastDataPoint } as T;

    // Update the timestamp
    const hasTimeComponent = lastDataPoint.timestamp.includes("T");
    newPoint.timestamp = hasTimeComponent ? `${date}T${lastDataPoint.timestamp.split("T")[1]}` : date;

    // Log the values being forward-filled for debugging
    const values = Object.fromEntries(
      Object.entries(newPoint as Record<string, any>).filter(
        ([key]) => key !== "timestamp" && typeof (newPoint as any)[key] === "number"
      )
    );

    return newPoint;
  });

  // Return the original data with the forward-filled points added
  const result = [...chartData, ...forwardFilledPoints];

  return result;
}

/**
 * Transform bank portfolio data into chart format for deposits or borrows
 * @param bankData Per-bank daily totals
 * @param variant Which data to use (deposits or borrows)
 * @returns Chart data and bank symbols
 */
export function transformBankPortfolioData(
  bankData: Record<string, Record<string, { deposits: number; borrows: number }>>,
  variant: "deposits" | "borrows"
): { data: any[]; bankSymbols: string[] } {
  // Get all bank symbols and filter to only those with non-zero values
  const allBankSymbols = Object.keys(bankData);

  const filteredBankSymbols = allBankSymbols.filter((symbol) => {
    const bankValues = bankData[symbol];
    return Object.values(bankValues).some((value) => value[variant] > 0);
  });

  // If no banks have non-zero values, return empty data
  if (filteredBankSymbols.length === 0) {
    return { data: [], bankSymbols: [] };
  }

  // Get all dates from the first bank (all banks should have the same date range)
  const firstBank = filteredBankSymbols[0];
  const allDates = Object.keys(bankData[firstBank]).sort();

  // Create chart data points with filtered banks for each date
  const chartData = allDates.map((date) => {
    const dataPoint: any = { timestamp: date };

    // Add each filtered bank's value for this date
    filteredBankSymbols.forEach((symbol) => {
      const bankValues = bankData[symbol][date];
      dataPoint[symbol] = bankValues ? bankValues[variant] : 0;
    });

    return dataPoint;
  });

  // Forward-fill data to current date
  const forwardFilledData = forwardFillDataToCurrentDate(chartData, filteredBankSymbols);

  return { data: forwardFilledData, bankSymbols: filteredBankSymbols };
}
