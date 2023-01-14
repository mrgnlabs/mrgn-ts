// import { Environment, getConfig } from "marginfi-client-v2";
import { PublicKey } from "@solana/web3.js";
import { Environment } from "@mrgnlabs/marginfi-client-v2";

// ================
// MAIN APP CONFIG
// ================

let mfiEnvironment, rpcEndpoint, mfiProgramId, devFaucetAddress;

const rpcEndpointOverride =
  process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE;

switch (process.env.NEXT_PUBLIC_ENVIRONMENT) {
  case "mainnet":
    // mfiConfig = getConfig(Environment.MAINNET);

    // mfiEnvironment = mfiConfig.environment;
    rpcEndpoint =
      rpcEndpointOverride || "https://mrgnlab-main-fc47.mainnet.rpcpool.com/";
    // mfiProgramId = mfiConfig.programId;
    break;
  case "devnet":
    // mfiConfig = getConfig(Environment.DEVNET);
    // mfiEnvironment = mfiConfig.environment;
    rpcEndpoint = rpcEndpointOverride || "https://devnet.rpcpool.com/";
    // mfiProgramId = mfiConfig.programId;
    devFaucetAddress = new PublicKey(
      "B87AhxX6BkBsj3hnyHzcerX2WxPoACC7ZyDr8E7H9geN"
    );
    break;
  default:
    // mfiConfig = getConfig(Environment.DEVNET);

    // mfiEnvironment = mfiConfig.environment;
    // rpcEndpoint = rpcEndpointOverride || "http://127.0.0.1:8899";
    rpcEndpoint = rpcEndpointOverride || "https://devnet.rpcpool.com/";
    // mfiProgramId = mfiConfig.programId;
    // mfiProgramId = new PublicKey("TBA");
    devFaucetAddress = new PublicKey(
      "57hG7dDLXUg6GYDzAw892V4qLm6FhKxd86vMLazyFL98"
    );
}

const config = {
  mfiEnvironment,
  rpcEndpoint,
  mfiProgramId,
  devFaucetAddress,
};

export default config;
export const BLOCKED_COUNTRY = "US";
