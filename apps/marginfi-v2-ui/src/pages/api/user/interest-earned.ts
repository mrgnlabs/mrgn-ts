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

    // Calculate date 30 days ago to match portfolio API date range
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Call the interest earned aggregate function with selected account
    const { data: interestData, error } = await supabase.schema("application").rpc("f_interest_earned_aggregate_6h", {
      account_filter: accountAddress,
    });

    if (error) {
      console.error("Error fetching interest earned from Supabase:", error);
      return res.status(STATUS_INTERNAL_ERROR).json({
        error: "Error fetching interest earned data",
        details: error.message,
      });
    }

    if (!interestData) {
      return res.status(404).json({ error: "No interest earned data found for this wallet" });
    }

    // Filter data to last 30 days to match portfolio API behavior
    const filteredData = interestData.filter((item: any) => {
      const itemDate = new Date(item.bank_snapshot_time);
      return itemDate >= thirtyDaysAgo;
    });

    return res.status(STATUS_OK).json(filteredData);
  } catch (error: any) {
    console.error("Error in interest earned endpoint:", error);
    return res.status(STATUS_INTERNAL_ERROR).json({ error: "Internal server error" });
  }
}
