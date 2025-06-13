import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

import { MARGINFI_IDL, MarginfiIdlType, MarginfiProgram } from "@mrgnlabs/marginfi-client-v2";
import { Wallet } from "@mrgnlabs/mrgn-common";

import { NextApiRequest, NextApiResponse } from "next";
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

    const marginfiAccounts = (
      await program.account.marginfiAccount.all([
        {
          memcmp: {
            bytes: groupPk.toBase58(),
            offset: 8, // marginfiGroup is the first field in the account, so only offset is the discriminant
          },
        },
        {
          memcmp: {
            bytes: authorityPk.toBase58(),
            offset: 8 + 32, // authority is the second field in the account after the authority, so offset by the discriminant and a pubkey
          },
        },
      ])
    ).map((a) => a.publicKey.toBase58());

    res.status(200).json({ marginfiAccounts });
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({ error: "Error processing request" });
  }
}

function chunkArray<T>(arr: T[], chunkSize: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += chunkSize) {
    result.push(arr.slice(i, i + chunkSize));
  }
  return result;
}
