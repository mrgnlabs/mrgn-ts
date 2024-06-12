import { shortenAddress, NodeWallet } from "@mrgnlabs/mrgn-common";
import { getMarginfiClient } from "./utils";
import { getConfig } from "../src";
import { env_config } from "./config";
import { PublicKey } from "@solana/web3.js";
import { BankConfigOptRaw } from "../src/models/bank";

const marginfiGroupPk = new PublicKey("J9VZnaMGTELGCPsqMxk8aoyEGYcVzhorj48HvtDdEtc8");

const bank: BankConfigOptRaw = {
  assetWeightInit: null,
  assetWeightMaint: null,

  liabilityWeightInit: null,
  liabilityWeightMaint: null,

  depositLimit: null,
  borrowLimit: null,
  riskTier: null,
  totalAssetValueInitLimit: null,

  interestRateConfig: null,
  operationalState: null,

  oracle: null,
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
}

main().catch((e) => console.log(e));
