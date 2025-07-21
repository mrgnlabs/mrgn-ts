import { STATUS_INTERNAL_ERROR } from "@mrgnlabs/mrgn-state";
import { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "~/auth/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient(req, res);

  const { data: rates, error } = await supabase
    .schema("application")
    .from("fv_emissions_jito_202507_campaign_rates_v_1_0_0")
    .select("*")
    .order("day", { ascending: false })
    .limit(1);

  if (error) {
    console.error("Error fetching emissions rates from Supabase:", error);
    // Cache error responses for 5 minutes to prevent DB hammering
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(STATUS_INTERNAL_ERROR).json({
      error: "Error fetching emissions rates",
      details: error.message,
    });
  }

  if (!rates || rates.length === 0) {
    // Cache 404 responses for 5 minutes to prevent DB hammering
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(404).json({ error: "No emissions rates found" });
  }

  // 12 hours
  res.setHeader("Cache-Control", "s-maxage=43200, stale-while-revalidate=86400");
  res.status(200).json(rates[0]);
}
