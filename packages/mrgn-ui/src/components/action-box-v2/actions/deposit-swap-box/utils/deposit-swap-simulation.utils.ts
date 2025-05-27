import { Transaction, VersionedTransaction } from "@solana/web3.js";

import { MarginfiAccountWrapper, SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { AccountSummary, ActionType, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { handleSimulationError, DepositSwapActionTxns, ActionProcessingError } from "@mrgnlabs/mrgn-utils";
import { nativeToUi } from "@mrgnlabs/mrgn-common";

import {
  ActionPreview,
  ActionSummary,
  SimulatedActionPreview,
  simulatedCollateral,
  simulatedHealthFactor,
  simulatedPositionSize,
} from "~/components/action-box-v2/utils";

export interface SimulateActionProps {
  txns: (VersionedTransaction | Transaction)[];
  bank: ExtendedBankInfo;
  account: MarginfiAccountWrapper;
}

export interface CalculatePreviewProps {
  actionMode: ActionType;
  simulationResult?: SimulationResult;
  bank: ExtendedBankInfo;
  accountSummary: AccountSummary;
  actionTxns: DepositSwapActionTxns;
}

export const getSimulationResult = async (props: SimulateActionProps) => {
  try {
    return await props.account.simulateBorrowLendTransaction(props.txns, [props.bank.address]);
  } catch (error: any) {
    const actionString = "Deposit Swapping";
    const actionMethod = handleSimulationError(error, props.bank, false, actionString);
    if (actionMethod) {
      throw new ActionProcessingError(actionMethod);
    } else {
      throw error;
    }
  }
};

export function calculateSummary({
  simulationResult,
  bank,
  actionMode,
  accountSummary,
  actionTxns,
}: CalculatePreviewProps): ActionSummary {
  let simulationPreview: SimulatedActionPreview | null = null;

  if (simulationResult) {
    simulationPreview = calculateSimulatedActionPreview(simulationResult, bank);
  }

  const actionPreview = calculateActionPreview(bank, actionMode, accountSummary, actionTxns);

  const actionSummary: ActionSummary = {
    actionPreview,
    simulationPreview,
  };
  return actionSummary;
}

function calculateActionPreview(
  bank: ExtendedBankInfo,
  actionMode: ActionType,
  accountSummary: AccountSummary,
  actionTxns: DepositSwapActionTxns
): ActionPreview {
  const isLending = [ActionType.Deposit, ActionType.Withdraw].includes(actionMode);
  const positionAmount = bank?.isActive ? bank.position.amount : 0;
  const health =
    accountSummary.balance && accountSummary.healthFactor
      ? accountSummary.healthFactor
      : { riskEngineHealth: 1, computedHealth: 1 };
  const liquidationPrice =
    bank.isActive && bank.position.liquidationPrice && bank.position.liquidationPrice > 0.01
      ? bank.position.liquidationPrice
      : null;

  const poolSize = isLending
    ? bank.info.state.totalDeposits
    : Math.max(
        0,
        Math.min(bank.info.state.totalDeposits, bank.info.rawBank.config.borrowLimit.toNumber()) -
          bank.info.state.totalBorrows
      );
  const bankCap = nativeToUi(
    isLending ? bank.info.rawBank.config.depositLimit : bank.info.rawBank.config.borrowLimit,
    bank.info.state.mintDecimals
  );

  const slippageBps = actionTxns.actionQuote?.slippageBps;
  const priceImpactPct = actionTxns.actionQuote?.priceImpactPct;

  const actionPreview: ActionPreview = {
    positionAmount,
    health,
    liquidationPrice,
    poolSize,
    bankCap,
    slippageBps,
    priceImpactPct: priceImpactPct ? Number(priceImpactPct) : undefined,
  };
  return actionPreview;
}

function calculateSimulatedActionPreview(
  simulationResult: SimulationResult,
  bank: ExtendedBankInfo
): SimulatedActionPreview {
  const health = simulatedHealthFactor(simulationResult);
  const positionAmount = simulatedPositionSize(simulationResult, bank);
  const availableCollateral = simulatedCollateral(simulationResult);

  const liquidationPrice = simulationResult.marginfiAccount.computeLiquidationPriceForBank(bank.address);
  const { lendingRate, borrowingRate } = simulationResult.banks.get(bank.address.toBase58())!.computeInterestRates();

  return {
    health,
    liquidationPrice,
    depositRate: lendingRate.toNumber(),
    borrowRate: borrowingRate.toNumber(),
    positionAmount,
    availableCollateral,
  };
}
