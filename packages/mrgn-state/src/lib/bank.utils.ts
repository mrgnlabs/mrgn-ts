import BigNumber from "bignumber.js";

import {
  Bank,
  OraclePrice,
  PriceBias,
  RiskTier,
  EmodeTag,
  ActionEmodeImpact,
  MarginfiAccountWrapper,
  MarginRequirementType,
  AssetTag,
} from "@mrgnlabs/marginfi-client-v2";
import { TokenMetadata, nativeToUi, WSOL_MINT, floor, ceil, uiToNative } from "@mrgnlabs/mrgn-common";

import { VOLATILITY_FACTOR } from "../consts";
import {
  ExtendedBankMetadata,
  TokenPrice,
  BankState,
  Emissions,
  BankInfo,
  ExtendedBankInfo,
  MakeLendingPositionRawProps,
  MakeLendingPositionWrappedProps,
  UserDataProps,
  UserDataRawProps,
  UserDataWrappedProps,
  LendingPosition,
  MakeLendingPositionProps,
  rawHistoricBankData,
  historicBankChartData,
  StakePoolMetadata,
} from "../types";
import { FEE_MARGIN } from "./firebase.utils";

export function makeExtendedBankMetadata(
  bank: Bank,
  tokenMetadata: TokenMetadata,
  overrideIcon?: boolean
): ExtendedBankMetadata {
  return {
    address: bank.address,
    tokenSymbol: tokenMetadata.symbol,
    tokenName: tokenMetadata.name,
    tokenLogoUri: overrideIcon
      ? (tokenMetadata.icon ??
        "https://storage.googleapis.com/mrgn-public/mrgn-token-icons/${bank.mint.toBase58()}.png")
      : `https://storage.googleapis.com/mrgn-public/mrgn-token-icons/${bank.mint.toBase58()}.png`,
  };
}

export function makeBankInfo(
  bank: Bank,
  oraclePrice: OraclePrice,
  emissionTokenData?: TokenPrice,
  originalWeights?: { assetWeightMaint: BigNumber; assetWeightInit: BigNumber }
): BankState {
  const { lendingRate, borrowingRate } = bank.computeInterestRates();
  const totalDeposits = nativeToUi(bank.getTotalAssetQuantity(), bank.mintDecimals);
  const totalBorrows = nativeToUi(bank.getTotalLiabilityQuantity(), bank.mintDecimals);
  const liquidity = totalDeposits - totalBorrows;
  const utilizationRate = bank.computeUtilizationRate().times(100).toNumber();

  let emissionsRate: number = 0;
  let emissions = Emissions.Inactive;

  if ((bank.emissionsActiveLending || bank.emissionsActiveBorrowing) && emissionTokenData) {
    const emissionsRateAmount = new BigNumber(nativeToUi(bank.emissionsRate, emissionTokenData.decimals));

    emissionsRate = emissionsRateAmount.toNumber();

    if (bank.emissionsActiveBorrowing) {
      emissions = Emissions.Borrowing;
    } else if (bank.emissionsActiveLending) {
      emissions = Emissions.Lending;
    }
  }

  return {
    price: Bank.getPrice(oraclePrice, PriceBias.None).toNumber(),
    mint: bank.mint,
    mintDecimals: bank.mintDecimals,
    lendingRate: isNaN(lendingRate.toNumber()) ? 0 : lendingRate.toNumber(),
    borrowingRate: isNaN(borrowingRate.toNumber()) ? 0 : borrowingRate.toNumber(),
    emissionsRate,
    emissions,
    totalDeposits,
    depositCap: nativeToUi(bank.config.depositLimit, bank.mintDecimals),
    totalBorrows,
    borrowCap: nativeToUi(bank.config.borrowLimit, bank.mintDecimals),
    availableLiquidity: liquidity,
    utilizationRate,
    isIsolated: bank.config.riskTier === RiskTier.Isolated,
    originalWeights: originalWeights ?? {
      assetWeightMaint: bank.config.assetWeightMaint,
      assetWeightInit: bank.config.assetWeightInit,
    },
    hasEmode: bank.emode.emodeTag !== EmodeTag.UNSET,
  };
}

