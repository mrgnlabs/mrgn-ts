import React from "react";
import Image from "next/image";
import { VersionedTransaction } from "@solana/web3.js";

import { ExtendedBankInfo, AccountSummary } from "@mrgnlabs/marginfi-v2-ui-state";
import { Wallet, percentFormatter, usdFormatter, clampedNumeralFormatter } from "@mrgnlabs/mrgn-common";
import {
  Bank,
  MarginRequirementType,
  MarginfiAccountWrapper,
  MarginfiClient,
  SimulationResult,
  getPriceWithConfidence,
} from "@mrgnlabs/marginfi-client-v2";
import { LoopingOptions } from "@mrgnlabs/mrgn-utils";

import { IconArrowRight, IconPyth, IconSwitchboard } from "~/components/ui/icons";
import { Skeleton } from "~/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";

export interface SimulateLoopingActionProps {
  marginfiClient: MarginfiClient;
  account: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
  loopingTxn: VersionedTransaction | null;
}

export interface ActionPreview {
  simulationPreview: ActionPreviewSimulation;
  currentPositionAmount: number;
  healthFactor: number;
  liquidationPrice?: number;
  poolSize: number;
  bankCap: number;
  priceImpactPct?: number;
  slippageBps?: number;
}

export interface ActionPreviewSimulation {
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
  simulationResult?: SimulationResult;
  bank: ExtendedBankInfo;
  loopOptions?: LoopingOptions;
  accountSummary: AccountSummary;
  isLoading: boolean;
}

export function calculatePreview({
  simulationResult,
  bank,
  loopOptions,
  accountSummary,
}: CalculatePreviewProps): ActionPreview {
  let simulationPreview: ActionPreviewSimulation | undefined = undefined;

  if (simulationResult) {
    const { assets, liabilities } = simulationResult.marginfiAccount.computeHealthComponents(
      MarginRequirementType.Maintenance
    );
    const { assets: assetsInit } = simulationResult.marginfiAccount.computeHealthComponents(
      MarginRequirementType.Initial
    );

    const health = assets.minus(liabilities).dividedBy(assets).toNumber();
    const liquidationPrice = simulationResult.marginfiAccount.computeLiquidationPriceForBank(bank.address);
    const { lendingRate, borrowingRate } = simulationResult.banks.get(bank.address.toBase58())!.computeInterestRates();

    const position = simulationResult.marginfiAccount.activeBalances.find(
      (b) => b.active && b.bankPk.equals(bank.address)
    );
    let positionAmount = 0;
    if (position && position.liabilityShares.gt(0)) {
      positionAmount = position.computeQuantityUi(bank.info.rawBank).liabilities.toNumber();
    } else if (position && position.assetShares.gt(0)) {
      positionAmount = position.computeQuantityUi(bank.info.rawBank).assets.toNumber();
    }
    const availableCollateral = simulationResult.marginfiAccount.computeFreeCollateral().toNumber();

    simulationPreview = {
      health,
      liquidationPrice,
      depositRate: lendingRate.toNumber(),
      borrowRate: borrowingRate.toNumber(),
      positionAmount,
      availableCollateral: {
        amount: availableCollateral,
        ratio: availableCollateral / assetsInit.toNumber(),
      },
    };
  }

  const currentPositionAmount = bank?.isActive ? bank.position.amount : 0;
  const healthFactor = !accountSummary.balance || !accountSummary.healthFactor ? 1 : accountSummary.healthFactor;
  const liquidationPrice =
    bank.isActive && bank.position.liquidationPrice && bank.position.liquidationPrice > 0.01
      ? bank.position.liquidationPrice
      : undefined;

  return {
    currentPositionAmount,
    healthFactor,
    liquidationPrice,
    priceImpactPct: loopOptions?.loopingQuote?.priceImpactPct,
    slippageBps: loopOptions?.loopingQuote?.slippageBps,
    simulationPreview,
  } as ActionPreview;
}

export async function simulateLooping({ marginfiClient, account, bank, loopingTxn }: SimulateLoopingActionProps) {
  let simulationResult: SimulationResult;

  if (loopingTxn && marginfiClient) {
    const [mfiAccountData, bankData] = await marginfiClient.simulateTransactions(
      [loopingTxn],
      [account.address, bank.address]
    );
    if (!mfiAccountData || !bankData) throw new Error("Failed to simulate looping");
    const previewBanks = marginfiClient.banks;
    previewBanks.set(
      bank.address.toBase58(),
      Bank.fromBuffer(bank.address, bankData, marginfiClient.program.idl, marginfiClient.feedIdMap)
    );
    const previewClient = new MarginfiClient(
      marginfiClient.config,
      marginfiClient.program,
      {} as Wallet,
      true,
      marginfiClient.group,
      marginfiClient.banks,
      marginfiClient.oraclePrices,
      marginfiClient.mintDatas,
      marginfiClient.feedIdMap
    );
    const previewMarginfiAccount = MarginfiAccountWrapper.fromAccountDataRaw(
      account.address,
      previewClient,
      mfiAccountData,
      marginfiClient.program.idl
    );

    return (simulationResult = {
      banks: previewBanks,
      marginfiAccount: previewMarginfiAccount,
    });
  }
}

export interface PreviewStat {
  label: string;
  color?: "SUCCESS" | "ALERT" | "DESTRUCTIVE";
  value: () => React.JSX.Element;
}

export function generateStats(preview: ActionPreview, bank: ExtendedBankInfo, isLoading: boolean) {
  const stats = [];

  if (preview.priceImpactPct) stats.push(getPriceImpactStat(preview.priceImpactPct));
  if (preview.slippageBps) stats.push(getSlippageStat(preview.slippageBps));

  stats.push(getHealthStat(preview.healthFactor, isLoading, preview.simulationPreview?.health));

  if (preview.simulationPreview?.liquidationPrice)
    stats.push(getLiquidationStat(bank, isLoading, preview.simulationPreview?.liquidationPrice));

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
