import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";
import { QuoteResponse } from "@jup-ag/api";

import { ExtendedBankInfo, AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { nativeToUi } from "@mrgnlabs/mrgn-common";
import { ActionProcessingError, ActionTxns, handleSimulationError, isWholePosition } from "@mrgnlabs/mrgn-utils";
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
  actionTxns: ActionTxns;
  actionQuote?: QuoteResponse | null;
}

export interface SimulateRepayActionProps {
  txns: (VersionedTransaction | Transaction)[];
  account: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  amount: number;
}

export function calculateSummary({
  simulationResult,
  bank,
  accountSummary,
  actionTxns,
  actionQuote,
}: CalculatePreviewProps): ActionSummary {
  let simulationPreview: SimulatedActionPreview | null = null;

  if (simulationResult) {
    simulationPreview = calculateSimulatedActionPreview(simulationResult, bank);
  }

  const actionPreview = calculateActionPreview(bank, accountSummary, actionTxns, actionQuote);

  return {
    actionPreview,
    simulationPreview,
  } as ActionSummary;
}

export const getRepaySimulationResult = async (props: SimulateRepayActionProps) => {
  try {
    let mandatoryBanks: PublicKey[] = [];
    let excludedBanks: PublicKey[] = [];
    const isWhole = isWholePosition(props.bank as unknown as any, props.amount);
    console.log("isWhole", isWhole);
    console.log("bank.address", props.bank.address);
    console.log("props.amount", props.amount);
    console.log("isActive", props.bank.isActive);

    if (props.bank.isActive) {
      mandatoryBanks = isWhole ? [] : [props.bank.address];
      excludedBanks = isWhole ? [props.bank.address] : [];
    }

    console.log("mandatoryBanks", mandatoryBanks);
    console.log("excludedBanks", excludedBanks);

    return await props.account.simulateBorrowLendTransaction(props.txns, [props.bank.address], {
      enabled: true,
      mandatoryBanks,
      excludedBanks,
    });
  } catch (error: any) {
    const actionString = "Repaying Collateral";
    const actionMethod = handleSimulationError(error, props.bank, false, actionString);
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
  actionTxns: ActionTxns,
  actionQuote?: QuoteResponse | null
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

  const priceImpactPct = actionQuote?.priceImpactPct;
  const slippageBps = actionQuote?.slippageBps;

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
