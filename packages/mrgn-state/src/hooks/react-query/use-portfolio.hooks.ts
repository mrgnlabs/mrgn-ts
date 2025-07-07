import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchPortfolioData } from "../../api";
import { calculate7dPortfolioStats, normalizePortfolioSnapshots } from "../../lib";
import { EnrichedPortfolioDataPoint, PortfolioDataResult, PositionType } from "../../types";
import type { ExtendedBankInfo } from "../../types/bank.types";

/**
 * React Query hook for fetching portfolio data
 * @param selectedAccount The wallet address to fetch portfolio data for
 * @param banks Array of ExtendedBankInfo objects for price data
 * @returns Portfolio data and statistics
 */
export function usePortfolioData(selectedAccount: string | null, banks: ExtendedBankInfo[]): PortfolioDataResult {
  const { data, error, isLoading, isError } = useQuery({
    queryKey: ["portfolioData", selectedAccount],
    queryFn: () => fetchPortfolioData(selectedAccount),
    staleTime: 5 * 60_000, // 5 minutes
    enabled: !!selectedAccount && banks.length > 0,
  });

  const bankMap = useMemo(() => {
    return banks.reduce(
      (map, bank) => {
        map[bank.address.toBase58()] = bank;
        return map;
      },
      {} as Record<string, ExtendedBankInfo>
    );
  }, [banks]);

  const groupedByLastSeenAt = useMemo(() => {
    return data?.reduce<Record<string, EnrichedPortfolioDataPoint[]>>((acc, point) => {
      if (!point.lastSeenAt || !point.bankAddress) {
        return acc;
      }

      if (!acc[point.lastSeenAt]) {
        acc[point.lastSeenAt] = [];
      }

      const bank = bankMap[point.bankAddress];
      const oraclePrice = bank?.info.oraclePrice.priceRealtime.price.toNumber() || 0;
      const mintDecimals = bank?.info.rawBank.mintDecimals || 0;

      const assetTokens = point.assetShares / 10 ** mintDecimals;
      const liabilityTokens = point.liabilityShares / 10 ** mintDecimals;

      const depositValueUsd = assetTokens * oraclePrice;
      const borrowValueUsd = liabilityTokens * oraclePrice;
      const netValueUsd = depositValueUsd - borrowValueUsd;

      let positionType: PositionType;
      if (point.assetShares > 0) {
        positionType = "deposit";
      } else {
        positionType = "borrow";
      }
      acc[point.lastSeenAt].push({
        ...point,
        bankSymbol: bank.meta.tokenSymbol,
        depositValueUsd,
        borrowValueUsd,
        netValueUsd,
        positionType,
      });

      return acc;
    }, {});
  }, [data, bankMap]);

  const stats = useMemo(() => {
    if (!groupedByLastSeenAt)
      return {
        supplied7d: { value: 0, change: 0, changePercent: 0 },
        borrowed7d: { value: 0, change: 0, changePercent: 0 },
        netValue7d: { value: 0, change: 0, changePercent: 0 },
      };
    return calculate7dPortfolioStats(groupedByLastSeenAt);
  }, [groupedByLastSeenAt]);

  const normalizedPortfolioSnapshot = useMemo(() => {
    if (!groupedByLastSeenAt) return {};
    return normalizePortfolioSnapshots(groupedByLastSeenAt);
  }, [groupedByLastSeenAt]);

  return {
    data: normalizedPortfolioSnapshot,
    supplied7d: stats.supplied7d,
    borrowed7d: stats.borrowed7d,
    netValue7d: stats.netValue7d,
    error: error as Error | null,
    isLoading,
    isError,
  };
}
