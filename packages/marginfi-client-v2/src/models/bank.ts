import { BankMetadata, nativeToUi } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { MarginRequirementType } from "./account";
import { MarginfiIdlType } from "../idl";
import { PythPushFeedIdMap } from "../utils";
import {
  AssetTag,
  BankConfigRaw,
  BankConfigType,
  BankRaw,
  BankType,
  getPrice,
  InterestRateConfig,
  OperationalState,
  OraclePrice,
  OracleSetup,
  RiskTier,
} from "../services";

import {
  decodeBankRaw,
  parseBankRaw,
  parseBankConfigRaw,
  getTotalAssetQuantity,
  getTotalLiabilityQuantity,
  getAssetQuantity,
  getLiabilityQuantity,
  getAssetShares,
  getLiabilityShares,
  computeAssetUsdValue,
  getAssetWeight,
  getLiabilityWeight,
  computeLiabilityUsdValue,
  computeUsdValue,
  computeTvl,
  computeInterestRates,
  computeBaseInterestRate,
  computeUtilizationRate,
  computeRemainingCapacity,
} from "../services/bank/utils";
import { EmodeSettings } from "./emode-settings";
import { PriceBias } from "../services/price/types";

const SECONDS_PER_DAY = 24 * 60 * 60;
const SECONDS_PER_YEAR = SECONDS_PER_DAY * 365.25;

// ----------------------------------------------------------------------------
// Client types
// ----------------------------------------------------------------------------

class Bank implements BankType {
  constructor(
    public readonly address: PublicKey,
    public readonly mint: PublicKey,
    public readonly mintDecimals: number,
    public readonly group: PublicKey,
    public readonly assetShareValue: BigNumber,
    public readonly liabilityShareValue: BigNumber,
    public readonly liquidityVault: PublicKey,
    public readonly liquidityVaultBump: number,
    public readonly liquidityVaultAuthorityBump: number,
    public readonly insuranceVault: PublicKey,
    public readonly insuranceVaultBump: number,
    public readonly insuranceVaultAuthorityBump: number,
    public readonly collectedInsuranceFeesOutstanding: BigNumber,
    public readonly feeVault: PublicKey,
    public readonly feeVaultBump: number,
    public readonly feeVaultAuthorityBump: number,
    public readonly collectedGroupFeesOutstanding: BigNumber,
    public readonly lastUpdate: number,
    public config: BankConfig,
    public readonly totalAssetShares: BigNumber,
    public readonly totalLiabilityShares: BigNumber,
    public readonly emissionsActiveBorrowing: boolean,
    public readonly emissionsActiveLending: boolean,
    public readonly emissionsRate: number,
    public readonly emissionsMint: PublicKey,
    public readonly emissionsRemaining: BigNumber,
    public readonly oracleKey: PublicKey,
    public readonly emode: EmodeSettings,
    public readonly pythShardId?: number,
    public readonly tokenSymbol?: string
  ) {}

  static decodeBankRaw(encoded: Buffer, idl: MarginfiIdlType): BankRaw {
    return decodeBankRaw(encoded, idl);
  }

  static fromBuffer(bankPk: PublicKey, rawData: Buffer, idl: MarginfiIdlType, feedIdMap: PythPushFeedIdMap): Bank {
    const accountParsed = Bank.decodeBankRaw(rawData, idl);
    return Bank.fromAccountParsed(bankPk, accountParsed, feedIdMap);
  }

