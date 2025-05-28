import { BorshCoder } from "@coral-xyz/anchor";
import { MarginfiIdlType } from "../../../idl";
import { AccountType } from "../../../types";
import {
  AssetTag,
  BankConfigRaw,
  BankConfigType,
  BankRaw,
  BankType,
  EmodeEntryFlags,
  EmodeFlags,
  EmodeTag,
  OperationalState,
  OperationalStateRaw,
  OracleSetup,
  OracleSetupRaw,
  RiskTier,
  RiskTierRaw,
} from "../types";
import BN from "bn.js";
import { BankMetadata, wrappedI80F48toBigNumber } from "@mrgnlabs/mrgn-common";
import BigNumber from "bignumber.js";
import { DEFAULT_ORACLE_MAX_AGE } from "../../../constants";
import { PublicKey } from "@solana/web3.js";
import { findOracleKey, PythPushFeedIdMap } from "../../../utils";
import { EmodeSettings } from "../../../models/emode-settings";

/*
 * Bank deserialization
 */

export function decodeBankRaw(encoded: Buffer, idl: MarginfiIdlType): BankRaw {
  const coder = new BorshCoder(idl);
  return coder.accounts.decode(AccountType.Bank, encoded);
}

export function parseBankRaw(
  address: PublicKey,
  accountParsed: BankRaw,
  feedIdMap: PythPushFeedIdMap,
  bankMetadata?: BankMetadata
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

  const { oracleKey, shardId: pythShardId } = findOracleKey(config, feedIdMap);
  const emode = EmodeSettings.from(accountParsed.emode);

  const tokenSymbol = bankMetadata?.tokenSymbol;

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
    pythShardId,
    emode,
    tokenSymbol,
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
    assetTag,
    oracleSetup,
    oracleKeys,
    oracleMaxAge,
    interestRateConfig,
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
  const oracleKey = Object.keys(oracleSetupRaw)[0].toLowerCase();
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
    case 157:
      return EmodeTag.LST;
    case 5748:
      return EmodeTag.STABLE;
    case 0:
    default:
      return EmodeTag.UNSET;
  }
}
