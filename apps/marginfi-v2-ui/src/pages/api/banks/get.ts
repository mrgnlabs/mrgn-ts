import { NextApiRequest, NextApiResponse } from "next";
import { STATUS_INTERNAL_ERROR, STATUS_OK } from "@mrgnlabs/mrgn-state";
import { createServerSupabaseClient } from "~/auth";

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
      .select("symbol, mint")
      .eq("bank_address", bankAddress)
      .limit(1)
      .single();

    if (error) {
      console.error("Error fetching bank metrics from Supabase:", error);
      return res.status(STATUS_INTERNAL_ERROR).json({
        error: "Error fetching bank data",
        details: error.message,
      });
    }

    if (!bankMetrics) {
      console.log(bankMetrics);
      console.log(error);
      return res.status(404).json({ error: "No historical data found for this bank" });
    }

    // cache for 24 hours
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate=300");
    return res.status(STATUS_OK).json(bankMetrics);
  } catch (error: any) {
    console.error("Error in bank historic data endpoint:", error);
    return res.status(STATUS_INTERNAL_ERROR).json({ error: "Internal server error" });
  }
}
