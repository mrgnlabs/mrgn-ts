"use client";

import React from "react";
import { BankChartData, BankChartDataDailyAverages, UseBankRatesReturn } from "../types/bank-chart.types";
import { filterDailyRates } from "../utils/bank-chart.utils";
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

        const response = await fetch(`/api/banks/historic?bank_address=${bankAddress}`);
        if (!response.ok) {
          throw new Error(`Error fetching bank rates: ${response.statusText}`);
        }

        const result: BankChartData[] = await response.json();

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

        const dailyRates = filterDailyRates(processedData);
        setData(dailyRates);
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
