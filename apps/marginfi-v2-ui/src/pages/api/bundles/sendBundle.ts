import { NextApiRequest, NextApiResponse } from "next";
import { searcherClient } from "./jito/sdk/block-engine/searcher";
import { Bundle } from "./jito/sdk/block-engine/types";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { VersionedTransaction } from "@solana/web3.js";
import { isError } from "./jito/sdk/block-engine/utils";
import { BundleResult } from "./jito/gen/block-engine/bundle";
import { sleep } from "@mrgnlabs/mrgn-common";
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

  if (!Array.isArray(transactions) || transactions.some((tx) => typeof tx !== "string")) {
    return res.status(400).json({ error: "Invalid transactions format" });
  }

  try {
    const grpcClient = searcherClient(JITO_ENDPOINT);
    let isLeaderSlot = false;
    //timeout after 5 seconds
    while (!isLeaderSlot) {
      const next_leader = await grpcClient.getNextScheduledLeader();
      const num_slots = next_leader.nextLeaderSlot - next_leader.currentSlot;
      isLeaderSlot = num_slots <= 2;
      console.log(`next jito leader slot in ${num_slots} slots`);
      await new Promise((r) => setTimeout(r, 500));
    }

    // if leader is > 15 return 500
    // if (num_slots > 15) {
    //   return res.status(500).json({ error: "Leader slot is too far away" });
    // }

    const txs = transactions.map((tx) => VersionedTransaction.deserialize(bs58.decode(tx)));

    const b = new Bundle([], 5);
    let maybeBundle = b.addTransactions(...txs);
    if (isError(maybeBundle)) {
      throw maybeBundle;
    }

    try {
      let whileLoop = true;
      while (whileLoop) {
        console.log("WIEEE_____________________________________%");
        const bundleId = await grpcClient.sendBundle(b);

        console.log("bundleId:", bundleId);

        const onBundleResult = new Promise<void>((resolve, reject) => {
          let reset = () => {};
          const successCallback = (bundleResult: BundleResult) => {
            console.log("Bundle Result:", bundleResult);
            reset();
            console.log("BREAKING LOOP");
            whileLoop = false;
            if (bundleResult.accepted || bundleResult.finalized || bundleResult.processed) {
              res.status(200).json({ bundleId: bundleResult.bundleId });
              resolve();
            } else if (bundleResult.rejected) {
              res.status(500).json({ error: "Bundle rejected by the block-engine." });
              reject(new Error("Bundle rejected by the block-engine."));
            } else if (bundleResult.dropped) {
              res.status(500).json({ error: "Bundle was accepted but never landed on-chain." });
              reject(new Error("Bundle was accepted but never landed on-chain."));
            } else {
              res.status(500).json({ error: "Unknown error sending bundle" });
              reject(new Error("Unknown error sending bundle"));
            }
          };

          const errorCallback = (error: Error) => {
            console.error("Stream error:", error);
            console.log("Error message:", error.message);
            if (error.message.includes("CANCELLED")) {
              console.log("CANCELLED");
            } else {
              res.status(500).json({ error: error.message });
              reject(error);
            }
          };

          const timeout = setTimeout(() => {
            console.error("Timeout: No bundle result received within 10 seconds.");
            // res.status(500).json({ error: "Timeout: No bundle result received within 10 seconds." });
            // reject(new Error("Timeout: No bundle result received within 10 seconds."));
            reset();
          }, 2000);

          reset = grpcClient.onBundleResult(
            (bundleResult) => {
              clearTimeout(timeout);
              successCallback(bundleResult);
            },
            (error) => {
              clearTimeout(timeout);
              errorCallback(error);
            }
          );
        });

        await onBundleResult;

        await sleep(500);
      }
    } catch (e) {
      console.error("error sending bundle:", e);
      return res.status(500).json({ error: "Error sending bundle" });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error processing transactions" });
  }
}
