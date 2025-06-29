import {
  Bank,
  BankMap,
  MarginfiAccountWrapper,
  MarginfiClient,
  MarginRequirementType,
  SimulationResult,
} from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import { Wallet } from "@mrgnlabs/mrgn-common";
import { ActionMessageType, handleSimulationError } from "@mrgnlabs/mrgn-utils";
import { Transaction, VersionedTransaction } from "@solana/web3.js";

export const getSimulationResult = async ({
  marginfiClient,
  txns,
  selectedBank,
  selectedMarginfiAccount,
}: {
  marginfiClient: MarginfiClient;
  txns: (Transaction | VersionedTransaction)[];
  selectedBank: ExtendedBankInfo;
  selectedMarginfiAccount: MarginfiAccountWrapper;
}): Promise<{
  simulationResult: SimulationResult | null;
  actionMethod: ActionMessageType | undefined;
}> => {
  let actionMethod: ActionMessageType | undefined = undefined;
  let simulationResult: {
    banks: BankMap;
    marginfiAccount: MarginfiAccountWrapper;
  } | null = null;

  try {
    const [mfiAccountData, bankData] = await marginfiClient?.simulateTransactions(txns, [
      selectedMarginfiAccount.address,
      selectedBank.address,
    ]);

    if (!mfiAccountData || !bankData) throw new Error("Failed to simulate");

    const previewBanks = marginfiClient.banks;
    if (!previewBanks) throw new Error("Failed to simulate");
    previewBanks.set(
      selectedBank.address.toBase58(),
      Bank.fromBuffer(selectedBank.address, bankData, marginfiClient.program.idl, marginfiClient.feedIdMap)
    );
    const previewClient = new MarginfiClient(
      marginfiClient.config,
      marginfiClient.program,
      {} as Wallet,
      true,
      marginfiClient.group,
      previewBanks,
      marginfiClient.oraclePrices,
      marginfiClient.mintDatas,
      marginfiClient.feedIdMap
    );

    const previewMarginfiAccount = MarginfiAccountWrapper.fromAccountDataRaw(
      marginfiClient.wallet.publicKey,
      previewClient,
      mfiAccountData,
      marginfiClient.program.idl
    );

    simulationResult = {
      banks: previewBanks,
      marginfiAccount: previewMarginfiAccount,
    };
  } catch (error) {
    console.log("error", error);
    actionMethod = handleSimulationError(error, selectedBank, false, "movePosition");
  }

  return {
    simulationResult,
    actionMethod,
  };
};

/*
  Calculates the health factor of a simulation result.
  The health factor is the ratio of the maintenance assets to the initial assets.
*/
export function simulatedHealthFactor(simulationResult: SimulationResult) {
  const { assets, liabilities } = simulationResult.marginfiAccount.computeHealthComponents(
    MarginRequirementType.Maintenance
  );

  const health = assets.minus(liabilities).dividedBy(assets).toNumber();

  return isNaN(health) ? 0 : health;
}