export function makeExtendedBankInfo(
  tokenMetadata: TokenMetadata,
  bank: Bank,
  oraclePrice: OraclePrice,
  emissionTokenPrice?: TokenPrice,
  userData?: UserDataProps,
  overrideIcon?: boolean,
  originalWeights?: { assetWeightMaint: BigNumber; assetWeightInit: BigNumber },
  emodeImpactByBank?: Record<string, ActionEmodeImpact>
): ExtendedBankInfo {
  function isUserDataRawProps(userData: UserDataWrappedProps | UserDataRawProps): userData is UserDataRawProps {
    return (
      (userData as UserDataRawProps).banks !== undefined && (userData as UserDataRawProps).oraclePrices !== undefined
    );
  }

  // Aggregate user-agnostic bank info
  const meta = makeExtendedBankMetadata(bank, tokenMetadata, overrideIcon);
  const bankInfo = makeBankInfo(bank, oraclePrice, emissionTokenPrice, originalWeights);
  let state: BankInfo = {
    rawBank: bank,
    oraclePrice,
    state: bankInfo,
  };

  if (!userData) {
    const userInfo = {
      tokenAccount: {
        created: false,
        mint: bank.mint,
        balance: 0,
      },
      maxDeposit: 0,
      maxRepay: 0,
      maxWithdraw: 0,
      maxBorrow: 0,
    };
    return {
      address: bank.address,
      meta,
      info: state,
      userInfo,
      isActive: false,
    };
  }

  // Calculate user-specific info relevant regardless of whether they have an active position in this bank
  const isWrappedSol = bankInfo.mint.equals(WSOL_MINT);

  const walletBalance = floor(
    isWrappedSol
      ? Math.max(userData.tokenAccount.balance + userData.nativeSolBalance - FEE_MARGIN, 0)
      : userData.tokenAccount.balance,
    bankInfo.mintDecimals
  );

  const { depositCapacity: depositCapacityBN, borrowCapacity: borrowCapacityBN } = bank.computeRemainingCapacity();
  const depositCapacity = nativeToUi(depositCapacityBN, bankInfo.mintDecimals);
  const borrowCapacity = nativeToUi(borrowCapacityBN, bankInfo.mintDecimals);

  let maxDeposit = floor(Math.max(0, Math.min(walletBalance, depositCapacity)), bankInfo.mintDecimals);

  const availableEmodePair = emodeImpactByBank?.[bank.address.toBase58()];

  const borrowImpact = availableEmodePair?.borrowImpact;

  let maxBorrow = 0;
  if (userData.marginfiAccount) {
    let borrowPower: number;
    if (isUserDataRawProps(userData)) {
      borrowPower = userData.marginfiAccount
        .computeMaxBorrowForBank(userData.banks, userData.oraclePrices, bank.address, {
          volatilityFactor: VOLATILITY_FACTOR,
          emodeWeights: borrowImpact?.activePair
            ? {
                assetWeightMaint: borrowImpact.activePair.assetWeightMaint,
                assetWeightInit: borrowImpact.activePair.assetWeightInit,
                collateralTags: borrowImpact.activePair.collateralBankTags,
              }
            : undefined,
        })
        .toNumber();
    } else {
      borrowPower = userData.marginfiAccount
        .computeMaxBorrowForBank(bank.address, {
          volatilityFactor: VOLATILITY_FACTOR,
          emodeWeights: borrowImpact?.activePair
            ? {
                assetWeightMaint: borrowImpact.activePair.assetWeightMaint,
                assetWeightInit: borrowImpact.activePair.assetWeightInit,
                collateralTags: borrowImpact.activePair.collateralBankTags,
              }
            : undefined,
        })
        .toNumber();
    }

    maxBorrow = floor(
      Math.max(0, Math.min(borrowPower, borrowCapacity, bankInfo.availableLiquidity)),
      bankInfo.mintDecimals
    );
  }

  const positionRaw =
    userData.marginfiAccount &&
    userData.marginfiAccount.activeBalances.find((balance) => balance.bankPk.equals(bank.address));
  if (!userData.marginfiAccount || !positionRaw) {
    const userInfo = {
      tokenAccount: userData.tokenAccount,
      maxDeposit,
      maxRepay: 0,
      maxWithdraw: 0,
      maxBorrow,
      emodeImpact: availableEmodePair,
    };

    return {
      address: bank.address,
      meta,
      info: state,
      userInfo,
      isActive: false,
    };
  }

  // Calculate user-specific info relevant to their active position in this bank

  // const marginfiAccount = userData.marginfiAccount as MarginfiAccountWrapper;

  let props:
    | Pick<MakeLendingPositionRawProps, "marginfiAccount" | "banks" | "oraclePrices">
    | Pick<MakeLendingPositionWrappedProps, "marginfiAccount">;

  if (isUserDataRawProps(userData)) {
    props = {
      marginfiAccount: userData.marginfiAccount,
      banks: userData.banks,
      oraclePrices: userData.oraclePrices,
    };
  } else {
    props = {
      marginfiAccount: userData.marginfiAccount,
    };
  }
  const position = makeLendingPosition({
    balance: positionRaw,
    bank,
    bankInfo,
    oraclePrice,
    emodeActive: !!originalWeights,
    ...props,
  });
  let withdrawPower: number;
  if (isUserDataRawProps(userData)) {
    withdrawPower = userData.marginfiAccount
      .computeMaxWithdrawForBank(userData.banks, userData.oraclePrices, bank.address, {
        volatilityFactor: VOLATILITY_FACTOR,
      })
      .toNumber();
  } else {
    withdrawPower = userData.marginfiAccount
      .computeMaxWithdrawForBank(bank.address, {
        volatilityFactor: VOLATILITY_FACTOR,
      })
      .toNumber();
  }
  const maxWithdraw = floor(Math.min(withdrawPower, bankInfo.availableLiquidity), bankInfo.mintDecimals);

  let maxRepay = 0;
  if (position) {
    const debtAmount = ceil(position.amount, bankInfo.mintDecimals);
    maxRepay = Math.min(debtAmount, walletBalance);
  }

  const userInfo = {
    tokenAccount: userData.tokenAccount,
    maxDeposit,
    maxRepay,
    maxWithdraw,
    maxBorrow,
    emodeImpact: availableEmodePair,
  };

  return {
    address: bank.address,
    meta,
    info: state,
    userInfo,
    isActive: true,
    position,
  };
}

