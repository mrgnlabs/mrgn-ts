import { sleep } from "@mrgnlabs/mrgn-common";

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
    if (sendBundleResult.error) throw new SendBundleError(sendBundleResult.error.message, sendBundleResult?.bundleId);
    const bundleId = sendBundleResult.bundleId;

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
      console.log("bundleError:", sendBundleResult.error);
      console.log("tempBundleId:", tempBundleId);
      if (sendBundleResult.error.message.includes("already processed")) {
        return tempBundleId ?? "0x0"; // todo add proper bundle id
      }

      throw new SendBundleError(`${API_ERROR_TAG} ${sendBundleResult.error.message}`);
    }

    const bundleId = sendBundleResult.result as string;
    await sleep(500);

    for (let attempt = 0; attempt < 10; attempt++) {
      const getBundleStatusInFlightResponse = await fetch("https://mainnet.block-engine.jito.wtf/api/v1/bundles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "getInflightBundleStatuses",
          params: [[bundleId]],
        }),
      });

      const getBundleStatusInFlightResult = await getBundleStatusInFlightResponse.json();

      if (getBundleStatusInFlightResult.error) throw new Error(getBundleStatusInFlightResult.error.message);

      const status = getBundleStatusInFlightResult?.result?.value[0]?.status;

      /**
       * Bundle status values:
       * - Failed: All regions marked bundle as failed, not forwarded
       * - Pending: Bundle has not failed, landed, or been deemed invalid
       * - Landed: Bundle successfully landed on-chain (verified via RPC/bundles_landed table)
       * - Invalid: Bundle is no longer in the system
       */
      if (status === "Failed") {
        throw new SendBundleError(`${API_ERROR_TAG} unknown error`);
      } else if (status === "Landed") {
        return bundleId;
      }

      await sleep(500); // Wait before retrying
    }
  } catch (error) {
    if (throwError) {
      if (error instanceof SendBundleError) throw error;

      throw new SendBundleError(`${API_ERROR_TAG} unknown error`);
    }
  }
}
