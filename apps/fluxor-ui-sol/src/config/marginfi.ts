import { PublicKey } from "@solana/web3.js";
import { getConfig } from "@mrgnlabs/marginfi-client-v2";

// ================
// MAIN APP CONFIG
// ================

let mfiConfig, devFaucetAddress;
let campaignWhitelist: { icon: string; size: number; publicKey: string }[];

const environment = process.env.NEXT_PUBLIC_MARGINFI_ENVIRONMENT;
const groupOverride = process.env.NEXT_PUBLIC_MARGINFI_GROUP_OVERRIDE;
const programOverride = process.env.NEXT_PUBLIC_MARGINFI_PROGRAM_OVERRIDE;

switch (environment) {
  case "production":
    mfiConfig = getConfig(environment);
    if (groupOverride) {
      mfiConfig.groupPk = new PublicKey(groupOverride);
    }
    if (programOverride) {
      mfiConfig.programId = new PublicKey(programOverride);
    }
    campaignWhitelist = [
      {
        icon: "https://s2.coinmarketcap.com/static/img/coins/64x64/23095.png",
        size: 30,
        publicKey: "94hHpPTJk2Kq7cyAkC3a2uPUqx7oJZBaScyzwvLZ6mx2",
      },
    ];
    break;
  case "alpha":
    mfiConfig = getConfig(environment);
    if (groupOverride) {
      mfiConfig.groupPk = new PublicKey(groupOverride);
    }
    campaignWhitelist = [];
    break;
  case "staging":
    mfiConfig = getConfig(environment);
    if (groupOverride) {
      mfiConfig.groupPk = new PublicKey(groupOverride);
    }
    campaignWhitelist = [];
    break;
  case "dev":
    mfiConfig = getConfig(environment);
    if (groupOverride) {
      mfiConfig.groupPk = new PublicKey(groupOverride);
    }
    devFaucetAddress = new PublicKey("B87AhxX6BkBsj3hnyHzcerX2WxPoACC7ZyDr8E7H9geN");
    campaignWhitelist = [];
    break;
  default:
    mfiConfig = getConfig("dev");
    devFaucetAddress = new PublicKey("57hG7dDLXUg6GYDzAw892V4qLm6FhKxd86vMLazyFL98");
    campaignWhitelist = [
      {
        icon: "https://cryptologos.cc/logos/solana-sol-logo.png?v=024",
        size: 30,
        publicKey: "2rLruwVahfKBLJADLdxPTR7xdmsqjyw4jCm7d8TmM7cN",
      },
      {
        icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=024",
        size: 30,
        publicKey: "AjyDM13qAPeE7MQgaS53UcgomVc7o7tfxssDggx5kJHt",
      },
    ];
}

const config = {
  mfiConfig,
  devFaucetAddress,
  campaignWhitelist,
};

export default config;
export const WALLET_BALANCE_MARGIN_SOL = 0.1;

// FEES
const HIGH_PRIO_FEE = 0.00005;
const MAMA_PRIO_FEE = 0.005;

export { HIGH_PRIO_FEE, MAMA_PRIO_FEE };
