import React from "react";
import Image from "next/image";
import { createJupiterApiClient } from "@jup-ag/api";
import { AddressLookupTableAccount } from "@solana/web3.js";

import { ExtendedBankInfo, ActionType, AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  Wallet,
  nativeToUi,
  numeralFormatter,
  percentFormatter,
  usdFormatter,
  clampedNumeralFormatter,
} from "@mrgnlabs/mrgn-common";
import { isWholePosition, RepayWithCollatOptions } from "@mrgnlabs/mrgn-utils";
import {
  Bank,
  MarginRequirementType,
  MarginfiAccountWrapper,
  MarginfiClient,
  SimulationResult,
  getPriceWithConfidence,
} from "@mrgnlabs/marginfi-client-v2";

import { cn, deserializeInstruction, getAdressLookupTableAccounts } from "~/utils";

import { IconAlertTriangle, IconArrowRight, IconPyth, IconSwitchboard } from "~/components/ui/icons";
import { Skeleton } from "~/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { REDUCE_ONLY_BANKS } from "~/components/desktop/AssetList/utils";
import { simulatedCollateral, simulatedHealthFactor, simulatedPositionSize } from "../../../sharedUtils";

export interface SimulateActionProps {
  marginfiClient: MarginfiClient;
  actionMode: ActionType;
  account: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  amount: number;
  repayWithCollatOptions?: RepayWithCollatOptions;
}

export interface ActionSummary {
  actionPreview: ActionPreview;
  simulationPreview: SimulatedActionPreview | null;
}

export interface ActionPreview {
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
  repayWithCollatOptions?: RepayWithCollatOptions;
  accountSummary: AccountSummary;
  isLoading: boolean;
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

export function calculateActionPreview(
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
  };
}

