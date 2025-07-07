import { NextApiRequest, NextApiResponse } from "next";
import { Connection, PublicKey } from "@solana/web3.js";
import { AnchorProvider, BorshCoder, Program } from "@coral-xyz/anchor";

import { Wallet } from "@mrgnlabs/mrgn-common";
import { AccountType, MARGINFI_IDL, MarginfiGroup, MarginfiIdlType, groupToDto } from "@mrgnlabs/marginfi-client-v2";

import config from "~/config/marginfi";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { groupAddress } = req.query;

  if (!groupAddress || typeof groupAddress !== "string") {
    res.status(400).json({ error: "Invalid groupAddress" });
    return;
  }

  if (!process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE) {
    res.status(400).json({ error: "PRIVATE_RPC_ENDPOINT_OVERRIDE is not set" });
    return;
  }

  // use abort controller to restrict fetch to 10 seconds
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 5000);

  try {
    const connection = new Connection(process.env.PRIVATE_RPC_ENDPOINT_OVERRIDE);
    const idl = { ...MARGINFI_IDL, address: config.mfiConfig.programId.toBase58() } as unknown as MarginfiIdlType;

    // const groupAi = await connection.getAccountInfo(new PublicKey(groupAddress));

    // if (!groupAi) {
    //   res.status(400).json({ error: "Group not found" });
    //   return;
    // }

    // const coder = new BorshCoder(idl);
    // console.log({ groupAi: groupAi.data });
    // const decoded = coder.accounts.decode(AccountType.MarginfiGroup, groupAi.data);
    // console.log({ decoded });
    // group = MarginfiGroup.fromBuffer(new PublicKey(groupAddress), groupAi.data, idl);

    const groupDto = groupToDto(new MarginfiGroup(new PublicKey(groupAddress), new PublicKey(groupAddress)));

    // cache for 20 minutes (1200 seconds)
    res.setHeader("Cache-Control", "s-maxage=1200, stale-while-revalidate=300");
    res.status(200).json(groupDto);
  } catch (error) {
    console.error("Error:", error);
    res.status(500).json({
      error: "Internal server error",
    });
  } finally {
    clearTimeout(timeoutId);
  }
}
