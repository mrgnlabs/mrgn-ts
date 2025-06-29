import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";

import {
  getPriceWithConfidence,
  OracleSetup,
  MarginRequirementType,
  EmodeTag,
  EmodePair,
  PriceBias,
  getPrice,
  ValidatorStakeGroup,
} from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo, Emissions, StakePoolMetadata } from "@mrgnlabs/mrgn-state";
import { aprToApy, nativeToUi, WSOL_MINT } from "@mrgnlabs/mrgn-common";

import { isBankOracleStale } from "./mrgnUtils";

export const REDUCE_ONLY_BANKS = ["stSOL", "RLB"];

export interface AssetData {
  address: PublicKey;
  symbol: string;
  name: string;
  image: string;
  stakePool?: StakePoolMetadata;
  hasEmode: boolean;
  emodeTag: string;
  isInLendingMode?: boolean;
  assetWeight: number;
  originalAssetWeight: number;
  emodeActive: boolean;
  collateralBanks: {
    collateralBank: ExtendedBankInfo;
    emodePair: EmodePair;
  }[];
  liabilityBanks: {
    liabilityBank: ExtendedBankInfo;
    emodePair: EmodePair;
  }[];
}

export interface RateData {
  emissionRate: number;
  emissionsRemaining: number;
  lendingRate: number;
  rateAPY: number;
  symbol: string;
  isInLendingMode: boolean;
  bankAddress: PublicKey;
  mintAddress: PublicKey;
}

export interface AssetPriceData {
  assetPrice: number;
  assetPriceOffset: number;
  price: number;
  symbol: string;
  oracle: string;
  isOracleStale: boolean;
  isInLendingMode?: boolean;
}

export interface AssetWeightData {
  bank: ExtendedBankInfo;
  extendedBankInfos: ExtendedBankInfo[];
  assetWeight: number;
  originalAssetWeight?: number;
  emodeActive?: boolean;
  isInLendingMode?: boolean;
  collateralBanks?: {
    collateralBank: ExtendedBankInfo;
    emodePair: EmodePair;
  }[];
  liabilityBanks?: {
    liabilityBank: ExtendedBankInfo;
    emodePair: EmodePair;
  }[];
}

export interface DepositsData {
  isReduceOnly: boolean;
  isBankHigh: boolean;
  isBankFilled: boolean;
  bankCap: number;
  bankDeposits: number;
  bankDepositsUsd: number;
  capacity: number;
  available: number;
  symbol: string;
  isInLendingMode: boolean;
  isStakedAsset: boolean;
  bankAddress: PublicKey;
  mintAddress: PublicKey;
}

export interface BankCapData {
  bankCap: number;
  bankCapUsd: number;
  bank: ExtendedBankInfo;
}

export interface UtilizationData {
  utilization: number;
}

export interface PositionData {
  denominationUSD: boolean;
  price: number;
  solPrice: number | null;
  assetTag: number;
  walletAmount: number;
  symbol: string;
  positionAmount?: number;
  positionUsd?: number;
  liquidationPrice?: number;
  isInLendingMode: boolean;
  isUserPositionPoorHealth: boolean;
}

export const getAssetData = (
  bank: ExtendedBankInfo,
  isInLendingMode: boolean,
  assetWeightInitOverride?: BigNumber,
  collateralBanks?: {
    collateralBank: ExtendedBankInfo;
    emodePair: EmodePair;
  }[],
  liabilityBanks?: {
    liabilityBank: ExtendedBankInfo;
    emodePair: EmodePair;
  }[]
): AssetData => {
  return {
    address: bank.address,
    symbol: bank.meta.tokenSymbol,
    name: bank.meta.tokenName,
    image: bank.meta.tokenLogoUri,
    hasEmode: bank.info.state.hasEmode,
    emodeTag: bank.info.state.hasEmode ? EmodeTag[bank.info.rawBank.emode.emodeTag] : "",
    isInLendingMode,
    assetWeight: bank.info.rawBank
      .getAssetWeight(MarginRequirementType.Initial, bank.info.oraclePrice, false, assetWeightInitOverride)
      .toNumber(),
    originalAssetWeight: bank.info.state.originalWeights.assetWeightInit.toNumber(),
    emodeActive: bank.isActive && bank.position.emodeActive,
    collateralBanks: collateralBanks ?? [],
    liabilityBanks: liabilityBanks ?? [],
  };
};

export const getRateData = (bank: ExtendedBankInfo, isInLendingMode: boolean): RateData => {
  const { lendingRate, borrowingRate, emissionsRate, emissions } = bank.info.state;
  let emissionsRemaining = bank.info.rawBank.emissionsRemaining
    ? nativeToUi(bank.info.rawBank.emissionsRemaining, bank.info.rawBank.mintDecimals)
    : 0;

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
    emissionsRemaining: emissionsRemaining,
    lendingRate,
    rateAPY,
    symbol: bank.meta.tokenSymbol,
    isInLendingMode,
    bankAddress: bank.address,
    mintAddress: bank.info.rawBank.mint,
  };
};

