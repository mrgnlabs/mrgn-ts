import { PublicKey } from "@solana/web3.js";
import { getConfig } from "@mrgnlabs/marginfi-client-v2";
import { getConfig as getLipConfig } from "@mrgnlabs/lip-client";

// ================
// MAIN APP CONFIG
// ================

let mfiConfig, devFaucetAddress, lipConfig;
let campaignWhitelist: { icon: string; size: number; publicKey: string }[];

const environment = process.env.NEXT_PUBLIC_MARGINFI_ENVIRONMENT;
const groupOverride = process.env.NEXT_PUBLIC_MARGINFI_GROUP_OVERRIDE;

switch (environment) {
  case "production":
    mfiConfig = getConfig(environment);
    lipConfig = getLipConfig(environment);
    if (groupOverride) {
      mfiConfig.groupPk = new PublicKey(groupOverride);
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
    lipConfig = getLipConfig(environment);
    if (groupOverride) {
      mfiConfig.groupPk = new PublicKey(groupOverride);
    }
    campaignWhitelist = [];
    break;
  case "staging":
    mfiConfig = getConfig(environment);
    lipConfig = getLipConfig(environment);
    if (groupOverride) {
      mfiConfig.groupPk = new PublicKey(groupOverride);
    }
    campaignWhitelist = [];
    break;
  case "dev":
    mfiConfig = getConfig(environment);
    lipConfig = getLipConfig(environment);
    if (groupOverride) {
      mfiConfig.groupPk = new PublicKey(groupOverride);
    }
    devFaucetAddress = new PublicKey("B87AhxX6BkBsj3hnyHzcerX2WxPoACC7ZyDr8E7H9geN");
    campaignWhitelist = [];
    break;
  default:
    mfiConfig = getConfig("dev");
    lipConfig = getLipConfig("dev");
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
  lipConfig,
  campaignWhitelist,
};

export default config;
export const WALLET_BALANCE_MARGIN_SOL = 0.1;

// FEES
const INITIAL_PRIO_FEE = Number(process.env.NEXT_PUBLIC_INIT_PRIO_FEE) ?? 0;
const HIGH_PRIO_FEE = 0.00005;
const MAMA_PRIO_FEE = 0.005;

export { INITIAL_PRIO_FEE, HIGH_PRIO_FEE, MAMA_PRIO_FEE };
