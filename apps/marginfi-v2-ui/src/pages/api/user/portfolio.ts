import { NextApiRequest, NextApiResponse } from "next";
import { STATUS_INTERNAL_ERROR, STATUS_OK } from "@mrgnlabs/marginfi-v2-ui-state";
import { createClient } from "@supabase/supabase-js";

export const MAX_DURATION = 60;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Use anon key client instead of authenticated client
    const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

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
      .from("fv_account_balance_daily")
      .select("*")
      .eq("account_address", accountAddress)
      .gte("bucket_start", startDate)
      .order("bucket_start", { ascending: true });

    if (error) {
      console.error("Error fetching portfolio data from Supabase:", error);
      return res.status(STATUS_INTERNAL_ERROR).json({
        error: "Error fetching portfolio data",
        details: error.message,
      });
    }

    if (!portfolioData || portfolioData.length === 0) {
      return res.status(404).json({ error: "No portfolio data found for this wallet" });
    }

    // Get unique bank addresses to fetch bank information
    const bankAddresses = Array.from(new Set(portfolioData.map((entry: any) => entry.bank_pk)));

    // Fetch bank information separately
    const { data: bankData, error: bankError } = await supabase
      .schema("application")
      .from("v_bank_latest_enriched")
      .select("address, mint, name, symbol, mint_decimals")
      .in("address", bankAddresses);

    if (bankError) {
      console.error("Error fetching bank data from Supabase:", bankError);
      return res.status(STATUS_INTERNAL_ERROR).json({
        error: "Error fetching bank data",
        details: bankError.message,
      });
    }

    // Create a map of bank address to bank info
    const bankMap = (bankData || []).reduce((map: any, bank: any) => {
      map[bank.address] = bank;
      return map;
    }, {});

    // Transform data to include bank information and USD values
    const formattedData = portfolioData.map((entry: any) => {
      const bankInfo = bankMap[entry.bank_pk] || {};
      return {
        account_id: entry.account_id,
        account_address: entry.account_address,
        bank_address: entry.bank_pk,
        bank_name: bankInfo.name || entry.bank_asset_tag || entry.bank_pk,
        bank_symbol: bankInfo.symbol || entry.bank_asset_tag || "Unknown",
        bucket_start: entry.bucket_start,
        bucket_end: entry.bucket_end,
        asset_shares: entry.asset_shares || 0,
        liability_shares: entry.liability_shares || 0,
        price: entry.price || 0,
        // Calculate USD values
        deposit_value_usd: (entry.asset_shares || 0) * (entry.price || 0),
        borrow_value_usd: (entry.liability_shares || 0) * (entry.price || 0),
        net_value_usd: ((entry.asset_shares || 0) - (entry.liability_shares || 0)) * (entry.price || 0),
      };
    });

    return res.status(STATUS_OK).json(formattedData);
  } catch (error: any) {
    console.error("Error in portfolio endpoint:", error);
    return res.status(STATUS_INTERNAL_ERROR).json({ error: "Internal server error" });
  }
}
