import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";

import { ExtendedBankInfo, ActionType, AccountSummary, ActiveBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { nativeToUi } from "@mrgnlabs/mrgn-common";
import { ActionMessageType, ActionProcessingError, handleSimulationError, isWholePosition } from "@mrgnlabs/mrgn-utils";
import { MarginfiAccountWrapper, SimulationResult } from "@mrgnlabs/marginfi-client-v2";

import {
  simulatedHealthFactor,
  simulatedPositionSize,
  simulatedCollateral,
  ActionSummary,
  ActionPreview,
  SimulatedActionPreview,
} from "~/components/action-box-v2/utils";

export interface CalculatePreviewProps {
  actionMode: ActionType;
  simulationResult?: SimulationResult;
  bank: ExtendedBankInfo;
  accountSummary: AccountSummary;
}

export interface SimulateActionProps {
  actionMode: ActionType;
  account: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  amount: number;
  txns: (VersionedTransaction | Transaction)[];
}

export function calculateSummary({
  simulationResult,
  bank,
  actionMode,
  accountSummary,
}: CalculatePreviewProps): ActionSummary {
  let simulationPreview: SimulatedActionPreview | null = null;

  if (simulationResult) {
    simulationPreview = calculateSimulatedActionPreview(simulationResult, bank);
  }

  const actionPreview = calculateActionPreview(bank, actionMode, accountSummary);

  return {
    actionPreview,
    simulationPreview,
  } as ActionSummary;
}

export const getLendSimulationResult = async (props: SimulateActionProps): Promise<SimulationResult> => {
  try {
    let mandatoryBanks: PublicKey[] = [props.bank.address];
    let excludedBanks: PublicKey[] = [];

    if (props.actionMode === ActionType.Withdraw && props.bank.isActive) {
      const isWhole = isWholePosition(props.bank, props.amount);
      mandatoryBanks = isWhole ? [] : mandatoryBanks;
      excludedBanks = isWhole ? [props.bank.address] : [];
    }

    return await props.account.simulateBorrowLendTransaction(props.txns, [props.bank.address], {
      enabled: false,
      mandatoryBanks,
      excludedBanks,
    });
  } catch (error: any) {
    const actionString = getActionString(props.actionMode);
    const actionMethod = handleSimulationError(error, props.bank, false, actionString);
    if (actionMethod) {
      throw new ActionProcessingError(actionMethod);
    } else {
      throw error;
    }
  }
};

export const getActionString = (actionMode: ActionType) => {
  let actionString;
  switch (actionMode) {
    case ActionType.Deposit:
      actionString = "Depositing";
      break;
    case ActionType.Withdraw:
      actionString = "Withdrawing";
      break;
    case ActionType.Loop:
      actionString = "Looping";
      break;
    case ActionType.Repay:
      actionString = "Repaying";
      break;
    case ActionType.Borrow:
      actionString = "Borrowing";
      break;
    default:
      actionString = "The action";
  }

  return actionString;
};

function calculateActionPreview(
  bank: ExtendedBankInfo,
  actionMode: ActionType,
  accountSummary: AccountSummary
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

  return {
    positionAmount,
    health,
    liquidationPrice,
    poolSize,
    bankCap,
  } as ActionPreview;
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