  static fromAccountParsed(
    address: PublicKey,
    accountParsed: BankRaw,
    feedIdMap: PythPushFeedIdMap,
    bankMetadata?: BankMetadata
  ): Bank {
    const props = parseBankRaw(address, accountParsed, feedIdMap, bankMetadata);
    return new Bank(
      props.address,
      props.mint,
      props.mintDecimals,
      props.group,
      props.assetShareValue,
      props.liabilityShareValue,
      props.liquidityVault,
      props.liquidityVaultBump,
      props.liquidityVaultAuthorityBump,
      props.insuranceVault,
      props.insuranceVaultBump,
      props.insuranceVaultAuthorityBump,
      props.collectedInsuranceFeesOutstanding,
      props.feeVault,
      props.feeVaultBump,
      props.feeVaultAuthorityBump,
      props.collectedGroupFeesOutstanding,
      props.lastUpdate,
      props.config,
      props.totalAssetShares,
      props.totalLiabilityShares,
      props.emissionsActiveBorrowing,
      props.emissionsActiveLending,
      props.emissionsRate,
      props.emissionsMint,
      props.emissionsRemaining,
      props.oracleKey,
      props.emode,
      props.pythShardId,
      props.tokenSymbol
    );
  }

  static withEmodeWeights(bank: Bank, emodeWeights: { assetWeightMaint: BigNumber; assetWeightInit: BigNumber }): Bank {
    const newBank = Object.create(Bank.prototype);

    Object.assign(newBank, bank);

    newBank.config = Object.assign({}, bank.config);
    newBank.config.assetWeightInit = BigNumber.max(bank.config.assetWeightInit, emodeWeights.assetWeightInit);
    newBank.config.assetWeightMaint = BigNumber.max(bank.config.assetWeightMaint, emodeWeights.assetWeightMaint);

    return newBank;
  }

  static getPrice(
    oraclePrice: OraclePrice,
    priceBias: PriceBias = PriceBias.None,
    weightedPrice: boolean = false
  ): BigNumber {
    return getPrice(oraclePrice, priceBias, weightedPrice);
  }

  static computeQuantityFromUsdValue(
    oraclePrice: OraclePrice,
    usdValue: BigNumber,
    priceBias: PriceBias,
    weightedPrice: boolean
  ): BigNumber {
    const price = getPrice(oraclePrice, priceBias, weightedPrice);
    return usdValue.div(price);
  }

  getTotalAssetQuantity(): BigNumber {
    return getTotalAssetQuantity(this);
  }

  getTotalLiabilityQuantity(): BigNumber {
    return getTotalLiabilityQuantity(this);
  }

  getAssetQuantity(assetShares: BigNumber): BigNumber {
    return getAssetQuantity(this, assetShares);
  }

  getLiabilityQuantity(liabilityShares: BigNumber): BigNumber {
    return getLiabilityQuantity(this, liabilityShares);
  }

  getAssetShares(assetQuantity: BigNumber): BigNumber {
    return getAssetShares(this, assetQuantity);
  }

  getLiabilityShares(liabilityQuantity: BigNumber): BigNumber {
    return getLiabilityShares(this, liabilityQuantity);
  }

  computeAssetUsdValue(
    oraclePrice: OraclePrice,
    assetShares: BigNumber,
    marginRequirementType: MarginRequirementType,
    priceBias: PriceBias
  ): BigNumber {
    return computeAssetUsdValue(this, oraclePrice, assetShares, marginRequirementType, priceBias);
  }

  computeLiabilityUsdValue(
    oraclePrice: OraclePrice,
    liabilityShares: BigNumber,
    marginRequirementType: MarginRequirementType,
    priceBias: PriceBias
  ): BigNumber {
    return computeLiabilityUsdValue(this, oraclePrice, liabilityShares, marginRequirementType, priceBias);
  }

  computeUsdValue(
    oraclePrice: OraclePrice,
    quantity: BigNumber,
    priceBias: PriceBias,
    weightedPrice: boolean,
    weight?: BigNumber,
    scaleToBase: boolean = true
  ): BigNumber {
    return computeUsdValue(this, oraclePrice, quantity, priceBias, weightedPrice, weight, scaleToBase);
  }

  getAssetWeight(
    marginRequirementType: MarginRequirementType,
    oraclePrice: OraclePrice,
    ignoreSoftLimits: boolean = false,
    assetWeightInitOverride?: BigNumber
  ): BigNumber {
    return getAssetWeight(this, marginRequirementType, oraclePrice, {
      ignoreSoftLimits,
      assetWeightInitOverride,
    });
  }

