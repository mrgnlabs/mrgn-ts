import React from "react";

import {
  ExtendedBankInfo,
  ExtendedBankMetadata,
  Emissions,
  getCurrentAction,
  ActionType,
} from "@mrgnlabs/marginfi-v2-ui-state";
import {
  MarginRequirementType,
  MarginfiAccountWrapper,
  PriceBias,
  getPriceWithConfidence,
} from "@mrgnlabs/marginfi-client-v2";
import { WSOL_MINT, aprToApy, nativeToUi } from "@mrgnlabs/mrgn-common";

import { isBankOracleStale } from "~/utils";

import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { ActionBoxDialog } from "~/components/common/ActionBox";
import { Button } from "~/components/ui/button";

export const REDUCE_ONLY_BANKS = ["stSOL"];

export interface AssetData {
  symbol: string;
}

export interface RateData {
  emissionRate: number;
  lendingRate: number;
  rateAPY: number;
  symbol: string;
  isInLendingMode: boolean;
}

export interface AssetPriceData {
  assetPrice: number;
  assetPriceOffset: number;
  price: number;
  symbol: string;
  oracle: string;
  isOracleStale: boolean;
}

export interface AssetWeightData {
  assetWeight: number;
}

export interface DepositsData {
  isReduceOnly: boolean;
  isBankHigh: boolean;
  isBankFilled: boolean;
  bankCap: number;
  bankDeposits: number;
  capacity: number;
  available: number;
  symbol: string;
  denominationUSD: boolean;
  isInLendingMode: boolean;
}

export interface BankCapData {
  bankCap: number;
  denominationUSD: boolean;
  bank: ExtendedBankInfo;
}

export interface UtilizationData {
  utilization: number;
}

export interface PositionData {
  denominationUSD: boolean;
  price: number;
  walletAmount: number;
  symbol: string;
  positionAmount?: number;
  positionUsd?: number;
  liquidationPrice?: number;
  isInLendingMode: boolean;
  isUserPositionPoorHealth: boolean;
}

export const getAssetData = (asset: ExtendedBankMetadata): AssetData => ({ symbol: asset.tokenSymbol });

export const getRateData = (bank: ExtendedBankInfo, isInLendingMode: boolean): RateData => {
  const { lendingRate, borrowingRate, emissions, emissionsRate } = bank.info.state;

  const interestRate = isInLendingMode ? lendingRate : borrowingRate;
  const emissionRate = isInLendingMode
    ? emissions == Emissions.Lending
      ? emissionsRate
      : 0
    : emissions == Emissions.Borrowing
    ? emissionsRate
    : 0;

  const rateAPR = interestRate + emissionRate;
  const rateAPY = aprToApy(rateAPR);

  return {
    emissionRate,
    lendingRate,
    rateAPY,
    symbol: bank.meta.tokenSymbol,
    isInLendingMode,
  };
};

export const getAssetPriceData = (bank: ExtendedBankInfo): AssetPriceData => {
  const assetPrice = getPriceWithConfidence(bank.info.oraclePrice, false).price.toNumber();

  let oracle = "";
  switch (bank.info.rawBank.config.oracleSetup) {
    case "PythEma":
      oracle = "Pyth";
      break;
    case "SwitchboardV2":
      oracle = "Switchboard";
      break;
  }

  const assetPriceOffset = Math.max(
    bank.info.rawBank.getPrice(bank.info.oraclePrice, PriceBias.Highest).toNumber() - bank.info.state.price,
    bank.info.state.price - bank.info.rawBank.getPrice(bank.info.oraclePrice, PriceBias.Lowest).toNumber()
  );

  const isOracleStale = isBankOracleStale(bank);

  return {
    assetPrice,
    assetPriceOffset,
    price: bank.info.state.price,
    symbol: bank.meta.tokenSymbol,
    oracle,
    isOracleStale,
  };
};

export const getAssetWeightData = (bank: ExtendedBankInfo, isInLendingMode: boolean): AssetWeightData => {
  if (!bank?.info?.rawBank?.getAssetWeight) {
    return {
      assetWeight: 0,
    };
  }
  const assetWeightInit = bank.info.rawBank
    .getAssetWeight(MarginRequirementType.Initial, bank.info.oraclePrice)
    .toNumber();

  if (assetWeightInit <= 0) {
    return {
      assetWeight: 0,
    };
  }

  const assetWeight = isInLendingMode ? assetWeightInit : 1 / bank.info.rawBank.config.liabilityWeightInit.toNumber();

  return {
    assetWeight,
  };
};

