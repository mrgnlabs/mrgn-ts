import { WrappedI80F48, nativeToUi, wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import BN from "bn.js";
import { MarginRequirementType } from "./account";
import { PriceBias, OraclePrice } from "./price";
import { BorshCoder } from "@coral-xyz/anchor";
import { AccountType } from "../types";
import { MARGINFI_IDL } from "../idl";

const SECONDS_PER_DAY = 24 * 60 * 60;
const SECONDS_PER_YEAR = SECONDS_PER_DAY * 365.25;

// ----------------------------------------------------------------------------
// On-chain types
// ----------------------------------------------------------------------------

interface BankRaw {
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

  config: BankConfigRaw;

  emissionsFlags: BN;
  emissionsRate: BN;
  emissionsMint: PublicKey;
  emissionsRemaining: WrappedI80F48;
}

interface BankConfigRaw {
  assetWeightInit: WrappedI80F48;
  assetWeightMaint: WrappedI80F48;

  liabilityWeightInit: WrappedI80F48;
  liabilityWeightMaint: WrappedI80F48;

  depositLimit: BN;
  borrowLimit: BN;
  riskTier: RiskTierRaw;

  interestRateConfig: InterestRateConfigRaw;

  oracleSetup: OracleSetupRaw;
  oracleKeys: PublicKey[];
}

type RiskTierRaw = { collateral: {} } | { isolated: {} };

interface InterestRateConfigRaw {
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

type OracleSetupRaw = number;

export type { BankRaw, BankConfigRaw, RiskTierRaw, InterestRateConfigRaw, OracleSetupRaw };

// ----------------------------------------------------------------------------
// Client types
// ----------------------------------------------------------------------------

class Bank {
  public address: PublicKey;

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

  public lastUpdate: number;

  public config: BankConfig;

  public totalAssetShares: BigNumber;
  public totalLiabilityShares: BigNumber;

  public emissionsActiveBorrowing: boolean;
  public emissionsActiveLending: boolean;
  public emissionsRate: number;
  public emissionsMint: PublicKey;
  public emissionsRemaining: BigNumber;

  constructor(
    address: PublicKey,
    mint: PublicKey,
    mintDecimals: number,
    group: PublicKey,
    assetShareValue: BigNumber,
    liabilityShareValue: BigNumber,
    liquidityVault: PublicKey,
    liquidityVaultBump: number,
    liquidityVaultAuthorityBump: number,
    insuranceVault: PublicKey,
    insuranceVaultBump: number,
    insuranceVaultAuthorityBump: number,
    collectedInsuranceFeesOutstanding: BigNumber,
    feeVault: PublicKey,
    feeVaultBump: number,
    feeVaultAuthorityBump: number,
    collectedGroupFeesOutstanding: BigNumber,
    lastUpdate: BN,
    config: BankConfig,
    totalAssetShares: BigNumber,
    totalLiabilityShares: BigNumber,
    emissionsActiveBorrowing: boolean,
    emissionsActiveLending: boolean,
    emissionsRate: number,
    emissionsMint: PublicKey,
    emissionsRemaining: BigNumber
  ) {
    this.address = address;

    this.group = group;
    this.mint = mint;
    this.mintDecimals = mintDecimals;

    this.assetShareValue = assetShareValue;
    this.liabilityShareValue = liabilityShareValue;

    this.liquidityVault = liquidityVault;
    this.liquidityVaultBump = liquidityVaultBump;
    this.liquidityVaultAuthorityBump = liquidityVaultAuthorityBump;

    this.insuranceVault = insuranceVault;
    this.insuranceVaultBump = insuranceVaultBump;
    this.insuranceVaultAuthorityBump = insuranceVaultAuthorityBump;
    this.collectedInsuranceFeesOutstanding = collectedInsuranceFeesOutstanding;

    this.feeVault = feeVault;
    this.feeVaultBump = feeVaultBump;
    this.feeVaultAuthorityBump = feeVaultAuthorityBump;
    this.collectedGroupFeesOutstanding = collectedGroupFeesOutstanding;

    this.lastUpdate = lastUpdate.toNumber();

    this.config = config;

    this.totalAssetShares = totalAssetShares;
    this.totalLiabilityShares = totalLiabilityShares;

    this.emissionsActiveBorrowing = emissionsActiveBorrowing;
    this.emissionsActiveLending = emissionsActiveLending;
    this.emissionsRate = emissionsRate;
    this.emissionsMint = emissionsMint;
    this.emissionsRemaining = emissionsRemaining;
  }

  static decodeBankRaw(encoded: Buffer): BankRaw {
    const coder = new BorshCoder(MARGINFI_IDL);
    return coder.accounts.decode(AccountType.Bank, encoded);
  }

  static fromBuffer(address: PublicKey, buffer: Buffer): Bank {
    const accountParsed = Bank.decodeBankRaw(buffer);
    return Bank.fromAccountParsed(address, accountParsed);
  }

  static fromAccountParsed(address: PublicKey, accountParsed: BankRaw): Bank {
    const emissionsFlags = accountParsed.emissionsFlags.toNumber();

    const mint = accountParsed.mint;
    const mintDecimals = accountParsed.mintDecimals;
    const group = accountParsed.group;

    const assetShareValue = wrappedI80F48toBigNumber(accountParsed.assetShareValue);
    const liabilityShareValue = wrappedI80F48toBigNumber(accountParsed.liabilityShareValue);

    const liquidityVault = accountParsed.liquidityVault;
    const liquidityVaultBump = accountParsed.liquidityVaultBump;
    const liquidityVaultAuthorityBump = accountParsed.liquidityVaultAuthorityBump;

    const insuranceVault = accountParsed.insuranceVault;
    const insuranceVaultBump = accountParsed.insuranceVaultBump;
    const insuranceVaultAuthorityBump = accountParsed.insuranceVaultAuthorityBump;

    const collectedInsuranceFeesOutstanding = wrappedI80F48toBigNumber(accountParsed.collectedInsuranceFeesOutstanding);

    const feeVault = accountParsed.feeVault;
    const feeVaultBump = accountParsed.feeVaultBump;
    const feeVaultAuthorityBump = accountParsed.feeVaultAuthorityBump;

    const collectedGroupFeesOutstanding = wrappedI80F48toBigNumber(accountParsed.collectedGroupFeesOutstanding);

    const config = BankConfig.fromAccountParsed(accountParsed.config);

    const totalAssetShares = wrappedI80F48toBigNumber(accountParsed.totalAssetShares);
    const totalLiabilityShares = wrappedI80F48toBigNumber(accountParsed.totalLiabilityShares);

    const emissionsActiveBorrowing = (emissionsFlags & 1) > 0;
    const emissionsActiveLending = (emissionsFlags & 2) > 0;

    // @todo existence checks here should be temporary - remove once all banks have emission configs
    const emissionsRate = accountParsed.emissionsRate.toNumber();
    const emissionsMint = accountParsed.emissionsMint;
    const emissionsRemaining = accountParsed.emissionsRemaining
      ? wrappedI80F48toBigNumber(accountParsed.emissionsRemaining)
      : new BigNumber(0);

    return new Bank(
      address,
      mint,
      mintDecimals,
      group,
      assetShareValue,
      liabilityShareValue,
      liquidityVault,
      liquidityVaultBump,
      liquidityVaultAuthorityBump,
      insuranceVault,
      insuranceVaultBump,
      insuranceVaultAuthorityBump,
      collectedInsuranceFeesOutstanding,
      feeVault,
      feeVaultBump,
      feeVaultAuthorityBump,
      collectedGroupFeesOutstanding,
      accountParsed.lastUpdate,
      config,
      totalAssetShares,
      totalLiabilityShares,
      emissionsActiveBorrowing,
      emissionsActiveLending,
      emissionsRate,
      emissionsMint,
      emissionsRemaining
    );
  }

  getTotalAssetQuantity(): BigNumber {
    return this.totalAssetShares.times(this.assetShareValue);
  }

  getTotalLiabilityQuantity(): BigNumber {
    return this.totalLiabilityShares.times(this.liabilityShareValue);
  }

  getAssetQuantity(assetShares: BigNumber): BigNumber {
    return assetShares.times(this.assetShareValue);
  }

  getLiabilityQuantity(liabilityShares: BigNumber): BigNumber {
    return liabilityShares.times(this.liabilityShareValue);
  }

  getAssetShares(assetQuantity: BigNumber): BigNumber {
    return assetQuantity.times(this.assetShareValue);
  }

  getLiabilityShares(liabilityQuantity: BigNumber): BigNumber {
    return liabilityQuantity.times(this.liabilityShareValue);
  }

  computeAssetUsdValue(
    oraclePrice: OraclePrice,
    assetShares: BigNumber,
    marginRequirementType: MarginRequirementType,
    priceBias: PriceBias
  ): BigNumber {
    const assetQuantity = this.getAssetQuantity(assetShares);
    const assetWeight = this.getAssetWeight(marginRequirementType);
    return this.computeUsdValue(oraclePrice, assetQuantity, priceBias, assetWeight);
  }

  computeLiabilityUsdValue(
    oraclePrice: OraclePrice,
    liabilityShares: BigNumber,
    marginRequirementType: MarginRequirementType,
    priceBias: PriceBias
  ): BigNumber {
    const liabilityQuantity = this.getLiabilityQuantity(liabilityShares);
    const liabilityWeight = this.getLiabilityWeight(marginRequirementType);
    return this.computeUsdValue(oraclePrice, liabilityQuantity, priceBias, liabilityWeight);
  }

  computeUsdValue(
    oraclePrice: OraclePrice,
    quantity: BigNumber,
    priceBias: PriceBias,
    weight?: BigNumber,
    scaleToBase: boolean = true
  ): BigNumber {
    const price = this.getPrice(oraclePrice, priceBias);
    return quantity
      .times(price)
      .times(weight ?? 1)
      .dividedBy(scaleToBase ? 10 ** this.mintDecimals : 1);
  }

  computeQuantityFromUsdValue(oraclePrice: OraclePrice, usdValue: BigNumber, priceBias: PriceBias): BigNumber {
    const price = this.getPrice(oraclePrice, priceBias);
    return usdValue.div(price);
  }

  getPrice(oraclePrice: OraclePrice, priceBias: PriceBias = PriceBias.None): BigNumber {
    switch (priceBias) {
      case PriceBias.Lowest:
        return oraclePrice.lowestPrice;
      case PriceBias.Highest:
        return oraclePrice.highestPrice;
      case PriceBias.None:
        return oraclePrice.price;
    }
  }

  getAssetWeight(marginRequirementType: MarginRequirementType): BigNumber {
    switch (marginRequirementType) {
      case MarginRequirementType.Initial:
        return this.config.assetWeightInit;
      case MarginRequirementType.Maintenance:
        return this.config.assetWeightMaint;
      case MarginRequirementType.Equity:
        return new BigNumber(1);
      default:
        throw new Error("Invalid margin requirement type");
    }
  }

  getLiabilityWeight(marginRequirementType: MarginRequirementType): BigNumber {
    switch (marginRequirementType) {
      case MarginRequirementType.Initial:
        return this.config.liabilityWeightInit;
      case MarginRequirementType.Maintenance:
        return this.config.liabilityWeightMaint;
      case MarginRequirementType.Equity:
        return new BigNumber(1);
      default:
        throw new Error("Invalid margin requirement type");
    }
  }

  computeTvl(oraclePrice: OraclePrice): BigNumber {
    return this.computeAssetUsdValue(
      oraclePrice,
      this.totalAssetShares,
      MarginRequirementType.Equity,
      PriceBias.None
    ).minus(
      this.computeLiabilityUsdValue(
        oraclePrice,
        this.totalLiabilityShares,
        MarginRequirementType.Equity,
        PriceBias.None
      )
    );
  }

  computeInterestRates(): {
    lendingRate: BigNumber;
    borrowingRate: BigNumber;
  } {
    const { insuranceFeeFixedApr, insuranceIrFee, protocolFixedFeeApr, protocolIrFee } = this.config.interestRateConfig;

    const rateFee = insuranceFeeFixedApr.plus(protocolFixedFeeApr);
    const fixedFee = insuranceIrFee.plus(protocolIrFee);

    const baseInterestRate = this.computeBaseInterestRate();
    const utilizationRate = this.computeUtilizationRate();

    const lendingRate = baseInterestRate.times(utilizationRate);
    const borrowingRate = baseInterestRate.times(new BigNumber(1).plus(rateFee)).plus(fixedFee);

    return { lendingRate, borrowingRate };
  }

  computeBaseInterestRate(): BigNumber {
    const { optimalUtilizationRate, plateauInterestRate, maxInterestRate } = this.config.interestRateConfig;

    const utilizationRate = this.computeUtilizationRate();

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

  computeUtilizationRate(): BigNumber {
    const assets = this.getTotalAssetQuantity();
    const liabilities = this.getTotalLiabilityQuantity();
    if (assets.isZero()) return new BigNumber(0);
    return liabilities.div(assets);
  }

  computeRemainingCapacity(): {
    depositCapacity: BigNumber;
    borrowCapacity: BigNumber;
  } {
    const totalDeposits = this.getTotalAssetQuantity();
    const remainingCapacity = BigNumber.max(0, this.config.depositLimit.minus(totalDeposits));

    const totalBorrows = this.getTotalLiabilityQuantity();
    const remainingBorrowCapacity = BigNumber.max(0, this.config.borrowLimit.minus(totalBorrows));

    const durationSinceLastAccrual = Date.now() / 1000 - this.lastUpdate;

    const {lendingRate, borrowingRate} = this.computeInterestRates();

    const outstandingLendingInterest = lendingRate
      .times(durationSinceLastAccrual)
      .dividedBy(SECONDS_PER_YEAR)
      .times(totalDeposits);
    const outstandingBorrowInterest = borrowingRate
      .times(durationSinceLastAccrual)
      .dividedBy(SECONDS_PER_YEAR)
      .times(totalBorrows);

    const depositCapacity = remainingCapacity.minus(outstandingLendingInterest.times(2));
    const borrowCapacity = remainingBorrowCapacity.minus(outstandingBorrowInterest.times(2));

    return {
      depositCapacity,
      borrowCapacity,
    };
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

Asset price (USD): ${this.getPrice(oraclePrice, PriceBias.None)}

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

class BankConfig {
  public assetWeightInit: BigNumber;
  public assetWeightMaint: BigNumber;

  public liabilityWeightInit: BigNumber;
  public liabilityWeightMaint: BigNumber;

  public depositLimit: BigNumber;
  public borrowLimit: BigNumber;

  public riskTier: RiskTier;

  public interestRateConfig: InterestRateConfig;

  public oracleSetup: OracleSetup;
  public oracleKeys: PublicKey[];

  constructor(
    assetWeightInit: BigNumber,
    assetWeightMaint: BigNumber,
    liabilityWeightInit: BigNumber,
    liabilityWeightMaint: BigNumber,
    depositLimit: BigNumber,
    borrowLimit: BigNumber,
    riskTier: RiskTier,
    oracleSetup: OracleSetup,
    oracleKeys: PublicKey[],
    interestRateConfig: InterestRateConfig
  ) {
    this.assetWeightInit = assetWeightInit;
    this.assetWeightMaint = assetWeightMaint;
    this.liabilityWeightInit = liabilityWeightInit;
    this.liabilityWeightMaint = liabilityWeightMaint;
    this.depositLimit = depositLimit;
    this.borrowLimit = borrowLimit;
    this.riskTier = riskTier;
    this.oracleSetup = oracleSetup;
    this.oracleKeys = oracleKeys;
    this.interestRateConfig = interestRateConfig;
  }

  static fromAccountParsed(bankConfigRaw: BankConfigRaw): BankConfig {
    const assetWeightInit = wrappedI80F48toBigNumber(bankConfigRaw.assetWeightInit);
    const assetWeightMaint = wrappedI80F48toBigNumber(bankConfigRaw.assetWeightMaint);
    const liabilityWeightInit = wrappedI80F48toBigNumber(bankConfigRaw.liabilityWeightInit);
    const liabilityWeightMaint = wrappedI80F48toBigNumber(bankConfigRaw.liabilityWeightMaint);
    const depositLimit = BigNumber(bankConfigRaw.depositLimit.toString());
    const borrowLimit = BigNumber(bankConfigRaw.borrowLimit.toString());
    const riskTier = parseRiskTier(bankConfigRaw.riskTier);
    const oracleSetup = parseOracleSetup(bankConfigRaw.oracleSetup);
    const oracleKeys = bankConfigRaw.oracleKeys;
    const interestRateConfig = {
      insuranceFeeFixedApr: wrappedI80F48toBigNumber(bankConfigRaw.interestRateConfig.insuranceFeeFixedApr),
      maxInterestRate: wrappedI80F48toBigNumber(bankConfigRaw.interestRateConfig.maxInterestRate),
      insuranceIrFee: wrappedI80F48toBigNumber(bankConfigRaw.interestRateConfig.insuranceIrFee),
      optimalUtilizationRate: wrappedI80F48toBigNumber(bankConfigRaw.interestRateConfig.optimalUtilizationRate),
      plateauInterestRate: wrappedI80F48toBigNumber(bankConfigRaw.interestRateConfig.plateauInterestRate),
      protocolFixedFeeApr: wrappedI80F48toBigNumber(bankConfigRaw.interestRateConfig.protocolFixedFeeApr),
      protocolIrFee: wrappedI80F48toBigNumber(bankConfigRaw.interestRateConfig.protocolIrFee),
    };

    return {
      assetWeightInit,
      assetWeightMaint,
      liabilityWeightInit,
      liabilityWeightMaint,
      depositLimit,
      borrowLimit,
      riskTier,
      oracleSetup,
      oracleKeys,
      interestRateConfig,
    };
  }
}

enum RiskTier {
  Collateral = "Collateral",
  Isolated = "Isolated",
}

interface InterestRateConfig {
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

enum OracleSetup {
  None = 0,
  PythEma = 1,
  SwitchboardV2 = 2,
}

function parseRiskTier(riskTierRaw: RiskTierRaw): RiskTier {
  switch (Object.keys(riskTierRaw)[0].toLowerCase()) {
    case "collateral":
      return RiskTier.Collateral;
    case "isolated":
      return RiskTier.Isolated;
    default:
      throw new Error(`Invalid risk tier "${riskTierRaw}"`);
  }
}

function parseOracleSetup(oracleSetupRaw: OracleSetupRaw): OracleSetup {
  switch (oracleSetupRaw) {
    case 0:
      return OracleSetup.None;
    case 1:
      return OracleSetup.PythEma;
    case 2:
      return OracleSetup.SwitchboardV2;
    default:
      throw new Error(`Invalid oracle setup "${oracleSetupRaw}"`);
  }
}

export type { InterestRateConfig };
export { Bank, BankConfig, RiskTier, OracleSetup, parseRiskTier, parseOracleSetup };

// ----------------------------------------------------------------------------
// Attributes
// ----------------------------------------------------------------------------
