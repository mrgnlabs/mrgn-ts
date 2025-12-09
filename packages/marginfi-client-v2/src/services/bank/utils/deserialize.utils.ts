import { BorshCoder } from "@coral-xyz/anchor";
import BigNumber from "bignumber.js";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

import { BankMetadata, wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";

import {
  AssetTag,
  BankConfigRaw,
  BankConfigType,
  BankRaw,
  BankType,
  EmodeEntryFlags,
  EmodeFlags,
  EmodeSettingsType,
  EmodeTag,
  InterestRateConfig,
  OperationalState,
  OperationalStateRaw,
  OracleSetup,
  OracleSetupRaw,
  RiskTier,
  RiskTierRaw,
  BankConfigDto,
  BankTypeDto,
  EmodeSettingsDto,
  InterestRateConfigDto,
  BankRawDto,
  EmodeSettingsRaw,
  EmodeSettingsRawDto,
  BankConfigRawDto,
} from "../types";
import { findOracleKey } from "../../../utils";
import { AccountType, DEFAULT_ORACLE_MAX_AGE, EmodeSettings, MarginfiIdlType, PythPushFeedIdMap } from "../../..";

/*
 * Bank deserialization
 */

export function decodeBankRaw(encoded: Buffer, idl: MarginfiIdlType): BankRaw {
  const coder = new BorshCoder(idl);
  return coder.accounts.decode(AccountType.Bank, encoded);
}

export function parseEmodeSettingsRaw(emodeSettingsRaw: EmodeSettingsRaw): EmodeSettingsType {
  const emodeTag = parseEmodeTag(emodeSettingsRaw.emodeTag);
  const timestamp = emodeSettingsRaw.timestamp.toNumber();
  const flags = getActiveEmodeFlags(emodeSettingsRaw.flags);
  const emodeEntries = emodeSettingsRaw.emodeConfig.entries
    .filter((entry) => entry.collateralBankEmodeTag !== 0)
    .map((entry) => {
      return {
        collateralBankEmodeTag: parseEmodeTag(entry.collateralBankEmodeTag),
        flags: getActiveEmodeEntryFlags(entry.flags),
        assetWeightInit: wrappedI80F48toBigNumber(entry.assetWeightInit),
        assetWeightMaint: wrappedI80F48toBigNumber(entry.assetWeightMaint),
      };
    });

  const emodeSettings: EmodeSettingsType = {
    emodeTag,
    timestamp,
    flags,
    emodeEntries,
  };

  return emodeSettings;
}

export function parseBankRaw(
  address: PublicKey,
  accountParsed: BankRaw,
  feedIdMap?: PythPushFeedIdMap,
  bankMetadata?: BankMetadata,
  mintData?: {
    mintRate: number | null;
    mintPrice: number;
  }
): BankType {
  const flags = accountParsed.flags.toNumber();

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

  const config = parseBankConfigRaw(accountParsed.config);

  const lastUpdate = accountParsed.lastUpdate.toNumber();

  const totalAssetShares = wrappedI80F48toBigNumber(accountParsed.totalAssetShares);
  const totalLiabilityShares = wrappedI80F48toBigNumber(accountParsed.totalLiabilityShares);

  const emissionsActiveBorrowing = (flags & 1) > 0;
  const emissionsActiveLending = (flags & 2) > 0;

  // @todo existence checks here should be temporary - remove once all banks have emission configs
  const emissionsRate = accountParsed.emissionsRate.toNumber();
  const emissionsMint = accountParsed.emissionsMint;
  const emissionsRemaining = accountParsed.emissionsRemaining
    ? wrappedI80F48toBigNumber(accountParsed.emissionsRemaining)
    : new BigNumber(0);

  const { oracleKey } = { oracleKey: config.oracleKeys[0]! };
  const emode = parseEmodeSettingsRaw(accountParsed.emode);

  const tokenSymbol = bankMetadata?.tokenSymbol;

  const feesDestinationAccount = accountParsed.feesDestinationAccount;
  const lendingPositionCount = accountParsed.lendingPositionCount
    ? new BigNumber(accountParsed.lendingPositionCount.toString())
    : new BigNumber(0);
  const borrowingPositionCount = accountParsed.borrowingPositionCount
    ? new BigNumber(accountParsed.borrowingPositionCount.toString())
    : new BigNumber(0);

  const kaminoReserve = accountParsed.kaminoReserve;
  const kaminoObligation = accountParsed.kaminoObligation;

  return {
    address,
    group,
    mint,
    mintDecimals,
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
    lastUpdate,
    config,
    totalAssetShares,
    totalLiabilityShares,
    emissionsActiveBorrowing,
    emissionsActiveLending,
    emissionsRate,
    emissionsMint,
    emissionsRemaining,
    oracleKey,
    feesDestinationAccount,
    lendingPositionCount,
    borrowingPositionCount,
    emode,
    tokenSymbol,
    mintRate: mintData?.mintRate ?? null,
    mintPrice: mintData?.mintPrice ?? 0,
    kaminoReserve,
    kaminoObligation,
  };
}

/*
 * DTO Bank deserialization
 */

export function dtoToBank(bankDto: BankTypeDto): BankType {
  return {
    address: new PublicKey(bankDto.address),
    group: new PublicKey(bankDto.group),
    mint: new PublicKey(bankDto.mint),
    mintDecimals: bankDto.mintDecimals,
    assetShareValue: new BigNumber(bankDto.assetShareValue),
    liabilityShareValue: new BigNumber(bankDto.liabilityShareValue),
    liquidityVault: new PublicKey(bankDto.liquidityVault),
    liquidityVaultBump: bankDto.liquidityVaultBump,
    liquidityVaultAuthorityBump: bankDto.liquidityVaultAuthorityBump,
    insuranceVault: new PublicKey(bankDto.insuranceVault),
    insuranceVaultBump: bankDto.insuranceVaultBump,
    insuranceVaultAuthorityBump: bankDto.insuranceVaultAuthorityBump,
    collectedInsuranceFeesOutstanding: new BigNumber(bankDto.collectedInsuranceFeesOutstanding),
    feeVault: new PublicKey(bankDto.feeVault),
    feeVaultBump: bankDto.feeVaultBump,
    feeVaultAuthorityBump: bankDto.feeVaultAuthorityBump,
    collectedGroupFeesOutstanding: new BigNumber(bankDto.collectedGroupFeesOutstanding),
    lastUpdate: bankDto.lastUpdate,
    config: dtoToBankConfig(bankDto.config),
    totalAssetShares: new BigNumber(bankDto.totalAssetShares),
    totalLiabilityShares: new BigNumber(bankDto.totalLiabilityShares),
    emissionsActiveBorrowing: bankDto.emissionsActiveBorrowing,
    emissionsActiveLending: bankDto.emissionsActiveLending,
    emissionsRate: bankDto.emissionsRate,
    emissionsMint: new PublicKey(bankDto.emissionsMint),
    emissionsRemaining: new BigNumber(bankDto.emissionsRemaining),
    oracleKey: new PublicKey(bankDto.oracleKey),
    emode: dtoToEmodeSettings(bankDto.emode),
    tokenSymbol: bankDto.tokenSymbol,
    feesDestinationAccount: bankDto.feesDestinationAccount ? new PublicKey(bankDto.feesDestinationAccount) : undefined,
    lendingPositionCount: bankDto.lendingPositionCount ? new BigNumber(bankDto.lendingPositionCount) : undefined,
    borrowingPositionCount: bankDto.borrowingPositionCount ? new BigNumber(bankDto.borrowingPositionCount) : undefined,
    mintRate: null, // TODO: move these out
    mintPrice: 0,
    kaminoReserve: new PublicKey(bankDto.kaminoReserve),
    kaminoObligation: new PublicKey(bankDto.kaminoObligation),
  };
}

export function dtoToEmodeSettings(emodeSettingsDto: EmodeSettingsDto): EmodeSettingsType {
  return {
    emodeTag: emodeSettingsDto.emodeTag,
    timestamp: emodeSettingsDto.timestamp,
    flags: emodeSettingsDto.flags,
    emodeEntries: emodeSettingsDto.emodeEntries.map((entry) => {
      return {
        collateralBankEmodeTag: entry.collateralBankEmodeTag,
        flags: entry.flags,
        assetWeightInit: new BigNumber(entry.assetWeightInit),
        assetWeightMaint: new BigNumber(entry.assetWeightMaint),
      };
    }),
  };
}

export function dtoToBankConfig(bankConfigDto: BankConfigDto): BankConfigType {
  return {
    assetWeightInit: new BigNumber(bankConfigDto.assetWeightInit),
    assetWeightMaint: new BigNumber(bankConfigDto.assetWeightMaint),
    liabilityWeightInit: new BigNumber(bankConfigDto.liabilityWeightInit),
    liabilityWeightMaint: new BigNumber(bankConfigDto.liabilityWeightMaint),
    depositLimit: new BigNumber(bankConfigDto.depositLimit),
    borrowLimit: new BigNumber(bankConfigDto.borrowLimit),
    riskTier: bankConfigDto.riskTier,
    operationalState: bankConfigDto.operationalState,
    totalAssetValueInitLimit: new BigNumber(bankConfigDto.totalAssetValueInitLimit),
    assetTag: bankConfigDto.assetTag,
    configFlags: bankConfigDto.configFlags,
    oracleSetup: bankConfigDto.oracleSetup,
    oracleKeys: bankConfigDto.oracleKeys.map((key) => new PublicKey(key)),
    oracleMaxAge: bankConfigDto.oracleMaxAge,
    interestRateConfig: dtoToInterestRateConfig(bankConfigDto.interestRateConfig),
    oracleMaxConfidence: bankConfigDto.oracleMaxConfidence,
    fixedPrice: new BigNumber(bankConfigDto.fixedPrice),
  };
}

export function dtoToInterestRateConfig(interestRateConfigDto: InterestRateConfigDto): InterestRateConfig {
  return {
    optimalUtilizationRate: new BigNumber(interestRateConfigDto.optimalUtilizationRate),
    plateauInterestRate: new BigNumber(interestRateConfigDto.plateauInterestRate),
    maxInterestRate: new BigNumber(interestRateConfigDto.maxInterestRate),
    insuranceFeeFixedApr: new BigNumber(interestRateConfigDto.insuranceFeeFixedApr),
    insuranceIrFee: new BigNumber(interestRateConfigDto.insuranceIrFee),
    protocolFixedFeeApr: new BigNumber(interestRateConfigDto.protocolFixedFeeApr),
    protocolIrFee: new BigNumber(interestRateConfigDto.protocolIrFee),
    protocolOriginationFee: new BigNumber(interestRateConfigDto.protocolOriginationFee),
    zeroUtilRate: interestRateConfigDto.zeroUtilRate,
    hundredUtilRate: interestRateConfigDto.hundredUtilRate,
    points: interestRateConfigDto.points,
    curveType: interestRateConfigDto.curveType,
  };
}

export function dtoToBankRaw(bankDto: BankRawDto): BankRaw {
  return {
    group: new PublicKey(bankDto.group),
    mint: new PublicKey(bankDto.mint),
    mintDecimals: bankDto.mintDecimals,

    assetShareValue: bankDto.assetShareValue,
    liabilityShareValue: bankDto.liabilityShareValue,

    liquidityVault: new PublicKey(bankDto.liquidityVault),
    liquidityVaultBump: bankDto.liquidityVaultBump,
    liquidityVaultAuthorityBump: bankDto.liquidityVaultAuthorityBump,

    insuranceVault: new PublicKey(bankDto.insuranceVault),
    insuranceVaultBump: bankDto.insuranceVaultBump,
    insuranceVaultAuthorityBump: bankDto.insuranceVaultAuthorityBump,
    collectedInsuranceFeesOutstanding: bankDto.collectedInsuranceFeesOutstanding,

    feeVault: new PublicKey(bankDto.feeVault),
    feeVaultBump: bankDto.feeVaultBump,
    feeVaultAuthorityBump: bankDto.feeVaultAuthorityBump,
    collectedGroupFeesOutstanding: bankDto.collectedGroupFeesOutstanding,

    lastUpdate: new BN(bankDto.lastUpdate),

    config: dtoToBankConfigRaw(bankDto.config),

    totalAssetShares: bankDto.totalAssetShares,
    totalLiabilityShares: bankDto.totalLiabilityShares,

    flags: new BN(bankDto.flags),
    emissionsRate: new BN(bankDto.emissionsRate),
    emissionsRemaining: bankDto.emissionsRemaining,
    emissionsMint: new PublicKey(bankDto.emissionsMint),
    feesDestinationAccount: bankDto.feesDestinationAccount ? new PublicKey(bankDto.feesDestinationAccount) : undefined,
    lendingPositionCount: bankDto.lendingPositionCount ? Number(bankDto.lendingPositionCount) : undefined,
    borrowingPositionCount: bankDto.borrowingPositionCount ? Number(bankDto.borrowingPositionCount) : undefined,

    emode: dtoToEmodeSettingsRaw(bankDto.emode),
    kaminoReserve: new PublicKey(bankDto.kaminoReserve),
    kaminoObligation: new PublicKey(bankDto.kaminoObligation),
  };
}

export function dtoToEmodeSettingsRaw(emodeSettingsDto: EmodeSettingsRawDto): EmodeSettingsRaw {
  return {
    emodeTag: emodeSettingsDto.emodeTag,
    timestamp: new BN(emodeSettingsDto.timestamp),
    flags: new BN(emodeSettingsDto.flags),
    emodeConfig: {
      entries: emodeSettingsDto.emodeConfig.entries.map((entry) => {
        return {
          collateralBankEmodeTag: entry.collateralBankEmodeTag,
          flags: entry.flags,
          assetWeightInit: entry.assetWeightInit,
          assetWeightMaint: entry.assetWeightMaint,
        };
      }),
    },
  };
}

export function dtoToBankConfigRaw(bankConfigDto: BankConfigRawDto): BankConfigRaw {
  return {
    assetWeightInit: bankConfigDto.assetWeightInit,
    assetWeightMaint: bankConfigDto.assetWeightMaint,
    liabilityWeightInit: bankConfigDto.liabilityWeightInit,
    liabilityWeightMaint: bankConfigDto.liabilityWeightMaint,
    depositLimit: new BN(bankConfigDto.depositLimit),
    borrowLimit: new BN(bankConfigDto.borrowLimit),
    riskTier: bankConfigDto.riskTier,
    operationalState: bankConfigDto.operationalState,
    totalAssetValueInitLimit: new BN(bankConfigDto.totalAssetValueInitLimit),
    assetTag: bankConfigDto.assetTag,
    configFlags: bankConfigDto.configFlags,
    oracleSetup: bankConfigDto.oracleSetup,
    oracleKeys: bankConfigDto.oracleKeys.map((key: string) => new PublicKey(key)),
    oracleMaxAge: bankConfigDto.oracleMaxAge,
    interestRateConfig: bankConfigDto.interestRateConfig,
    oracleMaxConfidence: bankConfigDto.oracleMaxConfidence,
    fixedPrice: bankConfigDto.fixedPrice,
  };
}

/*
 * Bank config deserialization
 */

export function parseBankConfigRaw(bankConfigRaw: BankConfigRaw): BankConfigType {
  const assetWeightInit = wrappedI80F48toBigNumber(bankConfigRaw.assetWeightInit);
  const assetWeightMaint = wrappedI80F48toBigNumber(bankConfigRaw.assetWeightMaint);
  const liabilityWeightInit = wrappedI80F48toBigNumber(bankConfigRaw.liabilityWeightInit);
  const liabilityWeightMaint = wrappedI80F48toBigNumber(bankConfigRaw.liabilityWeightMaint);
  const depositLimit = BigNumber(bankConfigRaw.depositLimit.toString());
  const borrowLimit = BigNumber(bankConfigRaw.borrowLimit.toString());
  const riskTier = parseRiskTier(bankConfigRaw.riskTier);
  const operationalState = parseOperationalState(bankConfigRaw.operationalState);
  const totalAssetValueInitLimit = BigNumber(bankConfigRaw.totalAssetValueInitLimit.toString());
  const assetTag = bankConfigRaw.assetTag as AssetTag;
  const configFlags = bankConfigRaw.configFlags;
  const oracleSetup = parseOracleSetup(bankConfigRaw.oracleSetup);
  const oracleKeys = bankConfigRaw.oracleKeys;
  const oracleMaxAge = bankConfigRaw.oracleMaxAge === 0 ? DEFAULT_ORACLE_MAX_AGE : bankConfigRaw.oracleMaxAge;
  const interestRateConfig = {
    insuranceFeeFixedApr: wrappedI80F48toBigNumber(bankConfigRaw.interestRateConfig.insuranceFeeFixedApr),
    maxInterestRate: wrappedI80F48toBigNumber(bankConfigRaw.interestRateConfig.maxInterestRate),
    insuranceIrFee: wrappedI80F48toBigNumber(bankConfigRaw.interestRateConfig.insuranceIrFee),
    optimalUtilizationRate: wrappedI80F48toBigNumber(bankConfigRaw.interestRateConfig.optimalUtilizationRate),
    plateauInterestRate: wrappedI80F48toBigNumber(bankConfigRaw.interestRateConfig.plateauInterestRate),
    protocolFixedFeeApr: wrappedI80F48toBigNumber(bankConfigRaw.interestRateConfig.protocolFixedFeeApr),
    protocolIrFee: wrappedI80F48toBigNumber(bankConfigRaw.interestRateConfig.protocolIrFee),
    protocolOriginationFee: wrappedI80F48toBigNumber(bankConfigRaw.interestRateConfig.protocolOriginationFee),
    zeroUtilRate: bankConfigRaw.interestRateConfig.zeroUtilRate,
    hundredUtilRate: bankConfigRaw.interestRateConfig.hundredUtilRate,
    points: bankConfigRaw.interestRateConfig.points,
    curveType: bankConfigRaw.interestRateConfig.curveType,
  };
  const oracleMaxConfidence = bankConfigRaw.oracleMaxConfidence;
  const fixedPrice = wrappedI80F48toBigNumber(bankConfigRaw.fixedPrice);

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
    assetTag,
    configFlags,
    oracleSetup,
    oracleKeys,
    oracleMaxAge,
    interestRateConfig,
    oracleMaxConfidence,
    fixedPrice,
  };
}

