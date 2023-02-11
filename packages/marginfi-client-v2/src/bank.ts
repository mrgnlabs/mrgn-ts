import { Connection, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import BN from "bn.js";
import { MarginRequirementType } from "./account";
import { WrappedI80F48 } from "./types";
import { nativeToUi, wrappedI80F48toBigNumber } from "./utils";
import { PYTH_PRICE_CONF_INTERVALS } from "./constants";
import { parsePriceData, PriceData } from "@pythnetwork/client";

/**
 * Wrapper class around a specific marginfi group.
 */
class Bank {
  public readonly publicKey: PublicKey;

  public readonly label: string;

  public group: PublicKey;
  public mint: PublicKey;
  public mintDecimals: number;

  public assetShareValue: BigNumber;
  public liabilityShareValue: BigNumber;

  public liquidityVault: PublicKey;
  public liquidityVaultBump: number;
  public liquidityVaultAuthorityBump: number;

  public insuranceVault: PublicKey;
  public insuranceVaultBump: number;
  public insuranceVaultAuthorityBump: number;
  public collectedInsuranceFeesOutstanding: BigNumber;

  public feeVault: PublicKey;
  public feeVaultBump: number;
  public feeVaultAuthorityBump: number;
  public collectedGroupFeesOutstanding: BigNumber;

  public config: BankConfig;

  public totalAssetShares: BigNumber;
  public totalLiabilityShares: BigNumber;

  private priceData: PriceData;

  constructor(label: string, address: PublicKey, rawData: BankData, priceData: PriceData) {
    this.label = label;
    this.publicKey = address;

    this.mint = rawData.mint;
    this.mintDecimals = rawData.mintDecimals;
    this.group = rawData.group;

    this.assetShareValue = wrappedI80F48toBigNumber(rawData.assetShareValue);
    this.liabilityShareValue = wrappedI80F48toBigNumber(rawData.liabilityShareValue);

    this.liquidityVault = rawData.liquidityVault;
    this.liquidityVaultBump = rawData.liquidityVaultBump;
    this.liquidityVaultAuthorityBump = rawData.liquidityVaultAuthorityBump;

    this.insuranceVault = rawData.insuranceVault;
    this.insuranceVaultBump = rawData.insuranceVaultBump;
    this.insuranceVaultAuthorityBump = rawData.insuranceVaultAuthorityBump;

    this.collectedInsuranceFeesOutstanding = wrappedI80F48toBigNumber(rawData.collectedInsuranceFeesOutstanding);

    this.feeVault = rawData.feeVault;
    this.feeVaultBump = rawData.feeVaultBump;
    this.feeVaultAuthorityBump = rawData.feeVaultAuthorityBump;

    this.collectedGroupFeesOutstanding = wrappedI80F48toBigNumber(rawData.collectedGroupFeesOutstanding);

    this.config = {
      assetWeightInit: wrappedI80F48toBigNumber(rawData.config.assetWeightInit),
      assetWeightMaint: wrappedI80F48toBigNumber(rawData.config.assetWeightMaint),
      liabilityWeightInit: wrappedI80F48toBigNumber(rawData.config.liabilityWeightInit),
      liabilityWeightMaint: wrappedI80F48toBigNumber(rawData.config.liabilityWeightMaint),
      maxCapacity: nativeToUi(rawData.config.maxCapacity, this.mintDecimals),
      oracleSetup: rawData.config.oracleSetup,
      oracleKeys: rawData.config.oracleKeys,
      interestRateConfig: {
        insuranceFeeFixedApr: wrappedI80F48toBigNumber(rawData.config.interestRateConfig.insuranceFeeFixedApr),
        maxInterestRate: wrappedI80F48toBigNumber(rawData.config.interestRateConfig.maxInterestRate),
        insuranceIrFee: wrappedI80F48toBigNumber(rawData.config.interestRateConfig.insuranceIrFee),
        optimalUtilizationRate: wrappedI80F48toBigNumber(rawData.config.interestRateConfig.optimalUtilizationRate),
        plateauInterestRate: wrappedI80F48toBigNumber(rawData.config.interestRateConfig.optimalUtilizationRate),
        protocolFixedFeeApr: wrappedI80F48toBigNumber(rawData.config.interestRateConfig.protocolFixedFeeApr),
        protocolIrFee: wrappedI80F48toBigNumber(rawData.config.interestRateConfig.protocolIrFee),
      },
    };

    this.totalAssetShares = wrappedI80F48toBigNumber(rawData.totalAssetShares);
    this.totalLiabilityShares = wrappedI80F48toBigNumber(rawData.totalLiabilityShares);

    this.priceData = priceData;
  }

  get totalAssets(): BigNumber {
    return this.getAssetQuantity(this.totalAssetShares);
  }

  get totalLiabilities(): BigNumber {
    return this.getLiabilityQuantity(this.totalLiabilityShares);
  }

  public async reloadPriceData(connection: Connection) {
    const pythPriceAccount = await connection.getAccountInfo(this.config.oracleKeys[0]);
    this.priceData = parsePriceData(pythPriceAccount!.data);
  }

  public getAssetQuantity(assetShares: BigNumber): BigNumber {
    return assetShares.times(this.assetShareValue);
  }

  public getLiabilityQuantity(liabilityShares: BigNumber): BigNumber {
    return liabilityShares.times(this.liabilityShareValue);
  }

  public getAssetShares(assetValue: BigNumber): BigNumber {
    return assetValue.div(this.assetShareValue);
  }

  public getLiabilityShares(liabilityValue: BigNumber): BigNumber {
    return liabilityValue.div(this.liabilityShareValue);
  }

  public getAssetUsdValue(
    assetShares: BigNumber,
    marginRequirementType: MarginRequirementType,
    priceBias: PriceBias,
  ): BigNumber {
    return this.getUsdValue(this.getAssetQuantity(assetShares), priceBias, this.getAssetWeight(marginRequirementType));
  }

  public getLiabilityUsdValue(
    liabilityShares: BigNumber,
    marginRequirementType: MarginRequirementType,
    priceBias: PriceBias,
  ): BigNumber {
    return this.getUsdValue(
      this.getLiabilityQuantity(liabilityShares),
      priceBias,
      this.getLiabilityWeight(marginRequirementType),
    );
  }

  public getUsdValue(quantity: BigNumber, priceBias: PriceBias, weight?: BigNumber, scaleToBase = true): BigNumber {
    const price = this.getPrice(priceBias);
    return quantity
      .times(price)
      .times(weight ?? 1)
      .dividedBy(scaleToBase ? 10 ** this.mintDecimals : 1);
  }

  public getPrice(priceBias: PriceBias): BigNumber {
    const basePrice = this.priceData.emaPrice;
    const confidenceRange = this.priceData.emaConfidence;

    const basePriceVal = new BigNumber(basePrice.value);
    const confidenceRangeVal = new BigNumber(confidenceRange.value).times(PYTH_PRICE_CONF_INTERVALS);

    switch (priceBias) {
      case PriceBias.Lowest:
        return basePriceVal.minus(confidenceRangeVal);
      case PriceBias.Highest:
        return basePriceVal.plus(confidenceRangeVal);
      case PriceBias.None:
        return basePriceVal;
    }
  }

  // Return asset weight based on margin requirement types
  public getAssetWeight(marginRequirementType: MarginRequirementType): BigNumber {
    switch (marginRequirementType) {
      case MarginRequirementType.Init:
        return this.config.assetWeightInit;
      case MarginRequirementType.Maint:
        return this.config.assetWeightMaint;
      case MarginRequirementType.Equity:
        return new BigNumber(1);
      default:
        throw new Error("Invalid margin requirement type");
    }
  }

  public getLiabilityWeight(marginRequirementType: MarginRequirementType): BigNumber {
    switch (marginRequirementType) {
      case MarginRequirementType.Init:
        return this.config.liabilityWeightInit;
      case MarginRequirementType.Maint:
        return this.config.liabilityWeightMaint;
      case MarginRequirementType.Equity:
        return new BigNumber(1);
      default:
        throw new Error("Invalid margin requirement type");
    }
  }

  public getQuantityFromUsdValue(usdValue: BigNumber, priceBias: PriceBias): BigNumber {
    const price = this.getPrice(priceBias);
    return usdValue.div(price);
  }

  public getInterestRates(): {
    lendingRate: BigNumber;
    borrowingRate: BigNumber;
  } {
    const { insuranceFeeFixedApr, insuranceIrFee, protocolFixedFeeApr, protocolIrFee } = this.config.interestRateConfig;

    const rateFee = insuranceFeeFixedApr.plus(protocolFixedFeeApr);
    const fixedFee = insuranceIrFee.plus(protocolIrFee);

    const interestRate = this.interestRateCurve();
    const utilizationRate = this.getUtilizationRate();

    const lendingRate = interestRate.times(utilizationRate);
    const borrowingRate = interestRate.times(new BigNumber(1).plus(rateFee)).plus(fixedFee);

    return { lendingRate, borrowingRate };
  }

  private interestRateCurve(): BigNumber {
    const { optimalUtilizationRate, plateauInterestRate, maxInterestRate } = this.config.interestRateConfig;

    const utilizationRate = this.getUtilizationRate();

    if (utilizationRate.lte(optimalUtilizationRate)) {
      return utilizationRate.times(maxInterestRate).div(optimalUtilizationRate);
    } else {
      return utilizationRate
        .minus(optimalUtilizationRate)
        .div(new BigNumber(1).minus(optimalUtilizationRate))
        .times(maxInterestRate.minus(plateauInterestRate))
        .plus(plateauInterestRate);
    }
  }

  private getUtilizationRate(): BigNumber {
    return this.totalLiabilities.div(this.totalAssets);
  }
}

export default Bank;

// Client types

export interface BankConfig {
  assetWeightInit: BigNumber;
  assetWeightMaint: BigNumber;

  liabilityWeightInit: BigNumber;
  liabilityWeightMaint: BigNumber;

  maxCapacity: number;

  interestRateConfig: InterestRateConfig;

  oracleSetup: OracleSetup;
  oracleKeys: PublicKey[];
}

export interface InterestRateConfig {
  // Curve Params
  optimalUtilizationRate: BigNumber;
  plateauInterestRate: BigNumber;
  maxInterestRate: BigNumber;

  // Fees
  insuranceFeeFixedApr: BigNumber;
  insuranceIrFee: BigNumber;
  protocolFixedFeeApr: BigNumber;
  protocolIrFee: BigNumber;
}

// On-chain types

export interface BankData {
  mint: PublicKey;
  mintDecimals: number;

  group: PublicKey;

  assetShareValue: WrappedI80F48;
  liabilityShareValue: WrappedI80F48;

  liquidityVault: PublicKey;
  liquidityVaultBump: number;
  liquidityVaultAuthorityBump: number;

  insuranceVault: PublicKey;
  insuranceVaultBump: number;
  insuranceVaultAuthorityBump: number;
  collectedInsuranceFeesOutstanding: WrappedI80F48;

  feeVault: PublicKey;
  feeVaultBump: number;
  feeVaultAuthorityBump: number;
  collectedGroupFeesOutstanding: WrappedI80F48;

  totalLiabilityShares: WrappedI80F48;
  totalAssetShares: WrappedI80F48;

  lastUpdate: BN;

  config: BankConfigData;
}

export enum OracleSetup {
  None = 0,
  Pyth = 1,
}

export interface BankConfigData {
  assetWeightInit: WrappedI80F48;
  assetWeightMaint: WrappedI80F48;

  liabilityWeightInit: WrappedI80F48;
  liabilityWeightMaint: WrappedI80F48;

  maxCapacity: BN;

  interestRateConfig: InterestRateConfigData;

  oracleSetup: OracleSetup;
  oracleKeys: PublicKey[];
}

export interface InterestRateConfigData {
  // Curve Params
  optimalUtilizationRate: WrappedI80F48;
  plateauInterestRate: WrappedI80F48;
  maxInterestRate: WrappedI80F48;

  // Fees
  insuranceFeeFixedApr: WrappedI80F48;
  insuranceIrFee: WrappedI80F48;
  protocolFixedFeeApr: WrappedI80F48;
  protocolIrFee: WrappedI80F48;
}

export enum PriceBias {
  Lowest = 0,
  None = 1,
  Highest = 2,
}
