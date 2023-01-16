// import { Environment, getConfig } from "marginfi-client-v2";
import { PublicKey } from "@solana/web3.js";
import { Environment, getConfig } from "@mrgnlabs/marginfi-client-v2";

// ================
// MAIN APP CONFIG
// ================

let mfiConfig, mfiEnvironment, rpcEndpoint, mfiProgramId, devFaucetAddress;

const rpcEndpointOverride =
  process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE;

switch (process.env.NEXT_PUBLIC_ENVIRONMENT) {
  // case "mainnet":
  //   mfiConfig = getConfig("devnet1");
  //   // mfiEnvironment = mfiConfig.environment;
  //   rpcEndpoint =
  //     rpcEndpointOverride || "https://mrgnlab-main-fc47.mainnet.rpcpool.com/";
  //   // mfiProgramId = mfiConfig.programId;
  //   break;
  case "devnet":
    mfiConfig = getConfig("devnet1");
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