export const getAssetPriceData = (bank: ExtendedBankInfo): AssetPriceData => {
  const assetPrice = getPriceWithConfidence(bank.info.oraclePrice, false).price.toNumber();

  let oracle = "" as "Pyth" | "Switchboard";
  switch (bank.info.rawBank.config.oracleSetup) {
    case OracleSetup.PythLegacy:
      oracle = "Pyth";
      break;
    case OracleSetup.PythPushOracle:
      oracle = "Pyth";
      break;
    case OracleSetup.StakedWithPythPush:
      oracle = "Pyth";
      break;
    case OracleSetup.SwitchboardV2:
      oracle = "Switchboard";
      break;
    case OracleSetup.SwitchboardPull:
      oracle = "Switchboard";
      break;
  }

  const assetPriceOffset = Math.max(
    getPrice(bank.info.oraclePrice, PriceBias.Highest).toNumber() - bank.info.state.price,
    bank.info.state.price - getPrice(bank.info.oraclePrice, PriceBias.Lowest).toNumber()
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

export const getAssetWeightData = (
  bank: ExtendedBankInfo,
  isInLendingMode: boolean,
  extendedBankInfos: ExtendedBankInfo[] = [],
  assetWeightInitOverride?: BigNumber,
  collateralBanks?: {
    collateralBank: ExtendedBankInfo;
    emodePair: EmodePair;
  }[],
  liabilityBanks?: {
    liabilityBank: ExtendedBankInfo;
    emodePair: EmodePair;
  }[],
  userActiveEmodes: EmodePair[] = []
): AssetWeightData => {
  if (!bank?.info?.rawBank?.getAssetWeight) {
    return {
      bank,
      assetWeight: 0,
      isInLendingMode,
      extendedBankInfos,
    };
  }
  const assetWeightInit = bank.info.rawBank
    .getAssetWeight(MarginRequirementType.Initial, bank.info.oraclePrice, false, assetWeightInitOverride)
    .toNumber();

  const originalAssetWeight = bank.info.state.originalWeights.assetWeightInit.toNumber();

  if (assetWeightInit <= 0) {
    return {
      bank,
      extendedBankInfos,
      assetWeight: 0,
      originalAssetWeight,
      isInLendingMode,
    };
  }

  let emodeActive = false;

  if (bank.isActive) {
    if (bank.position.isLending && isInLendingMode && bank.position.emodeActive) {
      emodeActive = true;
    } else if (!bank.position.isLending && !isInLendingMode) {
      emodeActive = !!userActiveEmodes.find((emodePair) => emodePair.liabilityBank.equals(bank.address));
    }
  }

  const assetWeight = isInLendingMode ? assetWeightInit : 1 / bank.info.rawBank.config.liabilityWeightInit.toNumber();

  return {
    bank,
    extendedBankInfos,
    assetWeight,
    originalAssetWeight,
    emodeActive,
    collateralBanks: collateralBanks,
    liabilityBanks: liabilityBanks,
    isInLendingMode,
  };
};

export const getDepositsData = (bank: ExtendedBankInfo, isInLendingMode: boolean): DepositsData => {
  const bankCap = nativeToUi(
    isInLendingMode ? bank.info.rawBank.config.depositLimit : bank.info.rawBank.config.borrowLimit,
    bank.info.state.mintDecimals
  );

  const isBankFilled =
    (isInLendingMode ? bank.info.state.totalDeposits : bank.info.state.totalBorrows) >= bankCap * 0.99999;

  const isBankHigh = (isInLendingMode ? bank.info.state.totalDeposits : bank.info.state.totalBorrows) >= bankCap * 0.9;

  const isReduceOnly = bank?.meta?.tokenSymbol ? REDUCE_ONLY_BANKS.includes(bank.meta.tokenSymbol) : false;

  const bankDeposits = isInLendingMode
    ? bank.info.state.totalDeposits
    : Math.min(bank.info.state.availableLiquidity, bank.info.state.borrowCap - bank.info.state.totalBorrows);

  const bankDepositsUsd = bankDeposits * bank.info.state.price;

  const capacity = (isInLendingMode ? bank.info.state.totalDeposits : bank.info.state.totalBorrows) / bankCap;

  const available = bankCap - (isInLendingMode ? bank.info.state.totalDeposits : bank.info.state.totalBorrows);

  const isStakedAsset = bank.info.rawBank.config.assetTag === 2;

  return {
    isReduceOnly,
    isBankHigh,
    isBankFilled,
    bankCap,
    bankDeposits,
    bankDepositsUsd,
    capacity,
    available,
    symbol: bank.meta.tokenSymbol,
    isInLendingMode,
    isStakedAsset,
    bankAddress: bank.address,
    mintAddress: bank.info.rawBank.mint,
  };
};

export const getBankCapData = (bank: ExtendedBankInfo, isInLendingMode: boolean): BankCapData => {
  const bankCapUi = nativeToUi(
    isInLendingMode ? bank.info.rawBank.config.depositLimit : bank.info.rawBank.config.borrowLimit,
    bank.info.state.mintDecimals
  );

  const bankCap = isInLendingMode ? bankCapUi : bank.info.state.totalBorrows;
  const bankCapUsd = bankCap * bank.info.state.price;

  return {
    bankCap,
    bankCapUsd,
    bank,
  };
};

export const getUtilizationData = (bank: ExtendedBankInfo): UtilizationData => ({
  utilization: bank.info.state.utilizationRate,
});

export const getPositionData = (
  bank: ExtendedBankInfo,
  nativeSolBalance: number,
  isInLendingMode: boolean,
  solPrice: number | null,
  validatorStakeGroup?: ValidatorStakeGroup
): PositionData => {
  let positionAmount,
    liquidationPrice,
    positionUsd,
    isUserPositionPoorHealth = false;

  let walletAmount = bank.info.state.mint.equals(WSOL_MINT)
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

  if (validatorStakeGroup) {
    walletAmount = validatorStakeGroup.totalStake;
  }

  const positionData: PositionData = {
    price: bank.info.state.price,
    walletAmount,
    positionAmount,
    positionUsd,
    liquidationPrice: liquidationPrice || undefined,
    isUserPositionPoorHealth,
    isInLendingMode,
    symbol: bank.meta.tokenSymbol,
    assetTag: bank.info.rawBank.config.assetTag,
    denominationUSD: false,
    solPrice,
  };

  return positionData;
};
