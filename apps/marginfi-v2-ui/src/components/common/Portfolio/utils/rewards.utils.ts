import * as Sentry from "@sentry/nextjs";

import { VersionedTransaction } from "@solana/web3.js";

import { MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { extractErrorString, MultiStepToastHandle } from "@mrgnlabs/mrgn-utils";

const captureException = (error: any, msg: string, tags: Record<string, string | undefined>) => {
  if (msg.includes("User rejected")) return;
  Sentry.setTags({
    ...tags,
    customMessage: msg,
  });
  Sentry.captureException(error);
};

export const executeCollectTxn = async (
  marginfiClient: MarginfiClient,
  actionTxn: VersionedTransaction,
  setIsLoading: (isLoading: boolean) => void
) => {
  setIsLoading(true);
  const multiStepToast = new MultiStepToastHandle("Collecting rewards", [
    {
      label: "Executing transaction",
    },
  ]);
  multiStepToast.start();

  try {
    const sig = await marginfiClient.processTransaction(actionTxn);
    multiStepToast.setSuccessAndNext();

    return sig;
  } catch (error) {
    const msg = extractErrorString(error);
    multiStepToast.setFailed(msg);
    console.log(`Error while actiontype: ${msg}`);
    console.log(error);

    const walletAddress = marginfiClient.wallet.publicKey.toBase58();

    captureException(error, msg, {
      action: "Collect rewards",
      wallet: walletAddress,
    });
  } finally {
    setIsLoading(false);
  }
};
