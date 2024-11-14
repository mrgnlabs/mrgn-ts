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

    await waitForLeaderSlot(grpcClient);

    const txs = transactions.map((tx) => VersionedTransaction.deserialize(bs58.decode(tx)));

    const b = new Bundle([], 5);
    let maybeBundle = b.addTransactions(...txs);
    if (isError(maybeBundle)) {
      throw maybeBundle;
    }

    try {
      let whileLoop = true;
      let timedOut = false;

      setTimeout(() => {
        timedOut = true;
      }, 15000);

      while (whileLoop) {
        if (timedOut) {
          throw new Error("Timeout: Stopped after 15 seconds of trying to get bundle result.");
        }

        const grpcClient = searcherClient(JITO_ENDPOINT);

        let bundleId = "";
        try {
          bundleId = await grpcClient.sendBundle(b);
        } catch (error) {
          console.error(error);
          // @ts-ignore
          if (error.details.includes("already processed transaction")) {
            console.log("bundle already processed, sending res");
            res.status(200).json({ bundleId });
            break;
          } else {
            throw error;
          }
        }

        console.log("bundleId:", bundleId);

        try {
          const bundleResult = await getBundleResult(grpcClient);
          res.status(200).json({ bundleId: bundleResult });
          break;
        } catch (error) {
          if (error instanceof BundleError && error.code === "timeout") {
            console.log("Timeout error in getBundleResult; retrying...");
          } else {
            console.error("error getting bundle result:", error);
            throw error;
          }
        }

        await sleep(500);
      }

      console.log("while ended without sending res");
    } catch (e) {
      console.error("error sending bundle:", e);
      return res.status(500).json({ error: "Error sending bundle" });
    }
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: "Error processing transactions" });
  }
}

async function waitForLeaderSlot(grpcClient: SearcherClient): Promise<void> {
  let isLeaderSlot = false;
  let timedOut = false;

  const timeout = setTimeout(() => {
    timedOut = true;
  }, 25000);

  while (!isLeaderSlot) {
    if (timedOut) {
      clearTimeout(timeout);
      throw new Error("Timeout: No leader slot found within 25 seconds.");
    }

    const next_leader = await grpcClient.getNextScheduledLeader();
    const num_slots = next_leader.nextLeaderSlot - next_leader.currentSlot;
    isLeaderSlot = num_slots <= 2;
    console.log(`next jito leader slot in ${num_slots} slots`);

    await new Promise((r) => setTimeout(r, 500));
  }

  clearTimeout(timeout);
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
        reject(new BundleError("Bundle rejected by the block-engine.", "rejected"));
      } else if (bundleResult.dropped) {
        reject(new BundleError("Bundle was accepted but never landed on-chain.", "dropped"));
      } else {
        reject(new BundleError("Unknown error sending bundle", "unknown"));
      }
    };

    const errorCallback = (error: Error) => {
      if (!error.message.includes("CANCELLED")) {
        reject(new BundleError(error.message, "errorCallback"));
      }
    };

    const timeout = setTimeout(() => {
      reset();
      reject(new BundleError("Timeout: No bundle result received within 10 seconds.", "timeout"));
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

class BundleError extends Error {
  code: string;

  constructor(message: string, code: string) {
    super(message);
    this.code = code;
    this.name = "BundleError";
  }
}
