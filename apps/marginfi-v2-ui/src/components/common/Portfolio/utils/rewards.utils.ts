import { SolanaJSONRPCError, VersionedTransaction } from "@solana/web3.js";

import { MarginfiClient, ProcessTransactionError, ProcessTransactionOpts } from "@mrgnlabs/marginfi-client-v2";
import { extractErrorString, MultiStepToastHandle, captureSentryException } from "@mrgnlabs/mrgn-utils";
import { SolanaTransaction } from "@mrgnlabs/mrgn-common";

export const executeCollectTxn = async (
  marginfiClient: MarginfiClient,
  actionTxn: SolanaTransaction,
  processOpts: ProcessTransactionOpts,
  setIsLoading: (isLoading: boolean) => void,
  closeDialog: () => void
) => {
  setIsLoading(true);
  const multiStepToast = new MultiStepToastHandle("Collecting rewards", [
    { label: "Signing transaction" },
    {
      label: "Collecting rewards",
    },
  ]);
  multiStepToast.start();

  try {
    const sig = await marginfiClient.processTransactions([actionTxn], {
      ...processOpts,
      callback: (index, success, sig, stepsToAdvance) =>
        success && multiStepToast.setSuccessAndNext(stepsToAdvance, sig),
    });
    multiStepToast.setSuccess();
    closeDialog();
    return sig;
  } catch (error) {
    console.log("error while collecting rewards");
    console.log(error);

    if (!(error instanceof ProcessTransactionError || error instanceof SolanaJSONRPCError)) {
      captureSentryException(error, JSON.stringify(error), {
        action: "Collect rewards",
        wallet: marginfiClient.wallet.publicKey.toBase58(),
      });
    }

    const msg = extractErrorString(error);
    multiStepToast.setFailed(msg);
  } finally {
    setIsLoading(false);
  }
};
