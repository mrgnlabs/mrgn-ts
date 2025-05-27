import { Transaction, VersionedTransaction } from "@solana/web3.js";

import { ExtendedBankInfo, AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { nativeToUi } from "@mrgnlabs/mrgn-common";
import { ActionProcessingError, handleSimulationError, LoopActionTxns } from "@mrgnlabs/mrgn-utils";
import { MarginfiAccountWrapper, SimulationResult } from "@mrgnlabs/marginfi-client-v2";

import {
  ActionSummary,
  SimulatedActionPreview,
  calculateSimulatedActionPreview,
  ActionPreview,
} from "~/components/action-box-v2/utils";

export interface CalculatePreviewProps {
  simulationResult?: SimulationResult;
  bank: ExtendedBankInfo;
  accountSummary: AccountSummary;
  actionTxns: LoopActionTxns;
}

export interface SimulateActionProps {
  txns: (VersionedTransaction | Transaction)[];
  account: MarginfiAccountWrapper;
  banks: ExtendedBankInfo[];
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

export const getSimulationResult = async (props: SimulateActionProps) => {
  try {
    const bankAddresses = props.banks.map((bank) => bank.address);
    return await props.account.simulateBorrowLendTransaction(props.txns, bankAddresses, {
      enabled: false,
      mandatoryBanks: bankAddresses,
      excludedBanks: [],
    });
  } catch (error: any) {
    const actionString = "Looping";
    const actionMethod = handleSimulationError(error, props.banks[0], false, actionString);
    if (actionMethod) {
      throw new ActionProcessingError(actionMethod);
    } else {
      throw error;
    }
  }
};

function calculateActionPreview(
  bank: ExtendedBankInfo,
  accountSummary: AccountSummary,
  actionTxns: LoopActionTxns
): ActionPreview {
  const positionAmount = bank?.isActive ? bank.position.amount : 0;
  const health =
    accountSummary.balance && accountSummary.healthFactor
      ? accountSummary.healthFactor
      : { riskEngineHealth: 1, computedHealth: 1 };
  const liquidationPrice =
    bank.isActive && bank.position.liquidationPrice && bank.position.liquidationPrice > 0.01
      ? bank.position.liquidationPrice
      : null;

  const bankCap = nativeToUi(
    false ? bank.info.rawBank.config.depositLimit : bank.info.rawBank.config.borrowLimit,
    bank.info.state.mintDecimals
  );

  const priceImpactPct = actionTxns.actionQuote?.priceImpactPct;
  const slippageBps = actionTxns.actionQuote?.slippageBps;

  const actionPreview: ActionPreview = {
    positionAmount,
    health,
    liquidationPrice,
    bankCap,
    priceImpactPct: priceImpactPct ? Number(priceImpactPct) : undefined,
    slippageBps,
  };
  return actionPreview;
}
