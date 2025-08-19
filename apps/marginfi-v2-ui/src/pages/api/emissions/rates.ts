import { STATUS_INTERNAL_ERROR } from "@mrgnlabs/mrgn-state";
import { NextApiRequest, NextApiResponse } from "next";
import { Connection } from "@solana/web3.js";
import { Wallet, wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";
import { MARGINFI_IDL, MarginfiIdlType, MarginfiProgram } from "@mrgnlabs/marginfi-client-v2";
import config from "~/config/marginfi";
import { AnchorProvider, Program } from "@coral-xyz/anchor";

const USDS_BANK = "FDsf8sj6SoV313qrA91yms3u5b3P4hBxEPvanVs8LtJV";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
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
          usdsRate = (365 * 2000) / 7 / totalDeposits;
        }
      } catch (error) {
        console.error("Error fetching USDS bank data:", error);
      }
    }

    const result = {
      [USDS_BANK]: { annualized_rate_enhancement: usdsRate },
    };

    // Only return error if both campaigns failed
    if (usdsRate === 0) {
      return res.status(404).json({ error: "No emissions rates found" });
    }

    // 1 hour
    res.setHeader("Cache-Control", "s-maxage=3600, stale-while-revalidate=7200");
    res.status(200).json(result);
  } catch (error) {
    console.error("Error in emissions rates API:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
