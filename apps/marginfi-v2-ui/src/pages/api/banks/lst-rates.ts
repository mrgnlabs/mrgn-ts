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
        .from("v_bank_home_page_v_1_0_0")
        .select("symbol, mint, lst_apy")
        .eq("bank_address", bankAddress)
        .not("lst_apy", "is", null)
        .gt("lst_apy", 0);

      lstRates = result.data;
      error = result.error;
    } else {
      const result = await supabase
        .schema("application")
        .from("v_bank_home_page_v_1_0_0")
        .select("symbol, mint, lst_apy")
        .not("lst_apy", "is", null)
        .gt("lst_apy", 0);

      lstRates = result.data;
      error = result.error;
    }

    if (error) {
      console.error("Error fetching bank metrics from Supabase:", error);
      return res.status(STATUS_INTERNAL_ERROR).json({
        error: "Error fetching bank data",
        details: error.message,
      });
    }

    if (!lstRates) {
      console.log(lstRates);
      console.log(error);
      return res.status(404).json({ error: "Error fetching LST rates" });
    }

    // cache for 12 hours
    res.setHeader("Cache-Control", "s-maxage=43200, stale-while-revalidate=86400");
    return res.status(STATUS_OK).json(lstRates);
  } catch (error: any) {
    console.error("Error in bank historic data endpoint:", error);
    return res.status(STATUS_INTERNAL_ERROR).json({ error: "Internal server error" });
  }
}
