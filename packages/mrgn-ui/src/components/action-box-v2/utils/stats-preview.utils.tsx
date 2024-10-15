import Image from "next/image";
import { IconArrowRight, IconAlertTriangle } from "@tabler/icons-react";

import { getPriceWithConfidence } from "@mrgnlabs/marginfi-client-v2";
import { ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import {
  clampedNumeralFormatter,
  numeralFormatter,
  percentFormatter,
  percentFormatterDyn,
  usdFormatter,
} from "@mrgnlabs/mrgn-common";
import { cn } from "@mrgnlabs/mrgn-utils";

import { Skeleton } from "~/components/ui/skeleton";
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from "~/components/ui/tooltip";
import { IconPyth, IconSwitchboard } from "~/components/ui/icons";

export const REDUCE_ONLY_BANKS = ["stSOL", "RLB"];

export interface PreviewStat {
  label: string;
  color?: "SUCCESS" | "ALERT" | "DESTRUCTIVE";
  value: () => React.JSX.Element;
}

export function getJupFeeStat(platformFee: number): PreviewStat {
  return {
    label: "Platform fee",
    value: () => <>0.25%</>,
  };
}

export function getAmountStat(currentAmount: number, symbol: string, simulatedAmount?: number): PreviewStat {
  return {
    label: "Your amount",
    value: () => (
      <>
        {clampedNumeralFormatter(currentAmount)} {symbol}
        {simulatedAmount !== undefined ? <IconArrowRight width={12} height={12} /> : <></>}
        {simulatedAmount !== undefined ? clampedNumeralFormatter(simulatedAmount) + " " + symbol : <></>}
      </>
    ),
  };
}

export function getPriceImpactStat(priceImpactPct: number): PreviewStat {
  return {
    label: "Price impact",
    color: priceImpactPct > 0.01 && priceImpactPct > 0.05 ? "DESTRUCTIVE" : "ALERT",
    value: () => <>{percentFormatter.format(priceImpactPct)}</>,
  };
}

export function getSlippageStat(slippageBps: number): PreviewStat {
  return {
    label: "Slippage",
    color: slippageBps > 500 ? "ALERT" : undefined,
    value: () => <> {percentFormatter.format(slippageBps / 10000)}</>,
  };
}

export function getHealthStat(health: number, isLoading: boolean, simulationHealth?: number): PreviewStat {
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

export function getLiquidationStat(bank: ActiveBankInfo, isLoading: boolean, simulationLiq: number): PreviewStat {
  const price = bank ? getPriceWithConfidence(bank.info.oraclePrice, false).price.toNumber() : 0;

  const computeLiquidation = isNaN(simulationLiq)
    ? bank.position.liquidationPrice
    : simulationLiq ?? bank.position.liquidationPrice;

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
        {bank.position.liquidationPrice &&
          bank.position.liquidationPrice > 0.01 &&
          usdFormatter.format(bank.position.liquidationPrice)}
        {bank.position.liquidationPrice && simulationLiq && <IconArrowRight width={12} height={12} />}
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

export function getSupplyStat(supply: number, isLoading: boolean, simulationSupply?: number): PreviewStat {
  return {
    label: "Supply",
    value: () => (
      <>
        {supply && numeralFormatter(supply)}
        {simulationSupply ? <IconArrowRight width={12} height={12} /> : ""}
        {isLoading ? (
          <Skeleton className="h-4 w-[45px] bg-[#373F45]" />
        ) : simulationSupply ? (
          numeralFormatter(simulationSupply)
        ) : (
          ""
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