export const getDepositsData = (
  bank: ExtendedBankInfo,
  isInLendingMode: boolean,
  denominationUSD: boolean
): DepositsData => {
  const bankCap = nativeToUi(
    isInLendingMode ? bank.info.rawBank.config.depositLimit : bank.info.rawBank.config.borrowLimit,
    bank.info.state.mintDecimals
  );

  const isBankFilled =
    (isInLendingMode ? bank.info.state.totalDeposits : bank.info.state.totalBorrows) >= bankCap * 0.99999;

  const isBankHigh = (isInLendingMode ? bank.info.state.totalDeposits : bank.info.state.totalBorrows) >= bankCap * 0.9;

  const isReduceOnly = bank?.meta?.tokenSymbol ? REDUCE_ONLY_BANKS.includes(bank.meta.tokenSymbol) : false;

  const bankDeposits =
    (isInLendingMode
      ? bank.info.state.totalDeposits
      : Math.min(bank.info.state.availableLiquidity, bank.info.state.borrowCap - bank.info.state.totalBorrows)) *
    (denominationUSD ? bank.info.state.price : 1);

  const capacity = (isInLendingMode ? bank.info.state.totalDeposits : bank.info.state.totalBorrows) / bankCap;

  const available = bankCap - (isInLendingMode ? bank.info.state.totalDeposits : bank.info.state.totalBorrows);

  return {
    isReduceOnly,
    isBankHigh,
    isBankFilled,
    bankCap,
    bankDeposits,
    capacity,
    available,
    symbol: bank.meta.tokenSymbol,
    denominationUSD,
    isInLendingMode,
  };
};

export const getBankCapData = (
  bank: ExtendedBankInfo,
  isInLendingMode: boolean,
  denominationUSD: boolean
): BankCapData => {
  const bankCapUi = nativeToUi(
    isInLendingMode ? bank.info.rawBank.config.depositLimit : bank.info.rawBank.config.borrowLimit,
    bank.info.state.mintDecimals
  );

  const bankCap =
    (isInLendingMode ? bankCapUi : bank.info.state.totalBorrows) * (denominationUSD ? bank.info.state.price : 1);

  return {
    bankCap,
    denominationUSD,
    bank,
  };
};

export const getUtilizationData = (bank: ExtendedBankInfo): UtilizationData => ({
  utilization: bank.info.state.utilizationRate,
});

export const getPositionData = (
  bank: ExtendedBankInfo,
  denominationUSD: boolean,
  nativeSolBalance: number,
  isInLendingMode: boolean
): PositionData => {
  let positionAmount,
    liquidationPrice,
    positionUsd,
    isUserPositionPoorHealth = false;

  const walletAmount = bank.info.state.mint.equals(WSOL_MINT)
    ? bank.userInfo.tokenAccount.balance + nativeSolBalance
    : bank.userInfo.tokenAccount.balance;

  if (bank.isActive && bank.position.isLending === isInLendingMode) {
    positionAmount = bank.position.amount;
    positionUsd = bank.position.usdValue;
    liquidationPrice = bank.position.liquidationPrice;

    if (bank.position.liquidationPrice) {
      const alertRange = 0.05;
      if (bank.position.isLending) {
        isUserPositionPoorHealth =
          bank.info.state.price < bank.position.liquidationPrice + bank.position.liquidationPrice * alertRange;
      } else {
        bank.info.state.price > bank.position.liquidationPrice - bank.position.liquidationPrice * alertRange;
      }
    }
  }

  return {
    denominationUSD,
    price: bank.info.state.price,
    walletAmount,
    positionAmount,
    positionUsd,
    liquidationPrice,
    isUserPositionPoorHealth,
    isInLendingMode,
    symbol: bank.meta.tokenSymbol,
  } as PositionData;
};

export const getAction = (
  bank: ExtendedBankInfo,
  isInLendingMode: boolean,
  marginfiAccount: MarginfiAccountWrapper | null
) => {
  const currentAction = getCurrentAction(isInLendingMode, bank);
  const isDust = bank.isActive && bank.position.isDust;
  const showCloseBalance = currentAction === ActionType.Withdraw && isDust;

  return (
    <>
      {marginfiAccount === null && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex px-0 sm:pl-4 gap-4 justify-center lg:justify-end items-center">
                <ActionBoxDialog requestedToken={bank.address} requestedAction={currentAction}>
                  <Button
                    variant="outline"
                    className="w-full max-w-[140px] hover:bg-primary hover:text-primary-foreground"
                  >
                    {showCloseBalance ? "Close" : currentAction}
                  </Button>
                </ActionBoxDialog>
              </div>
            </TooltipTrigger>
            <TooltipContent>User account will be automatically created on first deposit</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}

      {marginfiAccount !== null && (
        <div className="flex px-0 sm:pl-4 gap-4 justify-center lg:justify-end items-center">
          <ActionBoxDialog requestedToken={bank.address} requestedAction={currentAction}>
            <Button variant="secondary" className="w-full max-w-[140px] hover:bg-primary hover:text-primary-foreground">
              {showCloseBalance ? "Close" : currentAction}
            </Button>
          </ActionBoxDialog>
        </div>
      )}
    </>
  );
};
