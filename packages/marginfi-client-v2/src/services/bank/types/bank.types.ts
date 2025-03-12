import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";

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
  protocolOriginationFee: BigNumber;
}

enum OracleSetup {
  None = "None",
  PythLegacy = "PythLegacy",
  SwitchboardV2 = "SwitchboardV2",
  PythPushOracle = "PythPushOracle",
  SwitchboardPull = "SwitchboardPull",
  StakedWithPythPush = "StakedWithPythPush",
}
enum AssetTag {
  DEFAULT = 0,
  SOL = 1,
  STAKED = 2,
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
  assetTag: AssetTag | null;

  interestRateConfig: InterestRateConfig | null;
  operationalState: OperationalState | null;

  oracleMaxAge: number | null;
  permissionlessBadDebtSettlement: boolean | null;
}

interface OracleConfigOpt {
  setup: OracleSetup;
  keys: PublicKey[];
}

export type { BankConfigOpt, OracleConfigOpt, InterestRateConfig };
export { RiskTier, OperationalState, OracleSetup, AssetTag };
