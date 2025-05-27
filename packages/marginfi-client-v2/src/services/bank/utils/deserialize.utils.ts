import {
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

function parseOracleSetup(oracleSetupRaw: OracleSetupRaw): OracleSetup {
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

export { parseRiskTier, parseOperationalState, parseOracleSetup };