export function parseRiskTier(riskTierRaw: RiskTierRaw): RiskTier {
  switch (Object.keys(riskTierRaw)[0].toLowerCase()) {
    case "collateral":
      return RiskTier.Collateral;
    case "isolated":
      return RiskTier.Isolated;
    default:
      throw new Error(`Invalid risk tier "${riskTierRaw}"`);
  }
}

export function parseOperationalState(operationalStateRaw: OperationalStateRaw): OperationalState {
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

export function parseOracleSetup(oracleSetupRaw: OracleSetupRaw): OracleSetup {
  const oracleKey = Object.keys(oracleSetupRaw)[0]!.toLowerCase();
  switch (oracleKey) {
    case "none":
      return OracleSetup.None;
    case "pythlegacy":
      return OracleSetup.PythLegacy;
    case "switchboardv2":
      return OracleSetup.SwitchboardV2;
    case "pythpushoracle":
      return OracleSetup.PythPushOracle;
    case "switchboardpull":
      return OracleSetup.SwitchboardPull;
    case "stakedwithpythpush":
      return OracleSetup.StakedWithPythPush;
    case "kaminopythpush":
      return OracleSetup.KaminoPythPush;
    case "kaminoswitchboardpull":
      return OracleSetup.KaminoSwitchboardPull;
    case "fixed":
      return OracleSetup.Fixed;
    default:
      return OracleSetup.None;
  }
}

/**
 * Get all active EMode flags as an array of flag names
 */
export function getActiveEmodeFlags(flags: BN): EmodeFlags[] {
  const activeFlags: EmodeFlags[] = [];

  for (const flagName in EmodeFlags) {
    const flag = EmodeFlags[flagName];

    if (typeof flag === "number" && hasEmodeFlag(flags, flag)) {
      activeFlags.push(flag);
    }
  }

  return activeFlags;
}

/**
 * Check if a specific EMode flag is set
 */
export function hasEmodeFlag(flags: BN, flag: number): boolean {
  return !flags.and(new BN(flag)).isZero();
}

/**
 * Get all active EMode entry flags as an array of flag names
 */
export function getActiveEmodeEntryFlags(flags: number): EmodeEntryFlags[] {
  const activeFlags: EmodeEntryFlags[] = [];

  for (const flagName in EmodeEntryFlags) {
    const flag = EmodeEntryFlags[flagName];

    if (typeof flag === "number" && hasEmodeEntryFlag(flags, flag)) {
      activeFlags.push(flag);
    }
  }

  return activeFlags;
}

/**
 * Check if a specific EMode entry flag is set
 */
export function hasEmodeEntryFlag(flags: number, flag: number): boolean {
  return (flags & flag) === flag;
}

/**
 * Parse a raw EMode tag number into the corresponding EmodeTag enum value
 */
export function parseEmodeTag(emodeTagRaw: number): EmodeTag {
  switch (emodeTagRaw) {
    case 501:
      return EmodeTag.SOL;
    case 1571:
      return EmodeTag.LST_T1;
    case 1572:
      return EmodeTag.LST_T2;
    case 619:
      return EmodeTag.JLP;
    case 57481:
      return EmodeTag.STABLE_T1;
    case 57482:
      return EmodeTag.STABLE_T2;
    case 871:
      return EmodeTag.BTC_T1;
    case 872:
      return EmodeTag.BTC_T2;
    case 0:
    default:
      return EmodeTag.UNSET;
  }
}
