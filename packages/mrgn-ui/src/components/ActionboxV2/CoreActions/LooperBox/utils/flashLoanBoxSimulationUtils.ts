import { ExtendedBankInfo, ActionType, AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { Wallet } from "@mrgnlabs/mrgn-common";
import { ActionMethod, handleSimulationError } from "@mrgnlabs/mrgn-utils";
import { Bank, MarginfiAccountWrapper, MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";

import {
  ActionPreview,
  ActionSummary,
  calculateSimulatedActionPreview,
  SimulatedActionPreview,
} from "../../../sharedUtils";
import { VersionedTransaction } from "@solana/web3.js";

export interface CalculatePreviewProps {
  simulationResult?: SimulationResult;
  bank: ExtendedBankInfo;
  accountSummary: AccountSummary;
}

export interface SimulateActionProps {
  marginfiClient: MarginfiClient;
  actionMode: ActionType;
  actionTxn: VersionedTransaction | null;
  account: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
}

export function calculateSummary({ simulationResult, bank, accountSummary }: CalculatePreviewProps): ActionSummary {
  let simulationPreview: SimulatedActionPreview | null = null;

  if (simulationResult) {
    simulationPreview = calculateSimulatedActionPreview(simulationResult, bank);
  }

  const actionPreview = calculateActionPreview(bank, accountSummary);

  return {
    actionPreview,
    simulationPreview,
  } as ActionSummary;
}

export const getSimulationResult = async (props: SimulateActionProps) => {
  let actionMethod: ActionMethod | undefined = undefined;
  let simulationResult: SimulationResult | null = null;

  try {
    simulationResult = await simulateAction(props);
  } catch (error: any) {
    let actionString;
    switch (props.actionMode) {
      case ActionType.Loop:
        actionString = "Looping";
        break;
      case ActionType.RepayCollat:
        actionString = "Repaying Collateral";
        break;

      default:
        actionString = "The action";
    }
    actionMethod = handleSimulationError(error, props.bank, false, actionString);
  }

  return { simulationResult, actionMethod };
};

function calculateActionPreview(bank: ExtendedBankInfo, accountSummary: AccountSummary): ActionPreview {
  const positionAmount = bank?.isActive ? bank.position.amount : 0;
  const health = accountSummary.balance && accountSummary.healthFactor ? accountSummary.healthFactor : 1;
  const liquidationPrice =
    bank.isActive && bank.position.liquidationPrice && bank.position.liquidationPrice > 0.01
      ? bank.position.liquidationPrice
      : null;

  return {
    positionAmount,
    health,
    liquidationPrice,
  } as ActionPreview;
}

async function simulateAction({ marginfiClient, actionMode, account, bank, actionTxn }: SimulateActionProps) {
  let simulationResult: SimulationResult;

  switch (actionMode) {
    case ActionType.Loop && ActionType.RepayCollat:
      simulationResult = await simulateFlashLoan({ marginfiClient, account, bank, actionTxn });
      break;

    default:
      throw new Error("Unknown action mode");
  }

  return simulationResult;
}

interface SimulateFlashLoanProps {
  marginfiClient: MarginfiClient;
  account: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  actionTxn: VersionedTransaction | null;
}

async function simulateFlashLoan({ marginfiClient, account, bank, actionTxn }: SimulateFlashLoanProps) {
  let simulationResult: SimulationResult;

  if (actionTxn && marginfiClient) {
    const [mfiAccountData, bankData] = await marginfiClient.simulateTransactions(
      [actionTxn],
      [account.address, bank.address]
    );
    if (!mfiAccountData || !bankData) throw new Error("Failed to simulate flashloan");
    const previewBanks = marginfiClient.banks;
    previewBanks.set(
      bank.address.toBase58(),
      Bank.fromBuffer(bank.address, bankData, marginfiClient.program.idl, marginfiClient.feedIdMap)
    );
    const previewClient = new MarginfiClient(
      marginfiClient.config,
      marginfiClient.program,
      {} as Wallet,
      true,
      marginfiClient.group,
      marginfiClient.banks,
      marginfiClient.oraclePrices,
      marginfiClient.mintDatas,
      marginfiClient.feedIdMap
    );
    const previewMarginfiAccount = MarginfiAccountWrapper.fromAccountDataRaw(
      account.address,
      previewClient,
      mfiAccountData,
      marginfiClient.program.idl
    );
    simulationResult = {
      banks: previewBanks,
      marginfiAccount: previewMarginfiAccount,
    };

    return simulationResult;
  } else {
    throw new Error("Failed to simulate flashloan");
  }
}