export function calculateSimulatedActionPreview(
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

export async function simulateAction({ actionMode, account, bank, amount }: SimulateActionProps) {
  let simulationResult: SimulationResult;

  switch (actionMode) {
    case ActionType.Deposit:
      simulationResult = await account.simulateDeposit(amount, bank.address);
      break;
    case ActionType.Withdraw:
      simulationResult = await account.simulateWithdraw(
        amount,
        bank.address,
        bank.isActive && isWholePosition(bank, amount)
      );
      break;
    case ActionType.Borrow:
      simulationResult = await account.simulateBorrow(amount, bank.address);
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

export interface PreviewStat {
  label: string;
  color?: "SUCCESS" | "ALERT" | "DESTRUCTIVE";
  value: () => React.JSX.Element;
}

export function generateStats(
  preview: ActionPreview,
  bank: ExtendedBankInfo,
  isLending: boolean,
  isLoading: boolean,
  isRepayWithCollat: boolean
) {
  const stats = [];

  stats.push(getAmountStat(preview.currentPositionAmount, bank, preview.simulationPreview?.positionAmount));
  if (preview.priceImpactPct) stats.push(getPriceImpactStat(preview.priceImpactPct));
  if (preview.slippageBps) stats.push(getSlippageStat(preview.slippageBps));

  stats.push(getHealthStat(preview.healthFactor, isLoading, preview.simulationPreview?.health));

  if (preview.simulationPreview?.liquidationPrice)
    stats.push(getLiquidationStat(bank, isLoading, preview.simulationPreview?.liquidationPrice));

  stats.push(getPoolSizeStat(preview.bankCap, bank, isLending));
  stats.push(getBankTypeStat(bank));
  stats.push(getOracleStat(bank));

  return stats;
}

function getJupFeeStat(): PreviewStat {
  return {
    label: "Platform fee",
    value: () => <>0.25%</>,
  };
}

function getAmountStat(currentAmount: number, bank: ExtendedBankInfo, simulatedAmount?: number): PreviewStat {
  return {
    label: "Your amount",
    value: () => (
      <>
        {clampedNumeralFormatter(currentAmount)} {bank.meta.tokenSymbol}
        {simulatedAmount !== undefined ? <IconArrowRight width={12} height={12} /> : <></>}
        {simulatedAmount !== undefined ? clampedNumeralFormatter(simulatedAmount) + " " + bank.meta.tokenSymbol : <></>}
      </>
    ),
  };
}

function getPriceImpactStat(priceImpactPct: number): PreviewStat {
  return {
    label: "Price impact",
    color: priceImpactPct > 0.01 && priceImpactPct > 0.05 ? "DESTRUCTIVE" : "ALERT",
    value: () => <>{percentFormatter.format(priceImpactPct)}</>,
  };
}

function getSlippageStat(slippageBps: number): PreviewStat {
  return {
    label: "Slippage",
    color: slippageBps > 500 ? "ALERT" : undefined,
    value: () => <> {percentFormatter.format(slippageBps / 10000)}</>,
  };
}

function getHealthStat(health: number, isLoading: boolean, simulationHealth?: number): PreviewStat {
  let computeHealth = simulationHealth ? (isNaN(simulationHealth) ? health : simulationHealth) : health;
  const healthColor = computeHealth >= 0.5 ? "SUCCESS" : computeHealth >= 0.25 ? "ALERT" : "DESTRUCTIVE";

  return {
    label: "Health",
    color: healthColor,
    value: () => (
      <>
        {health && percentFormatter.format(health)}
        {simulationHealth ? <IconArrowRight width={12} height={12} /> : ""}
        {isLoading ? (
          <Skeleton className="h-4 w-[45px] bg-[#373F45]" />
        ) : simulationHealth ? (
          percentFormatter.format(simulationHealth)
        ) : (
          ""
        )}
      </>
    ),
  };
}

function getLiquidationStat(bank: ExtendedBankInfo, isLoading: boolean, simulationLiq: number | null): PreviewStat {
  const price = bank ? getPriceWithConfidence(bank.info.oraclePrice, false).price.toNumber() : 0;

  const computeLiquidation = simulationLiq
    ? isNaN(simulationLiq)
      ? bank.isActive && bank.position.liquidationPrice
      : simulationLiq
    : bank.isActive && bank.position.liquidationPrice;
  // const healthColor = computeHealth >= 0.5 ? "SUCCESS" : computeHealth >= 0.25 ? "ALERT" : "DESTRUCTIVE";

  const healthColor = computeLiquidation
    ? computeLiquidation / price >= 0.5
      ? "SUCCESS"
      : computeLiquidation / price >= 0.25
      ? "ALERT"
      : "DESTRUCTIVE"
    : undefined;

  return {
    label: "Liquidation price",
    color: healthColor,
    value: () => (
      <>
        {bank.isActive &&
          bank.position.liquidationPrice &&
          bank.position.liquidationPrice > 0.01 &&
          usdFormatter.format(bank.position.liquidationPrice)}
        {bank.isActive && bank.position.liquidationPrice && simulationLiq && <IconArrowRight width={12} height={12} />}
        {isLoading ? (
          <Skeleton className="h-4 w-[45px] bg-[#373F45]" />
        ) : simulationLiq ? (
          usdFormatter.format(simulationLiq)
        ) : (
          ""
        )}
      </>
    ),
  };
}

function getPoolSizeStat(bankCap: number, bank: ExtendedBankInfo, isLending: boolean): PreviewStat {
  const isReduceOnly = bank?.meta?.tokenSymbol ? REDUCE_ONLY_BANKS.includes(bank?.meta.tokenSymbol) : false;

  const isBankHigh = (isLending ? bank.info.state.totalDeposits : bank.info.state.totalBorrows) >= bankCap * 0.9;
  const isBankFilled = (isLending ? bank.info.state.totalDeposits : bank.info.state.totalBorrows) >= bankCap * 0.99999;

  return {
    label: "Pool size",
    value: () => (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                "flex items-center justify-end gap-1.5 text-white",
                (isReduceOnly || isBankHigh) && "text-warning",
                isBankFilled && "text-destructive-foreground"
              )}
            >
              {numeralFormatter(
                isLending
                  ? bank.info.state.totalDeposits
                  : Math.max(
                      0,
                      Math.min(bank.info.state.totalDeposits, bank.info.rawBank.config.borrowLimit.toNumber()) -
                        bank.info.state.totalBorrows
                    )
              )}

              {(isReduceOnly || isBankHigh || isBankFilled) && <IconAlertTriangle size={14} />}
            </span>
          </TooltipTrigger>
          <TooltipContent>
            <div className="flex flex-col items-start gap-1">
              <h4 className="text-base flex items-center gap-1.5">
                {isReduceOnly ? (
                  <>
                    <IconAlertTriangle size={16} /> Reduce Only
                  </>
                ) : (
                  isBankHigh &&
                  (isBankFilled ? (
                    <>
                      <IconAlertTriangle size={16} /> Limit Reached
                    </>
                  ) : (
                    <>
                      <IconAlertTriangle size={16} /> Approaching Limit
                    </>
                  ))
                )}
              </h4>

              <p>
                {isReduceOnly
                  ? "stSOL is being discontinued."
                  : `${bank.meta.tokenSymbol} ${isLending ? "deposits" : "borrows"} are at ${percentFormatter.format(
                      (isLending ? bank.info.state.totalDeposits : bank.info.state.totalBorrows) / bankCap
                    )} capacity.`}
              </p>
              <a href="https://docs.marginfi.com">
                <u>Learn more.</u>
              </a>
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    ),
  };
}

function getBankTypeStat(bank: ExtendedBankInfo): PreviewStat {
  return {
    label: "Type",
    value: () => (
      <>
        {bank.info.state.isIsolated ? (
          <>
            Isolated pool{" "}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Image src="/info_icon.png" alt="info" height={12} width={12} />
                </TooltipTrigger>
                <TooltipContent>
                  <h4 className="text-base">Isolated pools are risky ⚠️</h4>
                  Assets in isolated pools cannot be used as collateral. When you borrow an isolated asset, you cannot
                  borrow other assets. Isolated pools should be considered particularly risky. As always, remember that
                  marginfi is a decentralized protocol and all deposited funds are at risk.
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </>
        ) : (
          <>Global pool</>
        )}
      </>
    ),
  };
}

function getOracleStat(bank: ExtendedBankInfo): PreviewStat {
  let oracle = "";
  switch (bank?.info.rawBank.config.oracleSetup) {
    case "PythLegacy":
      oracle = "Pyth";
      break;
    case "PythPushOracle":
      oracle = "Pyth";
      break;
    case "SwitchboardV2":
      oracle = "Switchboard";
      break;
  }

  return {
    label: "Oracle",
    value: () => (
      <>
        {oracle}
        {oracle === "Pyth" ? <IconPyth size={14} /> : <IconSwitchboard size={14} />}
      </>
    ),
  };
}
