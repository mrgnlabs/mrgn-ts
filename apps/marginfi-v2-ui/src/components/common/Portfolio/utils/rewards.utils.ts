import { MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { VersionedTransaction } from "@solana/web3.js";

export const executeCollectTxn = async (marginfiClient: MarginfiClient, actionTxn: VersionedTransaction) => {
  const sig = await marginfiClient.processTransaction(actionTxn);

  return sig;
};
// TODO: error handling here
