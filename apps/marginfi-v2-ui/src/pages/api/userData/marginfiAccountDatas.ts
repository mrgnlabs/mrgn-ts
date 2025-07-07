import { Connection, PublicKey } from "@solana/web3.js";
import { NextApiRequest, NextApiResponse } from "next";

import { AnchorProvider, Program, Wallet } from "@coral-xyz/anchor";
import { MARGINFI_IDL, MarginfiIdlType, MarginfiProgram } from "@mrgnlabs/marginfi-client-v2";

import config from "~/config/marginfi";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { marginfiAccounts } = req.query;

  if (!marginfiAccounts || typeof marginfiAccounts !== "string") {
    return res
      .status(400)
      .json({ error: "Invalid input: expected an array of marginfi account base58-encoded addresses." });
  }
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE) {
    return res.status(400).json({ error: "PRIVATE_RPC_ENDPOINT_OVERRIDE is not set" });
  }

  try {
    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE || "");
    const marginfiAccountsPk = marginfiAccounts
      .split(",")
      .map((marginfiAccountAddress) => new PublicKey(marginfiAccountAddress));

    const idl = { ...MARGINFI_IDL, address: config.mfiConfig.programId.toBase58() } as unknown as MarginfiIdlType;
    const provider = new AnchorProvider(connection, {} as Wallet, {
      ...AnchorProvider.defaultOptions(),
      commitment: connection.commitment ?? AnchorProvider.defaultOptions().commitment,
    });
    const program = new Program(idl, provider) as any as MarginfiProgram;

    const marginfiAccountsAis = await program.account.marginfiAccount.fetchMultiple(marginfiAccountsPk);

    res.status(200).json({ marginfiAccountsAis });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error processing request" });
  }
}
