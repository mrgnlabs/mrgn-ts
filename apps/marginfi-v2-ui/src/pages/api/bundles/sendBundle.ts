import { NextApiRequest, NextApiResponse } from "next";
import { searcherClient } from "./jito/sdk/block-engine/searcher";
import { Bundle } from "./jito/sdk/block-engine/types";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { VersionedTransaction } from "@solana/web3.js";
// import { searcherClient } from "jito-ts/src/sdk/block-engine/searcher";
// import { Bundle } from "jito-ts/src/sdk/block-engine/types";

const JITO_ENDPOINT = "mainnet.block-engine.jito.wtf";

/**
 * Post an array of transaction strings to the JITO API
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { transactions } = req.body;

  console.log("transactions", transactions.length);

  if (!Array.isArray(transactions) || transactions.some((tx) => typeof tx !== "string")) {
    return res.status(400).json({ error: "Invalid transactions format" });
  }

  try {
    const grpcClient = searcherClient(JITO_ENDPOINT);
    let isLeaderSlot = false;
    while (!isLeaderSlot) {
      const next_leader = await grpcClient.getNextScheduledLeader();
      const num_slots = next_leader.nextLeaderSlot - next_leader.currentSlot;
      isLeaderSlot = num_slots <= 2;
      console.log(`next jito leader slot in ${num_slots} slots`);
      await new Promise((r) => setTimeout(r, 500));
    }

    const txs = transactions.map((tx) => VersionedTransaction.deserialize(bs58.decode(tx)));

    const b = new Bundle([], 5);
    let maybeBundle = b.addTransactions(...txs);
    // if (vendor.isError(maybeBundle)) {
    //   throw maybeBundle;
    // }

    try {
      const resp = await grpcClient.sendBundle(b);
      console.log("resp:", resp);
      return res.status(200).json({ message: "Bundle sent successfully", response: resp });
    } catch (e) {
      console.error("error sending bundle:", e);
      return res.status(500).json({ error: "Error sending bundle" });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error processing transactions" });
  }
}
