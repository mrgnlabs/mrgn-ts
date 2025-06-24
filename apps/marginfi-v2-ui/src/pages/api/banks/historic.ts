import { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@mrgnlabs/mrgn-utils";
import { STATUS_INTERNAL_ERROR, STATUS_OK } from "@mrgnlabs/marginfi-v2-ui-state";

export const MAX_DURATION = 60;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const bankAddress = req.query.address;

    if (!bankAddress || typeof bankAddress !== "string") {
      return res.status(400).json({ error: "Bank address is required" });
    }

    // Use the same server client pattern as other API routes
    const supabase = createServerSupabaseClient(req, res);

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString().split("T")[0]; // YYYY-MM-DD format for day field

    // Query v_bank_metrics_daily table for last 30 days
    const { data: bankMetrics, error } = await supabase
      .schema("application")
      .from("v_bank_metrics_daily")
      .select("day, borrow_rate_pct, deposit_rate_pct, total_borrows, total_deposits")
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
      console.log(bankMetrics);
      console.log(error);
      return res.status(404).json({ error: "No historical data found for this bank" });
    }

    // Transform data to match expected frontend format
    const formattedData = bankMetrics.map((entry: any) => ({
      timestamp: entry.day,
      borrowRate: entry.borrow_rate_pct || 0,
      depositRate: entry.deposit_rate_pct || 0,
      totalBorrows: entry.total_borrows || 0,
      totalDeposits: entry.total_deposits || 0,
    }));

    return res.status(STATUS_OK).json(formattedData);
  } catch (error: any) {
    console.error("Error in bank historic data endpoint:", error);
    return res.status(STATUS_INTERNAL_ERROR).json({ error: "Internal server error" });
  }
}