  getLiabilityWeight(marginRequirementType: MarginRequirementType): BigNumber {
    return getLiabilityWeight(this.config, marginRequirementType);
  }

  computeTvl(oraclePrice: OraclePrice): BigNumber {
    return computeTvl(this, oraclePrice);
  }

  computeInterestRates(): {
    lendingRate: BigNumber;
    borrowingRate: BigNumber;
  } {
    return computeInterestRates(this);
  }

  computeBaseInterestRate(): BigNumber {
    return computeBaseInterestRate(this);
  }

  computeUtilizationRate(): BigNumber {
    return computeUtilizationRate(this);
  }

  computeRemainingCapacity(): {
    depositCapacity: BigNumber;
    borrowCapacity: BigNumber;
  } {
    return computeRemainingCapacity(this);
  }

  describe(oraclePrice: OraclePrice): string {
    return `
Bank address: ${this.address.toBase58()}
Mint: ${this.mint.toBase58()}, decimals: ${this.mintDecimals}

Total deposits: ${nativeToUi(this.getTotalAssetQuantity(), this.mintDecimals)}
Total borrows: ${nativeToUi(this.getTotalLiabilityQuantity(), this.mintDecimals)}

Total assets (USD value): ${this.computeAssetUsdValue(
      oraclePrice,
      this.totalAssetShares,
      MarginRequirementType.Equity,
      PriceBias.None
    )}
Total liabilities (USD value): ${this.computeLiabilityUsdValue(
      oraclePrice,
      this.totalLiabilityShares,
      MarginRequirementType.Equity,
      PriceBias.None
    )}

Asset price (USD): ${Bank.getPrice(oraclePrice, PriceBias.None, false)}
Asset price Weighted (USD): ${Bank.getPrice(oraclePrice, PriceBias.None, true)}

Config:
- Asset weight init: ${this.config.assetWeightInit.toFixed(2)}
- Asset weight maint: ${this.config.assetWeightMaint.toFixed(2)}
- Liability weight init: ${this.config.liabilityWeightInit.toFixed(2)}
- Liability weight maint: ${this.config.liabilityWeightMaint.toFixed(2)}

- Deposit limit: ${this.config.depositLimit}
- Borrow limit: ${this.config.borrowLimit}

LTVs:
- Initial: ${new BigNumber(1).div(this.config.liabilityWeightInit).times(100).toFixed(2)}%
- Maintenance: ${new BigNumber(1).div(this.config.liabilityWeightMaint).times(100).toFixed(2)}%
`;
  }
}

class BankConfig implements BankConfigType {
  constructor(
    public assetWeightInit: BigNumber,
    public assetWeightMaint: BigNumber,
    public readonly liabilityWeightInit: BigNumber,
    public readonly liabilityWeightMaint: BigNumber,
    public readonly depositLimit: BigNumber,
    public readonly borrowLimit: BigNumber,
    public readonly riskTier: RiskTier,
    public readonly totalAssetValueInitLimit: BigNumber,
    public readonly assetTag: AssetTag,
    public readonly oracleSetup: OracleSetup,
    public readonly oracleKeys: PublicKey[],
    public readonly oracleMaxAge: number,
    public readonly interestRateConfig: InterestRateConfig,
    public readonly operationalState: OperationalState
  ) {}

  static fromAccountParsed(bankConfigRaw: BankConfigRaw): BankConfig {
    const bankConfig = parseBankConfigRaw(bankConfigRaw);
    return new BankConfig(
      bankConfig.assetWeightInit,
      bankConfig.assetWeightMaint,
      bankConfig.liabilityWeightInit,
      bankConfig.liabilityWeightMaint,
      bankConfig.depositLimit,
      bankConfig.borrowLimit,
      bankConfig.riskTier,
      bankConfig.totalAssetValueInitLimit,
      bankConfig.assetTag,
      bankConfig.oracleSetup,
      bankConfig.oracleKeys,
      bankConfig.oracleMaxAge,
      bankConfig.interestRateConfig,
      bankConfig.operationalState
    );
  }
}

export { Bank, BankConfig };
