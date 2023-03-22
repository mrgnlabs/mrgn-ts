import {
  Environment,
  getConfig,
  MarginfiAccount,
  MarginfiClient,
  MarginRequirementType,
} from "@mrgnlabs/marginfi-client-v2";
import { NodeWallet } from "@mrgnlabs/mrgn-common";
import { Connection, Keypair } from "@solana/web3.js";
import { parseEnvConfig } from "./config";

const env_config = parseEnvConfig();

(async () => {
  const connection = new Connection(env_config.RPC_ENDPOINT, "confirmed");
  const config = getConfig(env_config.MRGN_ENV as Environment);
  const client = await MarginfiClient.fetch(config, new NodeWallet(Keypair.generate()), connection);

  const accountPk = process.argv[2];
  const account = await MarginfiAccount.fetch(accountPk, client);

  console.log("Account", accountPk);

  const { assets, liabilities } = account.getHealthComponents(MarginRequirementType.Equity);
  console.log("Assets %s", assets);
  console.log("Liabilities %s", liabilities);

  const { assets: assets2, liabilities: liabilities2 } = account.getHealthComponents(MarginRequirementType.Init);
  console.log("Assets (Init) %s", assets2);
  console.log("Liabilities (Init) %s", liabilities2);

  const { assets: assets3, liabilities: liabilities3 } = account.getHealthComponents(MarginRequirementType.Maint);
  console.log("Assets (Maint) %s", assets3);
  console.log("Liabilities (Maint) %s", liabilities3);

  console.log("Liquidatable: %s", account.canBeLiquidated());
  console.log("Liquidation sanity check: %s", assets3.lt(liabilities3));
})();
