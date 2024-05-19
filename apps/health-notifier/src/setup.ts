import {  Dialect } from "@dialectlabs/sdk";
import { NodeDialectSolanaWalletAdapter, SolanaSdkFactory } from "@dialectlabs/blockchain-sdk-solana";
import { envConfig } from "./env-config";

async function main() {
  const sdk = Dialect.sdk(
    {
      environment: envConfig.DIALECT_SDK_ENVIRONMENT,
    },
    SolanaSdkFactory.create({
      wallet: NodeDialectSolanaWalletAdapter.create(envConfig.DIALECT_SDK_KEYPAIR),
    })
  );

  // TODO: Create notification types
}

main().catch(console.error);
