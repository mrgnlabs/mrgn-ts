import React from "react";

import { getPriceWithConfidence } from "@mrgnlabs/marginfi-client-v2";

import { useExtendedBanks } from "./use-extended-banks";

export function useProtocolStats() {
  const { extendedBanks } = useExtendedBanks();

  const stats = React.useMemo(() => {
    if (!extendedBanks) return { deposits: 0, borrows: 0 };

    return extendedBanks.reduce(
      (acc, bank) => {
        const oraclePrice = bank.info.oraclePrice;
        const price = oraclePrice ? getPriceWithConfidence(oraclePrice, false).price.toNumber() : 0;
        acc.deposits += bank.info.state.totalDeposits * price;
        acc.borrows += bank.info.state.totalBorrows * price;
        return acc;
      },
      { deposits: 0, borrows: 0 }
    );
  }, [extendedBanks]);

  return {
    deposits: stats.deposits,
    borrows: stats.borrows,
    tvl: stats.deposits + stats.borrows,
  };
}
