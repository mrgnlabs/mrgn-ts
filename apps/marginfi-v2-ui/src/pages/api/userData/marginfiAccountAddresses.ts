import { NextApiRequest, NextApiResponse } from "next";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

import {
  fetchMarginfiAccountAddresses,
  MARGINFI_IDL,
  MarginfiIdlType,
  MarginfiProgram,
} from "@mrgnlabs/marginfi-client-v2";
import { Wallet } from "@mrgnlabs/mrgn-common";

import config from "~/config/marginfi";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { authority, group } = req.query;

  if (!authority) {
    return res.status(400).json({ error: "No authority address provided" });
  }

  if (!group) {
    return res.status(400).json({ error: "No group address provided" });
  }

  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE) {
    return res.status(400).json({ error: "PRIVATE_RPC_ENDPOINT_OVERRIDE is not set" });
  }

  try {
    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE);

    const idl = { ...MARGINFI_IDL, address: config.mfiConfig.programId.toBase58() } as unknown as MarginfiIdlType;
    const provider = new AnchorProvider(connection, {} as Wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
    });

    const program = new Program(idl, provider) as any as MarginfiProgram;

    const authorityPk = new PublicKey(authority);
    const groupPk = new PublicKey(group);

    const marginfiAccounts = await fetchMarginfiAccountAddresses(program, authorityPk, groupPk);

    res.status(200).json({ marginfiAccounts: marginfiAccounts.map((a) => a.toBase58()) });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error processing request" });
  }
}
