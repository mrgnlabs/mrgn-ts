import { Environment, getConfig } from "@mrgnlabs/marginfi-client-v2";
import { ENV as ENVChainId } from "@solana/spl-token-registry";

let mfiConfig, JUPITER_CHAIN_ID: number;

const environment = "production" as Environment;

switch (environment) {
  case "production":
    mfiConfig = getConfig(environment);
    JUPITER_CHAIN_ID = ENVChainId.MainnetBeta;
    break;
  case "alpha":
    mfiConfig = getConfig(environment);
    break;
  case "staging":
    mfiConfig = getConfig(environment);
    JUPITER_CHAIN_ID = ENVChainId.Devnet;
    break;
  case "dev":
    mfiConfig = getConfig(environment);
    JUPITER_CHAIN_ID = ENVChainId.Devnet;
    break;
  default:
    mfiConfig = getConfig("dev");
    JUPITER_CHAIN_ID = ENVChainId.Devnet;
}

const config = {
  mfiConfig,
};

export default config;
export const WALLET_BALANCE_MARGIN_SOL = 0.1;
export const API_ENDPOINT = "https://omni-git-main-mrgn.vercel.app";
export { JUPITER_CHAIN_ID };
