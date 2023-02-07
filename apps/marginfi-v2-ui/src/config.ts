import { PublicKey } from "@solana/web3.js";
import { getConfig } from "@mrgnlabs/marginfi-client-v2";

// ================
// MAIN APP CONFIG
// ================

let mfiConfig, rpcEndpoint, devFaucetAddress;

const environment = process.env.NEXT_PUBLIC_MARGINFI_ENVIRONMENT;
const rpcEndpointOverride = process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE;
const groupOverride = process.env.NEXT_PUBLIC_MARGINFI_GROUP_OVERRIDE;

switch (environment) {
  case "alpha":
    mfiConfig = getConfig(environment);
    if (groupOverride) {
      mfiConfig.groupPk = new PublicKey(groupOverride);
    }
    rpcEndpoint = rpcEndpointOverride || "https://mrgn.rpcpool.com/";
    break;
  case "staging":
    mfiConfig = getConfig(environment);
    if (groupOverride) {
      mfiConfig.groupPk = new PublicKey(groupOverride);
    }
    rpcEndpoint = rpcEndpointOverride || "https://mrgn.rpcpool.com/";
    break;
  case "dev":
    mfiConfig = getConfig(environment);
    if (groupOverride) {
      mfiConfig.groupPk = new PublicKey(groupOverride);
    }
    rpcEndpoint = rpcEndpointOverride || "https://devnet.rpcpool.com/";
    devFaucetAddress = new PublicKey("B87AhxX6BkBsj3hnyHzcerX2WxPoACC7ZyDr8E7H9geN");
    break;
  default:
    mfiConfig = getConfig("dev");
    rpcEndpoint = rpcEndpointOverride || "https://devnet.rpcpool.com/";
    devFaucetAddress = new PublicKey("57hG7dDLXUg6GYDzAw892V4qLm6FhKxd86vMLazyFL98");
}

const config = {
  mfiConfig,
  rpcEndpoint,
  devFaucetAddress,
};

export default config;
export const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
export const WALLET_BALANCE_MARGIN_SOL = 0.1;
