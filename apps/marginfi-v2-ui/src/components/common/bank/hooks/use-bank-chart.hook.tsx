"use client";

import React from "react";
import { BankChartData, BankChartDataDailyAverages, UseBankRatesReturn } from "../types/bank-chart.types";
import { filterDailyRates, fillDataGaps } from "../utils/bank-chart.utils";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { AssetTag } from "@mrgnlabs/marginfi-client-v2";

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
