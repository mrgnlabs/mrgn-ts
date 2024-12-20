import { NextApiRequest, NextApiResponse } from "next";
import * as sb from "@switchboard-xyz/on-demand";
import { PoolOracleApiResponse } from "~/types/api.types";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const queue = await sb.getDefaultQueue(process.env.QUICKNODE_RPC_URL);
    const programIdl = queue.program.idl;
    const programId = queue.program.programId;
    const queueKey = queue.pubkey;

    // Set cache headers
    // res.setHeader("Cache-Control", `s-maxage=${S_MAXAGE_TIME}, stale-while-revalidate=${STALE_WHILE_REVALIDATE_TIME}`);

    return res.status(200).json({
      programIdl: JSON.stringify(programIdl),
      programId: programId.toBase58(),
      queueKey: queueKey.toBase58(),
    } as PoolOracleApiResponse);
  } catch (error) {
    console.error("Error fetching pool data:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: process.env.NODE_ENV === "development" ? error : undefined,
    });
  }
}
