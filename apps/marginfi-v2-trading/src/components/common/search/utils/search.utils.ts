import { ArenaPoolSummary } from "~/types";

export const filter = (value: string, search: string, pools: ArenaPoolSummary[]) => {
  const pool = pools.find((pool) => pool.groupPk.toBase58().toLowerCase() === value.toLowerCase());
  const isTokenMatch = pool?.tokenSummary.tokenSymbol.toLowerCase().includes(search.toLowerCase());
  const isQuoteMatch = pool?.quoteSummary.tokenSymbol.toLowerCase().includes(search.toLowerCase());

  return Number(isTokenMatch || isQuoteMatch);
};
