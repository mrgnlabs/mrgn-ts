import {
  MarginRequirementType,
  Environment,
  getConfig,
  MarginfiClient,
  MarginfiAccountWrapper,
} from "@mrgnlabs/marginfi-client-v2";
import { NodeWallet } from "@mrgnlabs/mrgn-common";
import { Connection, Keypair } from "@solana/web3.js";
import { env_config } from "./config";

(async () => {
  const connection = new Connection(env_config.RPC_ENDPOINT, "confirmed");
  const config = getConfig(env_config.MRGN_ENV as Environment);
  const client = await MarginfiClient.fetch(config, new NodeWallet(Keypair.generate()), connection);

  const accountPk = process.argv[2];
  const account = await MarginfiAccountWrapper.fetch(accountPk, client);

  console.log("Account", accountPk);

  const { assets, liabilities } = account.computeHealthComponents(MarginRequirementType.Equity);
  console.log("Assets %s", assets);
  console.log("Liabilities %s", liabilities);

  const { assets: assets2, liabilities: liabilities2 } = account.computeHealthComponents(MarginRequirementType.Initial);
  console.log("Assets (Init) %s", assets2);
  console.log("Liabilities (Init) %s", liabilities2);

  const { assets: assets3, liabilities: liabilities3 } = account.computeHealthComponents(
    MarginRequirementType.Maintenance
  );
  console.log("Assets (Maint) %s", assets3);
  console.log("Liabilities (Maint) %s", liabilities3);

  console.log("Liquidatable: %s", account.canBeLiquidated());
  console.log("Liquidation sanity check: %s", assets3.lt(liabilities3));
})();
