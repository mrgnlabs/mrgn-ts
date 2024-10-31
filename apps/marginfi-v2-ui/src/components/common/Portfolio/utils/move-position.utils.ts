import { MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { ActionMessageType, handleSimulationError } from "@mrgnlabs/mrgn-utils";
import { VersionedTransaction } from "@solana/web3.js";

export const getSimulationResult = async ({
  marginfiClient,
  txns,
  selectedBank,
}: {
  marginfiClient: MarginfiClient;
  txns: VersionedTransaction[];
  selectedBank: ExtendedBankInfo;
}): Promise<{
  simulationSucceeded: boolean;
  actionMethod: ActionMessageType | undefined;
}> => {
  let actionMethod: ActionMessageType | undefined = undefined;
  let simulationSucceeded = false;

  try {
    await marginfiClient?.simulateTransactions(txns, []);

    simulationSucceeded = true;
  } catch (error) {
    actionMethod = handleSimulationError(error, selectedBank, false, "movePosition");
  }

  return {
    simulationSucceeded,
    actionMethod,
  };
};
