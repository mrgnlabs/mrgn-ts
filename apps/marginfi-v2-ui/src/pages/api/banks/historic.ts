import { NextApiRequest, NextApiResponse } from "next";
import { STATUS_INTERNAL_ERROR, STATUS_OK } from "@mrgnlabs/marginfi-v2-ui-state";

import { BankRatesResponse } from "~/components/common/bank-chart/types/bank-chart.types";

// Filter to get one entry per day from the raw data
const filterOneEntryPerDay = (data: BankRatesResponse["data"]) => {
  const dailyEntries = new Map<string, BankRatesResponse["data"][0]>();

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

    const apiUrl = `${process.env.MARGINFI_API_URL}/v1/base/bank-rates?bank_address=${bankAddress}`;

    const response = await fetch(apiUrl, {
      headers: {
        "x-api-key": process.env.MARGINFI_API_KEY,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error("Error fetching bank rates:", {
        status: response.status,
        statusText: response.statusText,
        error: errorData,
      });

      return res.status(response.status).json({
        error: "Error fetching bank rates",
        details: errorData || response.statusText,
      });
    }

    const data: BankRatesResponse = await response.json();
    // Get one entry per day and take the last 30 days worth
    const filteredData = filterOneEntryPerDay(data.data).slice(-30);
    return res.status(STATUS_OK).json(filteredData);
  } catch (error: any) {
    console.error("Error in bank rates endpoint:", error);
    return res.status(STATUS_INTERNAL_ERROR).json({ error: "Internal server error" });
  }
}
