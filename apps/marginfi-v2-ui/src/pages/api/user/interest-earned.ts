import { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "@mrgnlabs/mrgn-utils";
import { STATUS_INTERNAL_ERROR, STATUS_OK } from "@mrgnlabs/marginfi-v2-ui-state";

export const MAX_DURATION = 60;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const supabase = createServerSupabaseClient(req, res);

    // Check authentication - user must be logged in
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return res.status(401).json({
        error: "Authentication required",
        requiresAuth: true,
      });
    }

    // Get wallet address from authenticated user's metadata
    const walletAddress = user.user_metadata?.wallet_address;

    if (!walletAddress) {
      return res.status(400).json({
        error: "Wallet address not found in user profile",
      });
    }

    // Call the interest earned aggregate function with authenticated user's selected accont
    const { data: interestData, error } = await supabase.schema("application").rpc("f_interest_earned_aggregate_6h", {
      account_filter: "J7pez4qFgtTGvzfdNu7Q1sNyv5q1ydvFnPK4R44LrQi2",
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