function makeLendingPosition(props: MakeLendingPositionProps): LendingPosition {
  const { balance, bank, bankInfo, oraclePrice, marginfiAccount } = props;
  const amounts = balance.computeQuantity(bank);
  const usdValues = balance.computeUsdValue(bank, oraclePrice, MarginRequirementType.Equity);
  const weightedUSDValues = balance.getUsdValueWithPriceBias(bank, oraclePrice, MarginRequirementType.Maintenance);

  // default to checking against usdValues to account for active positions with zero asset / liab shares
  // if token has been sunset and oracle set to 0 check against shares instead
  const isLending = oraclePrice.priceRealtime.price.isZero()
    ? balance.assetShares.gt(balance.liabilityShares)
    : usdValues.liabilities.isZero();

  const amount = isLending
    ? nativeToUi(amounts.assets.integerValue(BigNumber.ROUND_DOWN).toNumber(), bankInfo.mintDecimals)
    : nativeToUi(amounts.liabilities.integerValue(BigNumber.ROUND_UP).toNumber(), bankInfo.mintDecimals);
  const isDust = uiToNative(amount, bankInfo.mintDecimals).isZero();
  const weightedUSDValue = isLending ? weightedUSDValues.assets.toNumber() : weightedUSDValues.liabilities.toNumber();
  const usdValue = isLending ? usdValues.assets.toNumber() : usdValues.liabilities.toNumber();

  let liquidationPrice: number | null = null;
  if (marginfiAccount instanceof MarginfiAccountWrapper) {
    liquidationPrice = marginfiAccount.computeLiquidationPriceForBank(bank.address);
  } else if ("banks" in props && "oraclePrices" in props) {
    const banks = props.banks;
    const oraclePrices = props.oraclePrices;
    liquidationPrice = marginfiAccount.computeLiquidationPriceForBank(banks, oraclePrices, bank.address);
  }

  return {
    amount,
    usdValue,
    weightedUSDValue,
    liquidationPrice,
    isLending,
    isDust,
    emodeActive: props.emodeActive,
  };
}

/**
 * Converts raw historic bank data array to a map of bank addresses to chart data
 * @param rawBankData - Array of raw historic bank data from database
 * @returns Map<string, historicBankChartData[]> - A map of bank addresses to their formatted chart data
 */
export function convertRawHistoricBankDataToChartData(
  rawBankData: rawHistoricBankData[],
  bank?: ExtendedBankInfo,
  stakepoolMetadataMap?: Map<string, StakePoolMetadata>
): historicBankChartData[] {
  const bankData: historicBankChartData[] = [];

  if (Array.isArray(rawBankData)) {
    rawBankData.forEach((entry: rawHistoricBankData) => {
      const bankAddress = entry.address;

      const price = bank?.info.oraclePrice.priceRealtime.price.toNumber() || 0;
      const isStaked = bank?.info.rawBank.config.assetTag === AssetTag.STAKED;
      const stakepoolMetadata = stakepoolMetadataMap?.get(bankAddress);

      const formattedEntry: historicBankChartData = {
        timestamp: entry.start_time,
        totalDeposits: entry.total_deposits,
        totalBorrows: entry.total_borrows,
        depositRate: entry.deposit_rate_pct,
        borrowRate: entry.borrow_rate_pct,
        utilization: entry.utilization,
        usdPrice: entry.usd_price || price,
        optimalUtilizationRate: parseFloat(entry.ts_optimal_utilization_rate),
        baseRate: entry.base_rate,
        plateauInterestRate: parseFloat(entry.ts_plateau_interest_rate),
        maxInterestRate: parseFloat(entry.ts_max_interest_rate),
        insuranceIrFee: parseFloat(entry.ts_insurance_ir_fee),
        protocolIrFee: parseFloat(entry.ts_protocol_ir_fee),
        programFeeRate: parseFloat(entry.program_fee_rate),
        insuranceFeeFixedApr: parseFloat(entry.ts_insurance_fee_fixed_apr),
        protocolFixedFeeApr: parseFloat(entry.ts_protocol_fixed_fee_apr),
        ...(isStaked && { borrowRate: 0, depositRate: stakepoolMetadata?.validatorRewards }),
      };

      bankData.push(formattedEntry);
    });
  }

  return bankData;
}
