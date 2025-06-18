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

interface EnrichedPortfolioDataPoint extends PortfolioDataPoint {
  bank_symbol: string; // Ensure this uses oracle data
  deposit_value_usd: number; // Recalculated with oracle prices
  borrow_value_usd: number; // Recalculated with oracle prices
  net_value_usd: number; // Recalculated with oracle prices
}

interface UsePortfolioDataReturn {
  data: EnrichedPortfolioDataPoint[];
  error: Error | null;
  isLoading: boolean;
}

const usePortfolioData = (selectedAccount: string | null, banks: ExtendedBankInfo[]): UsePortfolioDataReturn => {
  const [data, setData] = React.useState<EnrichedPortfolioDataPoint[]>([]);
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

        // Create a map of bank addresses to bank info for quick lookup
        const bankMap = banks.reduce(
          (map, bank) => {
            map[bank.address.toBase58()] = bank;
            return map;
          },
          {} as Record<string, ExtendedBankInfo>
        );

        // Enrich data with oracle prices and proper USD calculations
        const enrichedData: EnrichedPortfolioDataPoint[] = result.map((item) => {
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

        setData(enrichedData);
      } catch (err) {
        setError(err instanceof Error ? err : new Error("Failed to fetch portfolio data"));
        setData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolioData();
  }, [selectedAccount, banks]);

  return { data, error, isLoading };
};

export { usePortfolioData, type UsePortfolioDataReturn, type EnrichedPortfolioDataPoint };
