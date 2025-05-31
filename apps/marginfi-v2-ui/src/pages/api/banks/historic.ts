import { NextApiRequest, NextApiResponse } from "next";
import { createClient } from "@supabase/supabase-js";
import { STATUS_INTERNAL_ERROR, STATUS_OK } from "@mrgnlabs/marginfi-v2-ui-state";

export const MAX_DURATION = 60;

// Create Supabase client using anon key for public data access
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: "application",
  },
});

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const bankAddress = req.query.bank_address;

    if (!bankAddress || typeof bankAddress !== "string") {
      return res.status(400).json({ error: "Bank address is required" });
    }

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split("T")[0]; // YYYY-MM-DD format

    // Query Supabase for historical bank metrics
    const { data: bankMetrics, error } = await supabase
      .from("v_bank_metrics_daily")
      .select("day, borrow_rate_pct, deposit_rate_pct, total_borrows_usd, total_deposits_usd")
      .eq("bank_address", bankAddress)
      .gte("day", startDate)
      .order("day", { ascending: true });

    if (error) {
      console.error("Error fetching bank metrics from Supabase:", error);
      return res.status(STATUS_INTERNAL_ERROR).json({
        error: "Error fetching bank data",
        details: error.message,
      });
    }

    if (!bankMetrics || bankMetrics.length === 0) {
      return res.status(404).json({ error: "No historical data found for this bank" });
    }

    // Transform data to match expected format
    const formattedData = bankMetrics.map((entry) => ({
      timestamp: entry.day,
      borrowRate: entry.borrow_rate_pct || 0,
      depositRate: entry.deposit_rate_pct || 0,
      totalBorrows: entry.total_borrows_usd || 0,
      totalDeposits: entry.total_deposits_usd || 0,
    }));

    return res.status(STATUS_OK).json(formattedData);
  } catch (error: any) {
    console.error("Error in bank historic data endpoint:", error);
    return res.status(STATUS_INTERNAL_ERROR).json({ error: "Internal server error" });
  }
}
