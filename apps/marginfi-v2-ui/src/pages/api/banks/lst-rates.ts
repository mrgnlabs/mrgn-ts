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

    // Use the same server client pattern as other API routes
    const supabase = createServerSupabaseClient(req, res);

    let lstRates, error;

    // Only filter by bank_address if it's provided
    if (bankAddress && typeof bankAddress === "string") {
      const result = await supabase
        .schema("application")
        .from("f_mfi_bank_home_page_v100")
        .select("symbol, mint, lst_apy")
        .eq("group_address", "4qp6Fx6tnZkY5Wropq9wUYgtFxXKwE6viZxFHg3rdAG8")
        .eq("bank_address", bankAddress)
        .not("lst_apy", "is", null)
        .gt("lst_apy", 0);

      lstRates = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .schema("application")
        .from("f_mfi_bank_home_page_v100")
        .select("symbol, mint, lst_apy")
        .eq("group_address", "4qp6Fx6tnZkY5Wropq9wUYgtFxXKwE6viZxFHg3rdAG8")
        .not("lst_apy", "is", null)
        .gt("lst_apy", 0);

      lstRates = result.data;
      error = result.error;
    }

    if (error) {
      console.error("Error fetching bank metrics from Supabase:", error);
      // Cache error responses for 5 minutes to prevent DB hammering
      res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
      return res.status(STATUS_INTERNAL_ERROR).json({
        error: "Error fetching bank data",
        details: error.message,
      });
    }

    // Return empty array instead of 404 when no data found
    // This ensures the response is cached and doesn't trigger retries
    if (!lstRates || lstRates.length === 0) {
      console.log("No LST rates found for bank:", bankAddress);
      // Cache empty responses for 4 hours
      res.setHeader("Cache-Control", "s-maxage=14400, stale-while-revalidate=28800");
      return res.status(STATUS_OK).json([]);
    }

    // Cache successful responses for 4 hours
    res.setHeader("Cache-Control", "s-maxage=14400, stale-while-revalidate=28800");
    return res.status(STATUS_OK).json(lstRates);
  } catch (error: any) {
    console.error("Error in bank historic data endpoint:", error);
    // Cache error responses for 5 minutes to prevent DB hammering
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(STATUS_INTERNAL_ERROR).json({ error: "Internal server error" });
  }
}
