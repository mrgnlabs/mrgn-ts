import {  Dialect, IllegalStateError } from "@dialectlabs/sdk";
import { NodeDialectSolanaWalletAdapter, SolanaSdkFactory } from "@dialectlabs/blockchain-sdk-solana";
import { envConfig } from "./env-config";
import { Connection } from "@solana/web3.js";
import {
  MarginfiClient,
  getConfig,
} from "@mrgnlabs/marginfi-client-v2";
import { Wallet } from "@mrgnlabs/mrgn-common";
import { GroupMonitor } from "./group-monitor";
import { HealthNotifier } from "./health-notifier";

async function main() {
  const sdk = Dialect.sdk(
    {
      environment: envConfig.DIALECT_SDK_ENVIRONMENT,
    },
    SolanaSdkFactory.create({
      wallet: NodeDialectSolanaWalletAdapter.create(envConfig.DIALECT_SDK_KEYPAIR),
    })
  );

  const dapp = await sdk.dapps.find();
  if (!dapp) {
    throw new IllegalStateError("Dapp doesn't exist, please create dapp before using it");
  }

  const rpcClient = new Connection(envConfig.MARGINFI_RPC_ENDPOINT, { wsEndpoint: envConfig.MARGINFI_RPC_ENDPOINT_WS });
  const mfiConfig = getConfig(envConfig.MRGN_ENV);
  const mfiClient = await MarginfiClient.fetch(mfiConfig, {} as Wallet, rpcClient, { readOnly: true });

  const groupMonitor = new GroupMonitor(mfiClient);
  const healthNotifier = new HealthNotifier(sdk, dapp, rpcClient, mfiConfig, groupMonitor);

  await Promise.all([healthNotifier.run(), groupMonitor.run()]);
}

main().catch(console.error);
