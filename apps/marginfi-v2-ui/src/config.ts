import { PublicKey } from "@solana/web3.js";
import { getConfig } from "@mrgnlabs/marginfi-client-v2";

// ================
// MAIN APP CONFIG
// ================

let mfiConfig, mfiEnvironment, rpcEndpoint, mfiProgramId, devFaucetAddress;

const environment = process.env.NEXT_PUBLIC_MARGINFI_ENVIRONMENT;
const rpcEndpointOverride =
  process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE;
const groupOverride = process.env.NEXT_PUBLIC_MARGINFI_GROUP_OVERRIDE;

switch (environment) {
  case "mainnet1":
    mfiConfig = getConfig(environment);
    if (groupOverride) {
      mfiConfig.groupPk = new PublicKey(groupOverride);
    }
    rpcEndpoint =
      rpcEndpointOverride || "https://mrgnlab-main-fc47.mainnet.rpcpool.com/";
    break;
  case "devnet1":
    mfiConfig = getConfig(environment);
    if (groupOverride) {
      mfiConfig.groupPk = new PublicKey(groupOverride);
    }
    rpcEndpoint = rpcEndpointOverride || "https://devnet.rpcpool.com/";
    devFaucetAddress = new PublicKey(
      "B87AhxX6BkBsj3hnyHzcerX2WxPoACC7ZyDr8E7H9geN"
    );
    break;
  default:
    mfiConfig = getConfig("devnet1");
    rpcEndpoint = rpcEndpointOverride || "https://devnet.rpcpool.com/";
    devFaucetAddress = new PublicKey(
      "57hG7dDLXUg6GYDzAw892V4qLm6FhKxd86vMLazyFL98"
    );
}

const config = {
  mfiConfig,
  mfiEnvironment,
  rpcEndpoint,
  mfiProgramId,
  devFaucetAddress,
};

export default config;
export const BLOCKED_COUNTRY = "US";
export const WSOL_MINT = new PublicKey(
  "So11111111111111111111111111111111111111112"
);
