"use client";

import React from "react";
import { BankRate, UseBankRatesReturn } from "../types/bank-chart.types";

const useBankRates = (bankAddress: string): UseBankRatesReturn => {
  const [data, setData] = React.useState<BankRate[] | null>(null);
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

        const result: BankRate[] = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch bank rates"));
      } finally {
        setIsLoading(false);
      }
    };

    fetchBankRates();
  }, [bankAddress]);

  return { data, error, isLoading };
};

export { useBankRates };
export type { BankRate };
