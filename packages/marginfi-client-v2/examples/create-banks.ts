import { getMarginfiClient } from "./utils";
import { getConfig } from "../src";
import { env_config } from "./config";
import { PublicKey } from "@solana/web3.js";
import { BankConfigOpt, OperationalState, OracleSetup, RiskTier } from "../src/models/bank";
import { BigNumber } from "bignumber.js";

const marginfiGroupPk = new PublicKey("J9VZnaMGTELGCPsqMxk8aoyEGYcVzhorj48HvtDdEtc8");

const bankMint = new PublicKey("mb1eu7TzEc71KxDpsmsKoucSSuuoGLv1drys1oP2jh6");
const bank: BankConfigOpt = {
  assetWeightInit: new BigNumber(0),
  assetWeightMaint: new BigNumber(0),

  liabilityWeightInit: new BigNumber(2.5),
  liabilityWeightMaint: new BigNumber(1.5),

  depositLimit: new BigNumber(1000),
  borrowLimit: new BigNumber(10),
  riskTier: RiskTier.Collateral,

  totalAssetValueInitLimit: new BigNumber(0),
  interestRateConfig: {
    // Curve Params
    optimalUtilizationRate: new BigNumber(0.8),
    plateauInterestRate: new BigNumber(0.1),
    maxInterestRate: new BigNumber(3),

    // Fees
    insuranceFeeFixedApr: new BigNumber(0),
    insuranceIrFee: new BigNumber(0),
    protocolFixedFeeApr: new BigNumber(0.01),
    protocolIrFee: new BigNumber(0.05),
  },
  operationalState: OperationalState.Operational,

  oracle: {
    setup: OracleSetup.PythEma,
    keys: [new PublicKey("H6ARHf6YXhGYeQfUzQNGk6rDNnLBQKrenN712K4AQJEG")],
  },
};

async function main() {
  const config = getConfig(env_config.MRGN_ENV);

  const client = await getMarginfiClient({
    configOverride: {
      ...config,
      groupPk: marginfiGroupPk,
    },
  });

  console.log("Creating banks in group:", client.groupAddress.toBase58());
  console.log("Creating banks with authority:", client.wallet.publicKey.toBase58());

  const result = await client.createLendingPool(bankMint, bank, {
    dryRun: true,
  });

  console.log("Created bank:", result.bankAddress.toBase58());
  console.log("Signature:", result.signature);
}

main().catch((e) => console.log(e));
