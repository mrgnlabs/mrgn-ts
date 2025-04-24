import { NextApiRequest, NextApiResponse } from "next";
import { STATUS_INTERNAL_ERROR, STATUS_OK } from "@mrgnlabs/marginfi-v2-ui-state";
import { loadBankMetadatas, loadTokenMetadatas } from "@mrgnlabs/mrgn-common";
import { BankHistoricalDataResponse } from "~/components/common/bank-chart/types/bank-chart.types";

export const MAX_DURATION = 60;

// Filter to get one entry per day from the raw data
const filterOneEntryPerDay = (data: BankHistoricalDataResponse["data"]) => {
  const dailyEntries = new Map<string, BankHistoricalDataResponse["data"][0]>();

  // Sort by date ascending first to ensure we get the earliest entry of each day
  data
    .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
    .forEach((entry) => {
      const date = entry.time.split("T")[0];
      if (!dailyEntries.has(date)) {
        dailyEntries.set(date, entry);
      }
    });

  return Array.from(dailyEntries.values());
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const bankAddress = req.query.bank_address;

    if (!bankAddress || typeof bankAddress !== "string") {
      return res.status(400).json({ error: "Bank address is required" });
    }

    if (!process.env.MARGINFI_API_URL || !process.env.MARGINFI_API_KEY) {
      return res.status(500).json({ error: "API configuration missing" });
    }

    const bankMetadata = await loadBankMetadatas();
    const bankMeta = bankMetadata[bankAddress];

    if (!bankMeta) {
      return res.status(404).json({ error: "Bank metadata not found" });
    }

    const pricefetch = await fetch(
      `${process.env.NEXT_PUBLIC_BASE_URL}/api/tokens/price?tokenAddress=${bankMeta.tokenAddress}`
    );
    const priceData = await pricefetch.json();

    if (!priceData) {
      return res.status(404).json({ error: "Token price data not found" });
    }

    const response = await fetch(`${process.env.MARGINFI_API_URL}/v1/base/bank-rates?bank_address=${bankAddress}`, {
      headers: {
        "x-api-key": process.env.MARGINFI_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("Error fetching bank data:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });

      return res.status(response.status).json({
        error: "Error fetching bank data",
        details: errorData || response.statusText,
      });
    }

    const data: BankHistoricalDataResponse = await response.json();
    const filteredData = filterOneEntryPerDay(data.data).slice(-30);

    const formattedData = filteredData.map((entry) => ({
      ...entry,
      total_deposits: Number(entry.total_deposits) * priceData.value,
      total_borrows: Number(entry.total_borrows) * priceData.value,
    }));

    return res.status(STATUS_OK).json(formattedData);
  } catch (error: any) {
    console.error("Error in bank data endpoint:", error);
    return res.status(STATUS_INTERNAL_ERROR).json({ error: "Internal server error" });
  }
}
