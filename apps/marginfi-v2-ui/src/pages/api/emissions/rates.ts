import { STATUS_INTERNAL_ERROR } from "@mrgnlabs/mrgn-state";
import { NextApiRequest, NextApiResponse } from "next";
import { createServerSupabaseClient } from "~/auth/server";
import { Connection } from "@solana/web3.js";
import { Wallet, wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";
import { MARGINFI_IDL, MarginfiIdlType, MarginfiProgram } from "@mrgnlabs/marginfi-client-v2";
import config from "~/config/marginfi";
import { AnchorProvider, Program } from "@coral-xyz/anchor";

const USDS_BANK = "FDsf8sj6SoV313qrA91yms3u5b3P4hBxEPvanVs8LtJV";
const JITO_BANK = "Bohoc1ikHLD7xKJuzTyiTyCwzaL5N7ggJQu75A8mKYM8";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const supabase = createServerSupabaseClient(req, res);

  try {
    // Fetch Jito emissions data from Supabase
    const jitoResult = await supabase
      .schema("application")
      .from("fv_emissions_jito_202507_campaign_rates_v_1_0_0")
      .select("*")
      .order("day", { ascending: false })
      .limit(1);

    // Log errors but don't fail the request - return partial results
    if (jitoResult.error) {
      console.error("Error fetching Jito emissions rates:", jitoResult.error);
    }

    // Fetch USDS bank data and calculate APY
    let usdsRate = 0;
    if (process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE) {
      try {
        const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE);
        const idl = { ...MARGINFI_IDL, address: config.mfiConfig.programId.toBase58() } as unknown as MarginfiIdlType;
        const provider = new AnchorProvider(connection, {} as Wallet, {
          ...AnchorProvider.defaultOptions(),
          commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
        });
        const program = new Program(idl, provider) as any as MarginfiProgram;

        const usdsBank = await program.account.bank.fetch(USDS_BANK);
        const totalAssetShares = wrappedI80F48toBigNumber(usdsBank.totalAssetShares);
        const totalDeposits = totalAssetShares.toNumber() / Math.pow(10, usdsBank.mintDecimals);

        if (totalDeposits > 0) {
          usdsRate = (365 * 1500) / 7 / totalDeposits;
        }
      } catch (error) {
        console.error("Error fetching USDS bank data:", error);
      }
    }

    const result = {
      [USDS_BANK]: { annualized_rate_enhancement: usdsRate },
      [JITO_BANK]: jitoResult.data?.[0] || null,
    };

    // Only return error if both campaigns failed
    if (!jitoResult.data?.length && usdsRate === 0) {
      return res.status(404).json({ error: "No emissions rates found" });
    }

    // 12 hours
    res.setHeader("Cache-Control", "s-maxage=43200, stale-while-revalidate=86400");
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in emissions rates API:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
