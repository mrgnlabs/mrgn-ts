import { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@mrgnlabs/mrgn-utils";
import { STATUS_INTERNAL_ERROR, STATUS_OK } from "@mrgnlabs/marginfi-v2-ui-state";

export const MAX_DURATION = 60;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const walletAddress = req.query.wallet_address;

    if (!walletAddress || typeof walletAddress !== "string") {
      return res.status(400).json({ error: "Wallet address is required" });
    }

    // Use the same server client pattern as other API routes
    const supabase = createServerSupabaseClient(req, res);

    // Call the interest earned aggregate function
    const { data: interestData, error } = await supabase.schema("application").rpc("f_interest_earned_aggregate_6h", {
      account_filter: walletAddress,
      bank_filter: "", // Empty string to get all banks for this wallet
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

    return res.status(STATUS_OK).json(interestData);
  } catch (error: any) {
    console.error("Error in interest earned endpoint:", error);
    return res.status(STATUS_INTERNAL_ERROR).json({ error: "Internal server error" });
  }
}
