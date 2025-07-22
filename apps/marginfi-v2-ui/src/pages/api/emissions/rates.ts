import { STATUS_INTERNAL_ERROR } from "@mrgnlabs/mrgn-state";
import { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "~/auth/server";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient(req, res);

  // Run both queries in parallel for better performance
  const [jitoResult, usdsResult] = await Promise.all([
    supabase
      .schema("application")
      .from("fv_emissions_jito_202507_campaign_rates_v_1_0_0")
      .select("*")
      .order("day", { ascending: false })
      .limit(1),
    supabase
      .schema("application")
      .from("fv_emissions_usds_202507_campaign_rates_v_1_0_0")
      .select("*")
      .order("day", { ascending: false })
      .limit(1),
  ]);

  // Log errors but don't fail the request - return partial results
  if (jitoResult.error) {
    console.error("Error fetching Jito emissions rates:", jitoResult.error);
  }

  if (usdsResult.error) {
    console.error("Error fetching USDS emissions rates:", usdsResult.error);
  }

  const result = {
    jito: jitoResult.data?.[0] || null,
    usds: usdsResult.data?.[0] || null,
  };

  // Only return error if both campaigns failed
  if (!jitoResult.data?.length && !usdsResult.data?.length) {
    return res.status(404).json({ error: "No emissions rates found" });
  }

  // 12 hours
  res.setHeader("Cache-Control", "s-maxage=43200, stale-while-revalidate=86400");
  res.status(200).json(result);
}
