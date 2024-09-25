import { ExtendedBankInfo, ActionType, AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { nativeToUi } from "@mrgnlabs/mrgn-common";
import { ActionMethod, handleSimulationError, isWholePosition } from "@mrgnlabs/mrgn-utils";
import { MarginfiAccountWrapper, SimulationResult } from "@mrgnlabs/marginfi-client-v2";

import { simulatedHealthFactor, simulatedPositionSize, simulatedCollateral } from "../../../../ActionboxV2/sharedUtils";

export interface ActionSummary {
  actionPreview: ActionPreview;
  simulationPreview: SimulatedActionPreview | null;
}

interface ActionPreview {
  health: number;
  liquidationPrice: number | null;
  positionAmount: number;
  poolSize: number;
  bankCap: number;
  priceImpactPct?: number;
  slippageBps?: number;
}

export interface SimulatedActionPreview {
  health: number;
  liquidationPrice: number | null;
  depositRate: number;
  borrowRate: number;
  positionAmount: number;
  availableCollateral: {
    ratio: number;
    amount: number;
  };
}

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

export const getSimulationResult = async (props: SimulateActionProps) => {
  let actionMethod: ActionMethod | undefined = undefined;
  let simulationResult: SimulationResult | null = null;

  try {
    simulationResult = await simulateAction(props);
  } catch (error: any) {
    let actionString;
    switch (props.actionMode) {
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
    actionMethod = handleSimulationError(error, props.bank, false, actionString);
  }

  return { simulationResult, actionMethod };
};

function calculateActionPreview(
  bank: ExtendedBankInfo,
  actionMode: ActionType,
  accountSummary: AccountSummary
): ActionPreview {
  const isLending = [ActionType.Deposit, ActionType.Withdraw].includes(actionMode);
  const positionAmount = bank?.isActive ? bank.position.amount : 0;
  const health = accountSummary.balance && accountSummary.healthFactor ? accountSummary.healthFactor : 1;
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

async function simulateAction({ actionMode, account, bank, amount }: SimulateActionProps) {
  let simulationResult: SimulationResult;

  // TODO: new simulation method
  switch (actionMode) {
    case ActionType.Deposit:
      simulationResult = await account.simulateDeposit(amount, bank.address);
      break;
    case ActionType.Withdraw:
      simulationResult = null as any;
      // simulationResult = await account.simulateWithdraw(
      //   amount,
      //   bank.address,
      //   bank.isActive && isWholePosition(bank, amount)
      // );
      break;
    case ActionType.Borrow:
      simulationResult = null as any;
      // simulationResult =  await account.simulateBorrow(amount, bank.address);
      break;
    case ActionType.Repay:
      simulationResult = await account.simulateRepay(
        amount,
        bank.address,
        bank.isActive && isWholePosition(bank, amount)
      );
      break;
    default:
      throw new Error("Unknown action mode");
  }

  return simulationResult;
}
