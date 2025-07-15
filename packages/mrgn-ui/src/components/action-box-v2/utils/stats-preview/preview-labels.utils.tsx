import Image from "next/image";
import { IconArrowRight, IconAlertTriangle } from "@tabler/icons-react";

import { getPriceWithConfidence } from "@mrgnlabs/marginfi-client-v2";
import { ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/mrgn-state";
import {
  dynamicNumeralFormatter,
  numeralFormatter,
  percentFormatter,
  percentFormatterDyn,
  tokenPriceFormatter,
  usdFormatter,
} from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";

import { Skeleton } from "~/components/ui/skeleton";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";
import { IconPyth, IconSwitchboard } from "~/components/ui/icons";

export const REDUCE_ONLY_BANKS = ["stSOL", "RLB"];

export interface PreviewStat {
  label: string | React.JSX.Element;
  color?: "SUCCESS" | "ALERT" | "DESTRUCTIVE";
  value: () => React.JSX.Element;
}

export function getPlatformFeeStat(platformFeeBps: number): PreviewStat {
  return {
    label: "Platform fee",
    value: () => <>{percentFormatter.format(platformFeeBps / 10000)}</>,
  };
}

export function getLeverageStat(
  depositBank: ExtendedBankInfo,
  borrowBank: ExtendedBankInfo,
  depositAmount: number,
  borrowAmount: number,
  isLoading: boolean,
  isSimulated: boolean
): PreviewStat {
  console.log("depositBank", depositBank.meta.tokenSymbol);
  console.log("borrowBank", borrowBank.meta.tokenSymbol);
  const depositValue = depositBank.isActive ? depositBank.position.usdValue : 0;
  const borrowValue = borrowBank.isActive ? borrowBank.position.usdValue : 0;

  const newDepositValue = depositValue + depositAmount * depositBank.info.oraclePrice.priceRealtime.price.toNumber();
  const newBorrowValue = borrowValue + borrowAmount * borrowBank.info.oraclePrice.priceRealtime.price.toNumber();

  const currentLeverage = numeralFormatter(
    Math.round((depositValue / (depositValue - borrowValue) + Number.EPSILON) * 100) / 100
  );

  const newleverage = numeralFormatter(
    Math.round((newDepositValue / (newDepositValue - newBorrowValue) + Number.EPSILON) * 100) / 100
  );

  return {
    label: "Leverage",
    value: () => (
      <>
        {currentLeverage}x
        {isSimulated || isLoading ? (
          <>
            <IconArrowRight width={12} height={12} />
            {isLoading ? <Skeleton className="h-4 w-[45px] bg-muted" /> : <>{newleverage}x</>}
          </>
        ) : (
          <></>
        )}
      </>
    ),
  };
}

export function getPositionSizeStat(
  depositBank: ExtendedBankInfo,
  borrowBank: ExtendedBankInfo,
  depositAmount: number,
  borrowAmount: number,
  isLoading: boolean,
  isSimulated: boolean
): PreviewStat {
  const depositValue = depositBank.isActive ? depositBank.position.usdValue : 0;
  const borrowValue = borrowBank.isActive ? borrowBank.position.usdValue : 0;

  const newDepositValue = depositValue + depositAmount * depositBank.info.oraclePrice.priceRealtime.price.toNumber();
  const newBorrowValue = borrowValue + borrowAmount * borrowBank.info.oraclePrice.priceRealtime.price.toNumber();

  const positionSize = depositValue;
  const newPositionSize = newDepositValue;

  return {
    label: "Position size",
    value: () => (
      <>
        {usdFormatter.format(positionSize)}
        {isSimulated || isLoading ? (
          <>
            <IconArrowRight width={12} height={12} />
            {isLoading ? <Skeleton className="h-4 w-[45px] bg-muted" /> : <>{usdFormatter.format(newPositionSize)}</>}
          </>
        ) : (
          <></>
        )}
      </>
    ),
  };
}

export function getAmountStat(currentAmount: number, symbol: string, simulatedAmount?: number): PreviewStat {
  return {
    label: "Total",
    value: () => (
      <>
        {dynamicNumeralFormatter(currentAmount)} {symbol}
        {simulatedAmount !== undefined ? <IconArrowRight width={12} height={12} /> : <></>}
        {simulatedAmount !== undefined ? dynamicNumeralFormatter(simulatedAmount) + " " + symbol : <></>}
      </>
    ),
  };
}

export function getAmountUsdStat(
  currentAmount: number,
  symbol: string,
  price: number,
  simulatedAmount?: number
): PreviewStat {
  return {
    label: "USD Value",
    value: () => (
      <>
        {tokenPriceFormatter(currentAmount * price)}
        {simulatedAmount !== undefined ? <IconArrowRight width={12} height={12} /> : <></>}
        {simulatedAmount !== undefined ? tokenPriceFormatter(simulatedAmount * price) : <></>}
      </>
    ),
  };
}

export function getPriceImpactStat(priceImpactPct: number): PreviewStat {
  const priceImpactLabel = priceImpactPct < 0.0001 ? "< 0.01%" : percentFormatter.format(priceImpactPct);

  const color = priceImpactPct < 0.01 ? "SUCCESS" : priceImpactPct > 0.05 ? "DESTRUCTIVE" : "ALERT";

  return {
    label: "Price impact",
    color,
    value: () => <>{priceImpactLabel}</>,
  };
}

export function getSlippageStat(slippageBps: number): PreviewStat {
  return {
    label: "Slippage",
    color: slippageBps > 500 ? "DESTRUCTIVE" : slippageBps > 250 ? "ALERT" : "SUCCESS",
    value: () => <> {percentFormatter.format(slippageBps / 10000)}</>,
  };
}

export function getHealthStat(health: number, isLoading: boolean, simulationHealth?: number): PreviewStat {
  const computeHealth = simulationHealth !== undefined && !isNaN(simulationHealth) ? simulationHealth : health;
  const healthColor = computeHealth >= 0.5 ? "SUCCESS" : computeHealth >= 0.25 ? "ALERT" : "DESTRUCTIVE";

  const isSimulated = simulationHealth !== undefined;

  return {
    label: "Health",
    color: healthColor,
    value: () => (
      <>
        {percentFormatter.format(health)}
        {(isSimulated || isLoading) && (
          <>
            <IconArrowRight width={12} height={12} />
            {isLoading ? <Skeleton className="h-4 w-[45px] bg-muted" /> : percentFormatter.format(computeHealth ?? 0)}
          </>
        )}
      </>
    ),
  };
}

export function getLiquidationStat(bank: ActiveBankInfo, isLoading: boolean, simulationLiq?: number): PreviewStat {
  const price = bank ? getPriceWithConfidence(bank.info.oraclePrice, false).price.toNumber() : 0;

  const computeLiquidation = isNaN(simulationLiq ?? 0)
    ? bank.position.liquidationPrice
    : (simulationLiq ?? bank.position.liquidationPrice);

  const isSimulated = simulationLiq !== undefined;

  const healthColor = computeLiquidation
    ? computeLiquidation > 0.5 * price
      ? "SUCCESS"
      : computeLiquidation > 0.3 * price
        ? "ALERT"
        : "DESTRUCTIVE"
    : undefined;

  const liquidationPrice =
    bank.position.liquidationPrice &&
    bank.position.liquidationPrice > 0.01 &&
    usdFormatter.format(bank.position.liquidationPrice);

  return {
    label: "Liquidation price",
    color: healthColor,
    value: () => (
      <>
        {liquidationPrice}
        {isSimulated || isLoading ? (
          <>
            {<IconArrowRight width={12} height={12} />}
            {isLoading ? (
              <Skeleton className="h-4 w-[45px] bg-muted" />
            ) : simulationLiq ? (
              usdFormatter.format(simulationLiq)
            ) : (
              ""
            )}{" "}
          </>
        ) : (
          <></>
        )}
      </>
    ),
  };
}

export function getPoolSizeStat(bankCap: number, bank: ExtendedBankInfo, isLending: boolean): PreviewStat {
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
                "flex items-center justify-end gap-1.5",
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

export function getBankTypeStat(bank: ExtendedBankInfo): PreviewStat {
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

export function getOracleStat(bank: ExtendedBankInfo): PreviewStat {
  let oracle = "";
  let oracleIcon = <></>;

  switch (bank?.info.rawBank.config.oracleSetup) {
    case "PythLegacy":
      oracle = "Pyth";
      oracleIcon = <IconPyth size={14} />;
      break;
    case "PythPushOracle":
      oracle = "Pyth";
      oracleIcon = <IconPyth size={14} />;
      break;
    case "StakedWithPythPush":
      oracle = "Pyth";
      oracleIcon = <IconPyth size={14} />;
      break;
    case "SwitchboardV2":
      oracle = "Switchboard";
      oracleIcon = <IconSwitchboard size={14} />;
      break;
    case "SwitchboardPull":
      oracle = "Switchboard";
      oracleIcon = <IconSwitchboard size={14} />;
      break;
    default:
      oracle = "Unknown";
      break;
  }

  return {
    label: "Oracle",
    value: () => (
      <>
        {oracle}
        {oracleIcon}
      </>
    ),
  };
}

export function getSupplyStat(supply: number, isLoading: boolean, simulationSupply?: number): PreviewStat {
  return {
    label: "Supply",
    value: () => (
      <>
        {supply && numeralFormatter(supply)}
        {simulationSupply ? (
          <>
            <IconArrowRight width={12} height={12} />
            {isLoading ? <Skeleton className="h-4 w-[45px] bg-[#373F45]" /> : numeralFormatter(simulationSupply)}
          </>
        ) : (
          <></>
        )}
      </>
    ),
  };
}

export function getLstSupplyStat(supply: number): PreviewStat {
  return {
    label: "Supply",
    value: () => <>{supply && numeralFormatter(supply)}</>,
  };
}

export function getProjectedAPYStat(projectedApy: number): PreviewStat {
  return {
    label: "Projected APY",
    value: () => <>{percentFormatterDyn.format(projectedApy)}</>,
  };
}

export function getCurrentPriceStat(currentPrice: number): PreviewStat {
  return {
    label: "Current Price",
    value: () => <>1 $LST = {currentPrice && numeralFormatter(currentPrice)} SOL</>,
  };
}

export function getCommissionStat(commission: number): PreviewStat {
  return {
    label: "Commission",
    value: () => <>{commission}%</>,
  };
}
