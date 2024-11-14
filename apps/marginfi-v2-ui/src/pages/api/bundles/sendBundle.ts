import { NextApiRequest, NextApiResponse } from "next";
import { SearcherClient, searcherClient } from "./jito/sdk/block-engine/searcher";
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
    // timeout after 10 seconds and return an error
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
    if (isError(maybeBundle)) {
      throw maybeBundle;
    }

    try {
      let whileLoop = true;

      // timeout in while loop 15sec
      while (whileLoop) {
        const grpcClient = searcherClient(JITO_ENDPOINT);
        // details: 'bundle contains an already processed transaction',
        const bundleId = await grpcClient.sendBundle(b);

        console.log("bundleId:", bundleId);

        try {
          const bundleResult = await getBundleResult(grpcClient);
          res.status(200).json({ bundleId: bundleResult });
          whileLoop = false;
        } catch (error) {
          // if timeout error continue
          console.error("error getting bundle result:", error);
        }

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

export function getBundleResult(grpcClient: SearcherClient) {
  return new Promise<string>((resolve, reject) => {
    let reset = () => {};
    const successCallback = (bundleResult: BundleResult) => {
      console.log("Bundle Result:", bundleResult);
      reset();
      if (bundleResult.accepted || bundleResult.finalized || bundleResult.processed) {
        resolve(bundleResult.bundleId);
      } else if (bundleResult.rejected) {
        reject(new Error("Bundle rejected by the block-engine."));
      } else if (bundleResult.dropped) {
        reject(new Error("Bundle was accepted but never landed on-chain."));
      } else {
        reject(new Error("Unknown error sending bundle"));
      }
    };

    const errorCallback = (error: Error) => {
      if (!error.message.includes("CANCELLED")) {
        reject(error);
      }
    };

    const timeout = setTimeout(() => {
      reset();
      reject(new Error("Timeout: No bundle result received within 10 seconds."));
    }, 3000);

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
}
