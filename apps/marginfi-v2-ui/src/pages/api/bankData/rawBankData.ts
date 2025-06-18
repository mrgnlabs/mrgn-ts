import { Connection } from "@solana/web3.js";
import { NextApiRequest, NextApiResponse } from "next";

import { Wallet } from "@mrgnlabs/mrgn-common";
import { fetchMultipleBanks, MARGINFI_IDL, MarginfiIdlType, MarginfiProgram } from "@mrgnlabs/marginfi-client-v2";
import config from "~/config/marginfi";
import { AnchorProvider, Program } from "@coral-xyz/anchor";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { query, method } = req;

  const requestedBanksRaw = query.addresses;

  if (method !== "GET") {
    res.status(405).json({ message: "Only GET requests are allowed" });
    return;
  }

  if (!requestedBanksRaw || typeof requestedBanksRaw !== "string") {
    return res.status(400).json({ error: "Invalid input: expected an array of bank base58-encoded addresses." });
  }

  if (!process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE) {
    return res.status(400).json({ error: "PRIVATE_RPC_ENDPOINT_OVERRIDE is not set" });
  }

  try {
    const requestedBanks = requestedBanksRaw.split(",").map((bankAddress) => bankAddress.trim());

    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE);

    const idl = { ...MARGINFI_IDL, address: config.mfiConfig.programId.toBase58() } as unknown as MarginfiIdlType;
    const provider = new AnchorProvider(connection, {} as Wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
    });
    const program = new Program(idl, provider) as any as MarginfiProgram;

    const dataByBank = await fetchMultipleBanks(program, {
      bankAddresses: requestedBanks,
      groupAddress: config.mfiConfig.groupPk,
    });
    // Set cache headers for 1 day
    res.setHeader("Cache-Control", "public, max-age=40, s-maxage=40, stale-while-revalidate=40");
    res.setHeader("CDN-Cache-Control", "max-age=40");
    res.setHeader("Vercel-CDN-Cache-Control", "max-age=40");
    res.status(200).json(dataByBank);
  } catch (error) {
    console.error("Error fetching bank data:", error);
    res.status(500).json({ message: "Internal server error" });
  }
}
