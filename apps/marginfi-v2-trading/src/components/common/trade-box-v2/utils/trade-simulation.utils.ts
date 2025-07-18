import { SimulationResult } from "@mrgnlabs/marginfi-client-v2";
import { ActionMessageType, handleSimulationError, TradeActionTxns } from "@mrgnlabs/mrgn-utils";
import { nativeToUi } from "@mrgnlabs/mrgn-common";
import { AccountSummary } from "@mrgnlabs/mrgn-state";

import { ArenaBank } from "~/types/trade-store.types";
import {
  ActionPreview,
  ActionSummary,
  SimulatedActionPreview,
  simulatedCollateral,
  simulatedHealthFactor,
  simulatedPositionSize,
} from "~/components/action-box-v2/utils";

import { SimulateActionProps } from "./trade-box.consts";

export const getSimulationResult = async (props: SimulateActionProps) => {
  let actionMethod: ActionMessageType | undefined = undefined;
  let simulationResult: SimulationResult | null = null;

  try {
    simulationResult = await simulateFlashLoan(props);
  } catch (error: any) {
    const actionString = "Looping";
    actionMethod = handleSimulationError(error, props.bank, true, actionString);
  }

  return { simulationResult, actionMethod };
};

async function simulateFlashLoan({ account, bank, txns }: SimulateActionProps) {
  let simulationResult: SimulationResult;

  if (txns.length > 0) {
    // todo: should we not inspect multiple banks?
    simulationResult = await account.simulateBorrowLendTransaction(txns, [bank.address]);
    return simulationResult;
  } else {
    console.error("Failed to simulate flashloan");
    throw new Error("Failed to simulate flashloan");
  }
}

export function calculateSummary({
  simulationResult,
  bank,
  accountSummary,
  actionTxns,
}: {
  simulationResult?: SimulationResult;
  bank: ArenaBank;
  accountSummary: AccountSummary;
  actionTxns: TradeActionTxns;
}): ActionSummary {
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

export function calculateSimulatedActionPreview(
  simulationResult: SimulationResult,
  bank: ArenaBank
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

function calculateActionPreview(
  bank: ArenaBank,
  accountSummary: AccountSummary,
  actionTxns: TradeActionTxns
): ActionPreview {
  const positionAmount = bank?.isActive ? bank.position.amount : 0;
  const health = accountSummary.balanceEquity && accountSummary.healthFactor ? accountSummary.healthFactor : 1;
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

  return {
    positionAmount,
    health,
    liquidationPrice,
    bankCap,
    priceImpactPct,
    slippageBps,
  } as ActionPreview;
}
