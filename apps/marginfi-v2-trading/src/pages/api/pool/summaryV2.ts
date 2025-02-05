import { NextApiRequest, NextApiResponse } from "next";
import { PoolListApiResponse } from "~/types/api.types";

const S_MAXAGE_TIME = 100;
const STALE_WHILE_REVALIDATE_TIME = 150;

type TradeGroupsCache = {
  [group: string]: [string, string];
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    let host = extractHost(req.headers.origin) || extractHost(req.headers.referer);

    if (!host) {
      return res.status(400).json({ error: "Invalid input: expected a valid host." });
    }

    const poolList: PoolListApiResponse[] = await fetch(`${host}/api/pool/list`).then((response) => response.json());

    const groupSummaries = poolList.reduce(
      (acc, pool) => {
        const quoteBankAddress = pool.quote_bank.address;
        const tokenBankAddress = pool.base_bank.address;

        const tokenBankSummary: BankSummary = {
          bankPk: tokenBankAddress,
          mint: pool.base_bank.mint.address,
          totalDeposits: pool.base_bank.details.total_deposits,
          totalBorrows: pool.base_bank.details.total_borrows,
          totalDepositsUsd: pool.base_bank.details.total_deposits_usd,
          totalBorrowsUsd: pool.base_bank.details.total_borrows_usd,
        };

        const quoteBankSummary: BankSummary = {
          bankPk: quoteBankAddress,
          mint: pool.quote_bank.mint.address,
          totalDeposits: pool.quote_bank.details.total_deposits,
          totalBorrows: pool.quote_bank.details.total_borrows,
          totalDepositsUsd: pool.quote_bank.details.total_deposits_usd,
          totalBorrowsUsd: pool.quote_bank.details.total_borrows_usd,
        };

        acc[pool.group] = {
          tokenBankSummary,
          quoteBankSummary,
        };

        return acc;
      },
      {} as Record<
        string,
        {
          tokenBankSummary: BankSummary;
          quoteBankSummary: BankSummary;
        }
      >
    );

    res.setHeader("Cache-Control", `s-maxage=${S_MAXAGE_TIME}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_TIME}`);
    return res.status(200).json(groupSummaries);
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error fetching data" });
  }
}

interface BankSummary {
  bankPk: string;
  mint: string;
  totalDeposits: number;
  totalBorrows: number;
  totalDepositsUsd: number;
  totalBorrowsUsd: number;
}

function extractHost(referer: string | undefined): string | undefined {
  if (!referer) {
    return undefined;
  }
  const url = new URL(referer);
  return url.origin;
}
