import { OperationalState, OperationalStateRaw, OracleSetup, OracleSetupRaw, RiskTier, RiskTierRaw } from "../types";

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

export { parseRiskTier, parseOperationalState, parseOracleSetup };
