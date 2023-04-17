import { Connection } from "@solana/web3.js";
import { NodeWallet } from "@mrgnlabs/mrgn-common";
import { getConfig, MarginfiClient } from "@mrgnlabs/marginfi-client-v2";
import { Keypair } from "@solana/web3.js";

const getClient = async (connection: Connection) => {
  const wallet = new NodeWallet(Keypair.generate());
  const config = await getConfig("production");
  const client = await MarginfiClient.fetch(config, wallet, connection);

  return client;
};

export { getClient };
