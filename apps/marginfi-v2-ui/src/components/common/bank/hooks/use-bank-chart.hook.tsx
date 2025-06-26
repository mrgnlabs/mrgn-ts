"use client";

import React from "react";
import { BankChartData, BankChartDataDailyAverages, UseBankRatesReturn } from "../types/bank-chart.types";
import { filterDailyRates } from "../utils/bank-chart.utils";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { AssetTag } from "@mrgnlabs/marginfi-client-v2";

// Function to fill gaps in bank chart data by duplicating the most recent values
const fillDataGaps = (data: BankChartDataDailyAverages[], daysToFill: number = 30): BankChartDataDailyAverages[] => {
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

  const filledData: BankChartDataDailyAverages[] = [];
  let lastKnownData: BankChartDataDailyAverages | null = null;

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
        timestamp: `${dateStr}T00:00:00+00:00`,
      });
    } else {
      // If no previous data exists, look for next available data point
      const futureData = sortedData.find((item) => new Date(item.timestamp) > new Date(`${dateStr}T00:00:00+00:00`));

      if (futureData) {
        filledData.push({
          ...futureData,
          timestamp: `${dateStr}T00:00:00+00:00`,
        });
        lastKnownData = futureData;
      } else {
        // If no data at all, create zero entry (this should be rare)
        filledData.push({
          timestamp: `${dateStr}T00:00:00+00:00`,
          borrowRate: 0,
          depositRate: 0,
          totalBorrows: 0,
          totalDeposits: 0,
          totalBorrowsUsd: 0,
          totalDepositsUsd: 0,
          usdPrice: 0,
          utilization: 0,
          optimalUtilizationRate: 0,
          baseRate: 0,
          plateauInterestRate: 0,
          maxInterestRate: 0,
          insuranceIrFee: 0,
          protocolIrFee: 0,
          programFeeRate: 0,
        });
      }
    }
  }

  return filledData;
};

const useBankChart = (bankAddress: string, bank?: ExtendedBankInfo): UseBankRatesReturn => {
  const [data, setData] = React.useState<BankChartDataDailyAverages[] | null>(null);
  const [error, setError] = React.useState<Error | null>(null);
  const [isLoading, setIsLoading] = React.useState<boolean>(true);

  React.useEffect(() => {
    const fetchBankRates = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch(`/api/banks/historic?address=${bankAddress}`);
        if (!response.ok) {
          throw new Error(`Error fetching bank rates: ${response.statusText}`);
        }

        const result: BankChartData[] = await response.json();
        console.log("API Data:", result);

        // Check if we have the new fields
        if (result.length > 0) {
          console.log("Sample data point:", result[0]);
          console.log("Interest curve fields:", {
            baseRate: result[0].baseRate,
            plateauInterestRate: result[0].plateauInterestRate,
            maxInterestRate: result[0].maxInterestRate,
            utilization: result[0].utilization,
          });
          console.log("Price field:", result[0].usdPrice);
        }

        // Calculate USD values if bank data is available
        const processedData = result.map((item) => {
          const price = bank?.info.oraclePrice.priceRealtime.price.toNumber() || 0;
          const isStaked = bank?.info.rawBank.config.assetTag === AssetTag.STAKED;

          return {
            ...item,
            ...(isStaked && { borrowRate: 0, depositRate: bank.meta.stakePool?.validatorRewards }),
            totalBorrowsUsd: item.totalBorrows * price,
            totalDepositsUsd: item.totalDeposits * price,
          };
        });

        console.log(processedData);

        const dailyRates = filterDailyRates(processedData);

        // Fill gaps in the data to ensure we have a complete 30-day dataset
        const filledData = fillDataGaps(dailyRates, 30);

        console.log({ filledData });

        setData(filledData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch bank rates"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBankRates();
  }, [bankAddress, bank]);

  return { data, error, isLoading };
};

export { useBankChart };
