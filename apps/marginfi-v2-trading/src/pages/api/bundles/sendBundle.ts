import { NextApiRequest, NextApiResponse } from "next";
import { SearcherClient, searcherClient } from "./jito/sdk/block-engine/searcher";
import { Bundle } from "./jito/sdk/block-engine/types";
import { bs58 } from "@coral-xyz/anchor/dist/cjs/utils/bytes";
import { VersionedTransaction } from "@solana/web3.js";
import { isError } from "./jito/sdk/block-engine/utils";
import { BundleResult } from "./jito/gen/block-engine/bundle";
import { sleep } from "@mrgnlabs/mrgn-common";

const JITO_ENDPOINT = "mainnet.block-engine.jito.wtf";
const TIMEOUT_DURATION = 25000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { transactions } = req.body;
  if (!Array.isArray(transactions) || transactions.some((tx) => typeof tx !== "string")) {
    return res.status(400).json({ error: "Invalid transactions format" });
  }

  try {
    const grpcClient = searcherClient(JITO_ENDPOINT);

    const next_leader = await grpcClient.getNextScheduledLeader();
    const num_slots = next_leader.nextLeaderSlot - next_leader.currentSlot;

    if (num_slots > 50) {
      throw new Error("Timeout: No leader slot found within 50 slots.");
    }

    const txs = transactions.map((tx) => VersionedTransaction.deserialize(bs58.decode(tx)));
    const bundle = new Bundle([], txs.length);

    if (isError(bundle.addTransactions(...txs))) {
      throw new Error("Error adding transactions to bundle");
    }

    const bundleResult = await Promise.race([
      sendBundleWithRetry(bundle),
      setTimeoutPromise(TIMEOUT_DURATION, `Timeout: Stopped after ${TIMEOUT_DURATION / 1000} seconds.`),
    ]);

    if (bundleResult instanceof Error) {
      throw bundleResult;
    }

    return res.status(200).json({ bundleId: bundleResult });
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
  }
}

function setTimeoutPromise(duration: number, message: string): Promise<Error> {
  return new Promise((_, reject) => setTimeout(() => reject(new Error(message)), duration));
}

async function sendBundleWithRetry(bundle: Bundle): Promise<string> {
  let attempts = 0;
  const maxAttempts = 10; // Limit retries to prevent infinite loops
  const grpcClient = searcherClient(JITO_ENDPOINT);
  let bundleId = "";

  while (attempts < maxAttempts) {
    attempts += 1;

    try {
      const newBundleId = await grpcClient.sendBundle(bundle);
      if (newBundleId) {
        bundleId = newBundleId;
      }

      await getBundleResult(grpcClient);
      attempts = maxAttempts;
      return bundleId;
    } catch (error) {
      if (isAlreadyProcessedError(error)) {
        return bundleId;
      } else if (error instanceof BundleError && error.code === "timeout") {
        console.log("Timeout error in getBundleResult; retrying...");
      } else {
        throw error;
      }
    }

    await sleep(500);
  }

  throw new Error("Failed to send bundle after multiple attempts.");
}

function isAlreadyProcessedError(error: unknown): boolean {
  return (
    error instanceof Object &&
    "details" in error &&
    typeof error.details === "string" &&
    error.details.includes("already processed transaction")
  );
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
      reject(new BundleError("Timeout: No bundle result received within 3 seconds.", "timeout"));
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