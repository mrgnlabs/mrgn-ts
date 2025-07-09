import { Commitment, Connection } from "@solana/web3.js";

import { setTimeoutPromise, sleep } from "@mrgnlabs/mrgn-common";

export class SendBundleError extends Error {
  public readonly bundleId?: string;

  constructor(message: string, bundleId?: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype); // Restore prototype chain
    this.bundleId = bundleId;

    Error.captureStackTrace(this, this.constructor);
  }
}

const GRPC_ERROR_TAG = "GRPC bundle failed:";

export async function sendTransactionAsGrpcBundle(
  connection: Connection,
  base58Txs: string[],
  throwError = false
): Promise<string | undefined> {
  try {
    const sendBundleResponse = await fetch("/api/bundles/sendBundle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactions: base58Txs,
      }),
    });

    const sendBundleResult = await sendBundleResponse.json();
    if (sendBundleResult.error) throw new SendBundleError(sendBundleResult.error, sendBundleResult?.bundleId);
    const bundleId = sendBundleResult.bundleId;

    // confirm bundle
    try {
      await confirmBundle(connection, bundleId);
    } catch (error) {
      return bundleId;
    }

    return bundleId;
  } catch (error) {
    if (throwError) {
      if (error instanceof SendBundleError) throw error;
      throw new SendBundleError(`${GRPC_ERROR_TAG} unknown error`);
    }
  }
}

const API_ERROR_TAG = "API bundle failed:";

export async function sendTransactionAsBundle(
  connection: Connection,
  base58Txs: string[],
  throwError = false,
  tempBundleId?: string
): Promise<string | undefined> {
  try {
    const sendBundleResponse = await fetch("https://mainnet.block-engine.jito.wtf/api/v1/bundles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "sendBundle",
        params: [base58Txs],
      }),
    });

    const sendBundleResult = await sendBundleResponse.json();
    if (sendBundleResult.error) {
      if (sendBundleResult.error.message.includes("already processed")) {
        return tempBundleId ?? "0x0"; // todo add proper bundle id
      }

      throw new SendBundleError(`${API_ERROR_TAG} ${sendBundleResult.error.message}`);
    }

    const bundleId = sendBundleResult.result as string;
    await sleep(500);

    for (let attempt = 0; attempt < 10; attempt++) {
      const getBundleStatusResponse = await fetch("https://mainnet.block-engine.jito.wtf/api/v1/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getBundleStatuses",
          params: [[bundleId]],
        }),
      });

      const getBundleStatusResult = await getBundleStatusResponse.json();

      let status = getBundleStatusResult.result?.value[0]?.confirmation_status;

      if (getBundleStatusResult.result?.value[0]?.err) {
        const error = getBundleStatusResult.result?.value[0].err;
        if (error?.Ok !== null) {
          throw new Error(error);
        }
      }

      /**
       * Bundle status values:
       * - Failed: All regions marked bundle as failed, not forwarded
       * - Pending: Bundle has not failed, landed, or been deemed invalid
       * - Landed: Bundle successfully landed on-chain (verified via RPC/bundles_landed table)
       * - Invalid: Bundle is no longer in the system
       */
      if (status === "Failed") {
        throw new SendBundleError(`${API_ERROR_TAG} unknown error`);
      } else if (status === "confirmed" || status === "finalized") {
        await confirmBundle(connection, bundleId);
        return bundleId;
      }

      await sleep(1000); // Wait before retrying
    }
  } catch (error) {
    if (throwError) {
      if (error instanceof SendBundleError) throw error;

      throw new SendBundleError(`${API_ERROR_TAG} unknown error`);
    }
  }
}

export async function confirmBundle(connection: Connection, bundleId: string, commitment: Commitment = "confirmed") {
  const getStatus = async () => {
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      await sleep(2000);
      attempts += 1;

      const getBundleStatus = await fetch("https://mainnet.block-engine.jito.wtf/api/v1/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getBundleStatuses",
          params: [[bundleId]],
        }),
      });

      const bundleStatus = await getBundleStatus.json();
      if (bundleStatus.result.value) {
        if (bundleStatus.result.value[0].bundle_id) {
          const commitmentStatus = bundleStatus.result.value[0].confirmation_status;

          if (commitmentStatus === "confirmed") {
            return bundleId;
          }
        }
      }

      console.log("🔄 Waiting for confirmation...");
    }
    console.log("❌ Transaction failed to confirm in time.");
    throw new Error("Transaction failed to confirm in time.");
  };

  const result = await Promise.race([getStatus(), setTimeoutPromise(20000, `Transaction failed to confirm in time.`)]);

  if (result instanceof Error) {
    throw result;
  }

  return result;
}
