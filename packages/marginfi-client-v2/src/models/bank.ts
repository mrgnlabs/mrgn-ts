import { BankMetadata, WrappedI80F48, nativeToUi, wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import BN from "bn.js";
import { isWeightedPrice, MarginRequirementType } from "./account";
import { PriceBias, OraclePrice, getPriceWithConfidence } from "./price";
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
  totalAssetValueInitLimit: BN;

  interestRateConfig: InterestRateConfigRaw;
  operationalState: OperationalStateRaw;

  oracleSetup: OracleSetupRaw;
  oracleKeys: PublicKey[];
}

type RiskTierRaw = { collateral: {} } | { isolated: {} };

type OperationalStateRaw = number;

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
  public tokenSymbol: string | undefined;

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
    emissionsRemaining: BigNumber,
    tokenSymbol?: string
  ) {
    this.address = address;
    this.tokenSymbol = tokenSymbol;

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

  static fromAccountParsed(address: PublicKey, accountParsed: BankRaw, bankMetadata?: BankMetadata): Bank {
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
      emissionsRemaining,
      bankMetadata?.tokenSymbol
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
    const assetWeight = this.getAssetWeight(marginRequirementType, oraclePrice);
    const isWeighted = isWeightedPrice(marginRequirementType);
    return this.computeUsdValue(oraclePrice, assetQuantity, priceBias, isWeighted, assetWeight);
  }

  computeLiabilityUsdValue(
    oraclePrice: OraclePrice,
    liabilityShares: BigNumber,
    marginRequirementType: MarginRequirementType,
    priceBias: PriceBias
  ): BigNumber {
    const liabilityQuantity = this.getLiabilityQuantity(liabilityShares);
    const liabilityWeight = this.getLiabilityWeight(marginRequirementType);
    const isWeighted = isWeightedPrice(marginRequirementType);
    return this.computeUsdValue(oraclePrice, liabilityQuantity, priceBias, isWeighted, liabilityWeight);
  }

  computeUsdValue(
    oraclePrice: OraclePrice,
    quantity: BigNumber,
    priceBias: PriceBias,
    weightedPrice: boolean,
    weight?: BigNumber,
    scaleToBase: boolean = true
  ): BigNumber {
    const price = this.getPrice(oraclePrice, priceBias, weightedPrice);
    return quantity
      .times(price)
      .times(weight ?? 1)
      .dividedBy(scaleToBase ? 10 ** this.mintDecimals : 1);
  }

  computeQuantityFromUsdValue(
    oraclePrice: OraclePrice,
    usdValue: BigNumber,
    priceBias: PriceBias,
    weightedPrice: boolean
  ): BigNumber {
    const price = this.getPrice(oraclePrice, priceBias, weightedPrice);
    return usdValue.div(price);
  }

  getPrice(oraclePrice: OraclePrice, priceBias: PriceBias = PriceBias.None, weightedPrice: boolean = false): BigNumber {
    const price = getPriceWithConfidence(oraclePrice, weightedPrice);
    switch (priceBias) {
      case PriceBias.Lowest:
        return price.lowestPrice;
      case PriceBias.Highest:
        return price.highestPrice;
      case PriceBias.None:
        return price.price;
    }
  }

  getAssetWeight(
    marginRequirementType: MarginRequirementType,
    oraclePrice: OraclePrice,
    ignoreSoftLimits: boolean = false,
  ): BigNumber {
    switch (marginRequirementType) {
      case MarginRequirementType.Initial:
        const isSoftLimitDisabled = this.config.totalAssetValueInitLimit.isZero();
        if (ignoreSoftLimits || isSoftLimitDisabled) return this.config.assetWeightInit;
        const totalBankCollateralValue = this.computeAssetUsdValue(
          oraclePrice,
          this.totalAssetShares,
          MarginRequirementType.Equity,
          PriceBias.Lowest
        );
        if (totalBankCollateralValue.isGreaterThan(this.config.totalAssetValueInitLimit)) {
          return this.config.totalAssetValueInitLimit.div(totalBankCollateralValue).times(this.config.assetWeightInit);
        } else {
          return this.config.assetWeightInit;
        }
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

    const fixedFee = insuranceFeeFixedApr.plus(protocolFixedFeeApr);
    const rateFee = insuranceIrFee.plus(protocolIrFee);

    const baseInterestRate = this.computeBaseInterestRate();
    const utilizationRate = this.computeUtilizationRate();

    const lendingRate = baseInterestRate.times(utilizationRate);
    const borrowingRate = baseInterestRate.times(new BigNumber(1).plus(rateFee)).plus(fixedFee)

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

    const { lendingRate, borrowingRate } = this.computeInterestRates();

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

Asset price (USD): ${this.getPrice(oraclePrice, PriceBias.None, false)}
Asset price Weighted (USD): ${this.getPrice(oraclePrice, PriceBias.None, true)}

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
  public totalAssetValueInitLimit: BigNumber;

  public interestRateConfig: InterestRateConfig;
  public operationalState: OperationalState;

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
    totalAssetValueInitLimit: BigNumber,
    oracleSetup: OracleSetup,
    oracleKeys: PublicKey[],
    interestRateConfig: InterestRateConfig,
    operationalState: OperationalState
  ) {
    this.assetWeightInit = assetWeightInit;
    this.assetWeightMaint = assetWeightMaint;
    this.liabilityWeightInit = liabilityWeightInit;
    this.liabilityWeightMaint = liabilityWeightMaint;
    this.depositLimit = depositLimit;
    this.borrowLimit = borrowLimit;
    this.riskTier = riskTier;
    this.totalAssetValueInitLimit = totalAssetValueInitLimit;
    this.oracleSetup = oracleSetup;
    this.oracleKeys = oracleKeys;
    this.interestRateConfig = interestRateConfig;
    this.operationalState = operationalState;
  }

  static fromAccountParsed(bankConfigRaw: BankConfigRaw): BankConfig {
    const assetWeightInit = wrappedI80F48toBigNumber(bankConfigRaw.assetWeightInit);
    const assetWeightMaint = wrappedI80F48toBigNumber(bankConfigRaw.assetWeightMaint);
    const liabilityWeightInit = wrappedI80F48toBigNumber(bankConfigRaw.liabilityWeightInit);
    const liabilityWeightMaint = wrappedI80F48toBigNumber(bankConfigRaw.liabilityWeightMaint);
    const depositLimit = BigNumber(bankConfigRaw.depositLimit.toString());
    const borrowLimit = BigNumber(bankConfigRaw.borrowLimit.toString());
    const riskTier = parseRiskTier(bankConfigRaw.riskTier);
    const operationalState = parseOperationalState(bankConfigRaw.operationalState);
    const totalAssetValueInitLimit = BigNumber(bankConfigRaw.totalAssetValueInitLimit.toString());
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
      operationalState,
      totalAssetValueInitLimit,
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

enum OperationalState {
  Paused = "Paused",
  Operational = "Operational",
  ReduceOnly = "ReduceOnly",
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
  None = "None",
  PythEma = "PythEma",
  SwitchboardV2 = "SwitchboardV2",
}

// BankConfigOpt Args
interface BankConfigOpt {
  assetWeightInit: BigNumber | null;
  assetWeightMaint: BigNumber | null;

  liabilityWeightInit: BigNumber | null;
  liabilityWeightMaint: BigNumber | null;

  depositLimit: BigNumber | null;
  borrowLimit: BigNumber | null;
  riskTier: RiskTier | null;
  totalAssetValueInitLimit: BigNumber | null;

  interestRateConfig: InterestRateConfig | null;
  operationalState: OperationalState | null;

  oracle: {
    setup: OracleSetup;
    keys: PublicKey[];
  } | null;
}

interface BankConfigOptRaw {
  assetWeightInit: WrappedI80F48 | null;
  assetWeightMaint: WrappedI80F48 | null;

  liabilityWeightInit: WrappedI80F48 | null;
  liabilityWeightMaint: WrappedI80F48 | null;

  depositLimit: BN | null;
  borrowLimit: BN | null;
  riskTier: { collateral: {} } | { isolated: {} } | null;
  totalAssetValueInitLimit: BN | null;

  interestRateConfig: InterestRateConfigRaw | null;
  operationalState: { paused: {} } | { operational: {} } | { reduceOnly: {} } | null;

  oracle: {
    setup: { none: {} } | { pythEma: {} } | { switchboardV2: {} };
    keys: PublicKey[];
  } | null;
}

function serializeBankConfigOpt(bankConfigOpt: BankConfigOpt): BankConfigOptRaw {
  const assetWeightInit = bankConfigOpt.assetWeightInit && { value: new BN(bankConfigOpt.assetWeightInit.toString()) };
  const assetWeightMaint = bankConfigOpt.assetWeightMaint && {
    value: new BN(bankConfigOpt.assetWeightMaint.toString()),
  };
  const liabilityWeightInit = bankConfigOpt.liabilityWeightInit && {
    value: new BN(bankConfigOpt.liabilityWeightInit.toString()),
  };
  const liabilityWeightMaint = bankConfigOpt.liabilityWeightMaint && {
    value: new BN(bankConfigOpt.liabilityWeightMaint.toString()),
  };
  const depositLimit = bankConfigOpt.depositLimit && new BN(bankConfigOpt.depositLimit.toString());
  const borrowLimit = bankConfigOpt.borrowLimit && new BN(bankConfigOpt.borrowLimit.toString());
  const riskTier = bankConfigOpt.riskTier && serializeRiskTier(bankConfigOpt.riskTier); // parseRiskTier(bankConfigRaw.riskTier);
  const operationalState = bankConfigOpt.operationalState && serializeOperationalState(bankConfigOpt.operationalState);
  const totalAssetValueInitLimit =
    bankConfigOpt.totalAssetValueInitLimit && new BN(bankConfigOpt.totalAssetValueInitLimit.toString());
  const oracle = bankConfigOpt.oracle && {
    setup: serializeOracleSetup(bankConfigOpt.oracle.setup),
    keys: bankConfigOpt.oracle.keys,
  };
  const interestRateConfig = bankConfigOpt.interestRateConfig && {
    insuranceFeeFixedApr: { value: new BN(bankConfigOpt.interestRateConfig.insuranceFeeFixedApr.toString()) },
    maxInterestRate: { value: new BN(bankConfigOpt.interestRateConfig.maxInterestRate.toString()) },
    insuranceIrFee: { value: new BN(bankConfigOpt.interestRateConfig.insuranceIrFee.toString()) },
    optimalUtilizationRate: { value: new BN(bankConfigOpt.interestRateConfig.optimalUtilizationRate.toString()) },
    plateauInterestRate: { value: new BN(bankConfigOpt.interestRateConfig.plateauInterestRate.toString()) },
    protocolFixedFeeApr: { value: new BN(bankConfigOpt.interestRateConfig.protocolFixedFeeApr.toString()) },
    protocolIrFee: { value: new BN(bankConfigOpt.interestRateConfig.protocolIrFee.toString()) },
  };

  return {
    assetWeightInit,
    assetWeightMaint,
    liabilityWeightInit,
    liabilityWeightMaint,
    depositLimit,
    borrowLimit,
    riskTier,
    operationalState,
    totalAssetValueInitLimit,
    oracle,
    interestRateConfig,
  };
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

function serializeRiskTier(riskTier: RiskTier): RiskTierRaw {
  switch (riskTier) {
    case RiskTier.Collateral:
      return { collateral: {} };
    case RiskTier.Isolated:
      return { isolated: {} };
    default:
      throw new Error(`Invalid risk tier "${riskTier}"`);
  }
}

function parseOperationalState(operationalStateRaw: OperationalStateRaw): OperationalState {
  switch (Object.keys(operationalStateRaw)[0].toLowerCase()) {
    case "paused":
      return OperationalState.Paused;
    case "operational":
      return OperationalState.Operational;
    case "reduceonly":
      return OperationalState.ReduceOnly;
    default:
      throw new Error(`Invalid operational state "${operationalStateRaw}"`);
  }
}

function serializeOperationalState(
  operationalState: OperationalState
): { paused: {} } | { operational: {} } | { reduceOnly: {} } {
  switch (operationalState) {
    case OperationalState.Paused:
      return { paused: {} };
    case OperationalState.Operational:
      return { operational: {} };
    case OperationalState.ReduceOnly:
      return { reduceOnly: {} };
    default:
      throw new Error(`Invalid operational state "${operationalState}"`);
  }
}

function parseOracleSetup(oracleSetupRaw: OracleSetupRaw): OracleSetup {
  switch (Object.keys(oracleSetupRaw)[0].toLowerCase()) {
    case "none":
      return OracleSetup.None;
    case "pythema":
      return OracleSetup.PythEma;
    case "switchboardv2":
      return OracleSetup.SwitchboardV2;
    default:
      throw new Error(`Invalid oracle setup "${oracleSetupRaw}"`);
  }
}

function serializeOracleSetup(oracleSetup: OracleSetup): { none: {} } | { pythEma: {} } | { switchboardV2: {} } {
  switch (oracleSetup) {
    case OracleSetup.None:
      return { none: {} };
    case OracleSetup.PythEma:
      return { pythEma: {} };
    case OracleSetup.SwitchboardV2:
      return { switchboardV2: {} };
    default:
      throw new Error(`Invalid oracle setup "${oracleSetup}"`);
  }
}

export type { InterestRateConfig, BankConfigOpt, BankConfigOptRaw };
export {
  Bank,
  BankConfig,
  RiskTier,
  OperationalState,
  OracleSetup,
  parseRiskTier,
  parseOracleSetup,
  serializeBankConfigOpt,
};

// ----------------------------------------------------------------------------
// Attributes
// ----------------------------------------------------------------------------
