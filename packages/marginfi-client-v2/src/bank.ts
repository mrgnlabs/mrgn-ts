import { Connection, PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import BN from "bn.js";
import { MarginRequirementType } from "./account";
import { PYTH_PRICE_CONF_INTERVALS, SWB_PRICE_CONF_INTERVALS } from "./constants";
import { parsePriceData } from "@pythnetwork/client";
import { getMint, nativeToUi, WrappedI80F48, wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";
import { AggregatorAccount, SwitchboardProgram } from "@switchboard-xyz/solana.js";

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

  public emissionsActiveBorrowing: boolean;
  public emissionsActiveLending: boolean;
  public emissionsRate: number;
  public emissionsMint: PublicKey;
  public emissionsRemaining: BigNumber;

  private priceData: OraclePriceData;

  constructor(label: string, address: PublicKey, rawData: BankData, priceData: OraclePriceData) {
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
      depositLimit: nativeToUi(rawData.config.depositLimit, this.mintDecimals),
      oracleSetup: rawData.config.oracleSetup,
      oracleKeys: rawData.config.oracleKeys,
      interestRateConfig: {
        insuranceFeeFixedApr: wrappedI80F48toBigNumber(rawData.config.interestRateConfig.insuranceFeeFixedApr),
        maxInterestRate: wrappedI80F48toBigNumber(rawData.config.interestRateConfig.maxInterestRate),
        insuranceIrFee: wrappedI80F48toBigNumber(rawData.config.interestRateConfig.insuranceIrFee),
        optimalUtilizationRate: wrappedI80F48toBigNumber(rawData.config.interestRateConfig.optimalUtilizationRate),
        plateauInterestRate: wrappedI80F48toBigNumber(rawData.config.interestRateConfig.plateauInterestRate),
        protocolFixedFeeApr: wrappedI80F48toBigNumber(rawData.config.interestRateConfig.protocolFixedFeeApr),
        protocolIrFee: wrappedI80F48toBigNumber(rawData.config.interestRateConfig.protocolIrFee),
      },
    };

    this.totalAssetShares = wrappedI80F48toBigNumber(rawData.totalAssetShares);
    this.totalLiabilityShares = wrappedI80F48toBigNumber(rawData.totalLiabilityShares);

    this.priceData = priceData;

    const emissionsFlags = rawData.emissionsFlags.toNumber();

    this.emissionsActiveBorrowing = (emissionsFlags & 2) > 0;
    this.emissionsActiveLending = (emissionsFlags & 0) > 0;

    // @todo existence checks here should be temporary - remove once all banks have emission configs
    this.emissionsRate = rawData.emissionsRate.toNumber();
    this.emissionsMint = rawData.emissionsMint;
    this.emissionsRemaining = rawData.emissionsRemaining ? wrappedI80F48toBigNumber(rawData.emissionsRemaining) : new BigNumber(0);
  }

  public describe(): string {
    return `
Bank: ${this.label}, address: ${this.publicKey.toBase58()}
Mint: ${this.mint.toBase58()}, decimals: ${this.mintDecimals}

Total deposits: ${nativeToUi(this.totalAssets, this.mintDecimals)}
Total borrows: ${nativeToUi(this.totalLiabilities, this.mintDecimals)}

Total assets (USD value): ${this.getAssetUsdValue(this.totalAssetShares, MarginRequirementType.Equity, PriceBias.None)}
Total liabilities (USD value): ${this.getLiabilityUsdValue(
      this.totalLiabilityShares,
      MarginRequirementType.Equity,
      PriceBias.None
    )}

Asset price (USD): ${this.getPrice(PriceBias.None)}

Config:
- Asset weight init: ${this.config.assetWeightInit.toFixed(2)}
- Asset weight maint: ${this.config.assetWeightMaint.toFixed(2)}
- Liability weight init: ${this.config.liabilityWeightInit.toFixed(2)}
- Liability weight maint: ${this.config.liabilityWeightMaint.toFixed(2)}
- Max capacity: ${this.config.depositLimit}

LTVs:
- Initial: ${new BigNumber(1).div(this.config.liabilityWeightInit).times(100).toFixed(2)}%
- Maintenance: ${new BigNumber(1).div(this.config.liabilityWeightMaint).times(100).toFixed(2)}%
`;
  }

  get totalAssets(): BigNumber {
    return this.getAssetQuantity(this.totalAssetShares);
  }

  get totalLiabilities(): BigNumber {
    return this.getLiabilityQuantity(this.totalLiabilityShares);
  }

  public async reloadPriceData(connection: Connection) {
    this.priceData = await getOraclePriceData(connection, this.config.oracleSetup, this.config.oracleKeys);
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
    priceBias: PriceBias
  ): BigNumber {
    return this.getUsdValue(this.getAssetQuantity(assetShares), priceBias, this.getAssetWeight(marginRequirementType));
  }

  public getLiabilityUsdValue(
    liabilityShares: BigNumber,
    marginRequirementType: MarginRequirementType,
    priceBias: PriceBias
  ): BigNumber {
    return this.getUsdValue(
      this.getLiabilityQuantity(liabilityShares),
      priceBias,
      this.getLiabilityWeight(marginRequirementType)
    );
  }

  public getUsdValue(quantity: BigNumber, priceBias: PriceBias, weight?: BigNumber, scaleToBase = true): BigNumber {
    const price = this.getPrice(priceBias);
    return quantity
      .times(price)
      .times(weight ?? 1)
      .dividedBy(scaleToBase ? 10 ** this.mintDecimals : 1);
  }

  public getPrice(priceBias: PriceBias = PriceBias.None): BigNumber {
    switch (priceBias) {
      case PriceBias.Lowest:
        return this.priceData.lowestPrice;
      case PriceBias.Highest:
        return this.priceData.highestPrice;
      case PriceBias.None:
        return this.priceData.price;
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
      return utilizationRate.times(plateauInterestRate).div(optimalUtilizationRate);
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

  public async getEmissionsData(connection: Connection): Promise<{ lendingActive: boolean, borrowingActive: boolean, rateUi: BigNumber, remainingUi: BigNumber }> {
    const mint = await getMint(connection, this.emissionsMint);

    const remainingUi = this.emissionsRemaining.div(10 ** mint.decimals);
    let rateUi = this.emissionsRate / (10 ** mint.decimals);

    let bankMintDiff = this.mintDecimals - 6;
    if (bankMintDiff > 0) {
      rateUi = rateUi * (10 ** bankMintDiff);
    } else if (bankMintDiff < 0) {
      rateUi = rateUi * (10 ** bankMintDiff);
    }

    return {
      lendingActive: this.emissionsActiveLending,
      borrowingActive: this.emissionsActiveBorrowing,
      rateUi: new BigNumber(rateUi),
      remainingUi,
    };
  }
}

export { Bank };

// Client types

export interface BankConfig {
  assetWeightInit: BigNumber;
  assetWeightMaint: BigNumber;

  liabilityWeightInit: BigNumber;
  liabilityWeightMaint: BigNumber;

  depositLimit: number;

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

  emissionsFlags: BN;
  emissionsRate: BN;
  emissionsMint: PublicKey;
  emissionsRemaining: WrappedI80F48;
}

export enum OracleSetup {
  None = 0,
  PythEma = 1,
  SwitchboardV2 = 2,
}

export interface BankConfigData {
  assetWeightInit: WrappedI80F48;
  assetWeightMaint: WrappedI80F48;

  liabilityWeightInit: WrappedI80F48;
  liabilityWeightMaint: WrappedI80F48;

  depositLimit: BN;
  borrowLimit: BN;

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

export interface OraclePriceData {
  price: BigNumber;
  confidenceInterval: BigNumber;
  lowestPrice: BigNumber;
  highestPrice: BigNumber;
}

export async function getOraclePriceData(
  connection: Connection,
  oracleSetup: OracleSetup,
  oracleKeys: PublicKey[]
): Promise<OraclePriceData> {
  switch (oracleSetup) {
    case OracleSetup.PythEma:
      const account = await connection.getAccountInfo(oracleKeys[0]!);
      const pythPriceData = parsePriceData(account!.data);

      const pythPrice = new BigNumber(pythPriceData.emaPrice.value);
      const pythConfInterval = new BigNumber(pythPriceData.emaConfidence.value);
      const pythLowestPrice = pythPrice.minus(pythConfInterval.times(PYTH_PRICE_CONF_INTERVALS));
      const pythHighestPrice = pythPrice.plus(pythConfInterval.times(PYTH_PRICE_CONF_INTERVALS));

      return {
        price: pythPrice,
        confidenceInterval: pythConfInterval,
        lowestPrice: pythLowestPrice,
        highestPrice: pythHighestPrice,
      };

    case OracleSetup.SwitchboardV2:
      const swbProgram = await SwitchboardProgram.load("mainnet-beta", connection);
      const aggAccount = new AggregatorAccount(swbProgram, oracleKeys[0]);

      const aggData = await aggAccount.loadData();
      const swbPrice = new BigNumber(AggregatorAccount.decodeLatestValue(aggData)!.toString());
      const swbConfidence = new BigNumber(aggData.latestConfirmedRound.stdDeviation.toBig().toString());

      const swbLowestPrice = swbPrice.minus(swbConfidence.times(SWB_PRICE_CONF_INTERVALS));
      const swbHighestPrice = swbPrice.plus(swbConfidence.times(SWB_PRICE_CONF_INTERVALS));

      return {
        price: swbPrice,
        confidenceInterval: swbConfidence,
        lowestPrice: swbLowestPrice,
        highestPrice: swbHighestPrice,
      };

    default:
      console.log("Invalid oracle setup", oracleSetup);
      throw new Error(`Invalid oracle setup "${oracleSetup}"`);
  }
}
