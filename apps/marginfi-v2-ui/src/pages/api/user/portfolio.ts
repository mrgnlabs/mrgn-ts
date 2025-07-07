import { NextApiRequest, NextApiResponse } from "next";
import { STATUS_INTERNAL_ERROR, STATUS_OK } from "@mrgnlabs/mrgn-state";
import { createServerSupabaseClient } from "~/auth";

export const MAX_DURATION = 60;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Use anon key client for public data access
    const supabase = createServerSupabaseClient(req, res);

    // Get account address from query parameter
    const accountAddress = req.query.account;

    if (!accountAddress || typeof accountAddress !== "string") {
      return res.status(400).json({
        error: "Account address is required",
      });
    }

    // Calculate date 30 days ago
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const startDate = thirtyDaysAgo.toISOString();

    // Query the daily account balance view for last 30 days
    const { data: portfolioData, error } = await supabase
      .schema("application")
      .from("v_account_balance_with_empty_positions")
      .select("asset_shares, liability_shares, last_seen_at, bank_address, snapshot_time, bank_asset_tag")
      .eq("account_address", accountAddress)
      .or(`snapshot_time.gte.${startDate},last_seen_at.gte.${startDate}`)
      .order("last_seen_at", { ascending: false });

    if (error) {
      console.error("Error fetching portfolio data from Supabase:", error);
      return res.status(STATUS_INTERNAL_ERROR).json({
        error: "Error fetching portfolio data",
        details: error.message,
      });
    }

    return res.status(STATUS_OK).json(portfolioData);
  } catch (error: any) {
    console.error("Error in portfolio endpoint:", error);
    return res.status(STATUS_INTERNAL_ERROR).json({ error: "Internal server error" });
  }
}
