import { Transaction, VersionedTransaction } from "@solana/web3.js";

import { MarginfiClient, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo, AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { LST_MINT, getAssociatedTokenAddressSync } from "@mrgnlabs/mrgn-common";
import { ActionMessageType, handleSimulationError } from "@mrgnlabs/mrgn-utils";

import {
  ActionPreview,
  ActionSummary,
  calculateSimulatedActionPreview,
  SimulatedActionPreview,
} from "~/components/action-box-v2/utils";

export interface SimulateActionProps {
  marginfiClient: MarginfiClient;
  txns: (VersionedTransaction | Transaction)[];
  selectedBank: ExtendedBankInfo;
}

export interface CalculatePreviewProps {
  simulationResult?: SimulationResult;
  bank: ExtendedBankInfo;
  accountSummary: AccountSummary;
  actionTxns: any;
}

export function calculateSummary({
  simulationResult,
  bank,
  accountSummary,
  actionTxns,
}: CalculatePreviewProps): ActionSummary {
  let simulationPreview: SimulatedActionPreview | null = null;

  if (simulationResult) {
    simulationPreview = calculateSimulatedActionPreview(simulationResult, bank);
  }

  const actionPreview = calculateActionPreview(bank, accountSummary, actionTxns);

  return {
    actionPreview,
    simulationPreview,
  } as ActionSummary;
}

/*
outputamount, slippage, priceimpact
*/
function calculateActionPreview(
  bank: ExtendedBankInfo,
  accountSummary: AccountSummary,
  actionTxns: (Transaction | VersionedTransaction)[]
): ActionPreview {
  const positionAmount = bank?.isActive ? bank.position.amount : 0;

  const priceImpactPct = 0;
  const slippageBps = 0;

  return {
    positionAmount,
    priceImpactPct,
    slippageBps,
  } as ActionPreview;
}

export const getSimulationResult = async ({ marginfiClient, txns, selectedBank }: SimulateActionProps) => {
  const ataLst = getAssociatedTokenAddressSync(LST_MINT, marginfiClient.wallet.publicKey);
  let actionMethod: ActionMessageType | undefined = undefined;
  let simulationSucceeded = false;

  try {
    const [lstAta] = await marginfiClient.simulateTransactions(txns, [ataLst]); // can we detect lst balance difference?
    if (!lstAta) throw new Error("Failed to simulate stake transaction");

    simulationSucceeded = true;
  } catch (error) {
    actionMethod = handleSimulationError(error, selectedBank, false, "stake");
  }

  return { simulationSucceeded, actionMethod };
};
