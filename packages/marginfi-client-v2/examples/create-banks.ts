import { shortenAddress, NodeWallet } from "@mrgnlabs/mrgn-common";
import { getMarginfiClient } from "./utils";
import { getConfig } from "../src";
import { env_config } from "./config";
import { PublicKey } from "@solana/web3.js";
import {
  BankConfigCompactRaw,
  BankConfigOpt,
  BankConfigOptRaw,
  OperationalState,
  OracleSetup,
  RiskTier,
  serializeBankConfigOpt,
} from "../src/models/bank";
import { BigNumber } from "bignumber.js";

const marginfiGroupPk = new PublicKey("J9VZnaMGTELGCPsqMxk8aoyEGYcVzhorj48HvtDdEtc8");

const bankMint = new PublicKey("LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp");
const bank: BankConfigOpt = {
  assetWeightInit: new BigNumber(0.649999976158142),
  assetWeightMaint: new BigNumber(0.649999976158142),

  liabilityWeightInit: new BigNumber(0.649999976158142),
  liabilityWeightMaint: new BigNumber(0.649999976158142),

  depositLimit: new BigNumber(0.649999976158142),
  borrowLimit: new BigNumber(0.649999976158142),
  riskTier: RiskTier.Collateral,

  totalAssetValueInitLimit: new BigNumber(0.649999976158142),
  interestRateConfig: {
    // Curve Params
    optimalUtilizationRate: new BigNumber(0.649999976158142),
    plateauInterestRate: new BigNumber(0.649999976158142),
    maxInterestRate: new BigNumber(0.649999976158142),

    // Fees
    insuranceFeeFixedApr: new BigNumber(0.649999976158142),
    insuranceIrFee: new BigNumber(0.649999976158142),
    protocolFixedFeeApr: new BigNumber(0.649999976158142),
    protocolIrFee: new BigNumber(0.649999976158142),
  },
  operationalState: OperationalState.Operational,

  oracle: {
    setup: OracleSetup.PythEma,
    keys: [new PublicKey("2H6gWKxJuoFjBS4REqNm4XRa7uVFf9n9yKEowpwh7LML")],
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

  const result = await client.createLendingPool(bankMint, bank);
  console.log(result);
}

main().catch((e) => console.log(e));
