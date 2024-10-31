import { VersionedTransaction } from "@solana/web3.js";

import { MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { extractErrorString, MultiStepToastHandle, captureSentryException } from "@mrgnlabs/mrgn-utils";

export const executeCollectTxn = async (
  marginfiClient: MarginfiClient,
  actionTxn: VersionedTransaction,
  setIsLoading: (isLoading: boolean) => void,
  setActionTxn: (actionTxn: VersionedTransaction | null) => void,
  closeDialog: () => void
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
    setActionTxn(null);
    closeDialog();
    return sig;
  } catch (error) {
    const msg = extractErrorString(error);
    multiStepToast.setFailed(msg);
    console.log(`Error while actiontype: ${msg}`);
    console.log(error);

    const walletAddress = marginfiClient.wallet.publicKey.toBase58();

    captureSentryException(error, msg, {
      action: "Collect rewards",
      wallet: walletAddress,
    });
  } finally {
    setIsLoading(false);
  }
};
