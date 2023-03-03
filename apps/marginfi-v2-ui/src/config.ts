import { PublicKey } from "@solana/web3.js";
import { getConfig } from "@mrgnlabs/marginfi-client-v2";
import { getConfig as getLipConfig } from "@mrgnlabs/lip-client";
import { ProductType } from '~/types';

// ================
// MAIN APP CONFIG
// ================

let mfiConfig, rpcEndpoint, devFaucetAddress, lipConfig;
let campaignWhitelist: { icon: string; size: number; publicKey: string }[];

const environment = process.env.NEXT_PUBLIC_MARGINFI_ENVIRONMENT;
const rpcEndpointOverride = process.env.NEXT_PUBLIC_MARGINFI_RPC_ENDPOINT_OVERRIDE;
const groupOverride = process.env.NEXT_PUBLIC_MARGINFI_GROUP_OVERRIDE;

switch (environment) {
  case "production":
    mfiConfig = getConfig(environment);
    lipConfig = getLipConfig(environment);
    if (groupOverride) {
      mfiConfig.groupPk = new PublicKey(groupOverride);
    }
    rpcEndpoint = rpcEndpointOverride || "https://mrgn.rpcpool.com/";
    campaignWhitelist = [
      {
        icon: "https://cryptologos.cc/logos/solana-sol-logo.png?v=024",
        size: 30,
        publicKey: "B4zvDnVn1kPosJ4yDGWaPkJFE7z78r6wmdzhe1kxs1kT",
      },
      {
        icon: "https://cryptologos.cc/logos/usd-coin-usdc-logo.png?v=024",
        size: 30,
        publicKey: "Cm2yPJQ8qB1wo6b3268F9hC7YbBWRmF6h3mbvvekW68B",
      },
    ];
    break;
  case "alpha":
    mfiConfig = getConfig(environment);
    lipConfig = getLipConfig(environment);
    if (groupOverride) {
      mfiConfig.groupPk = new PublicKey(groupOverride);
    }
    rpcEndpoint = rpcEndpointOverride || "https://mrgn.rpcpool.com/";
    campaignWhitelist = [];
    break;
  case "staging":
    mfiConfig = getConfig(environment);
    lipConfig = getLipConfig(environment);
    if (groupOverride) {
      mfiConfig.groupPk = new PublicKey(groupOverride);
    }
    rpcEndpoint = rpcEndpointOverride || "https://mrgn.rpcpool.com/";
    campaignWhitelist = [];
    break;
  case "dev":
    mfiConfig = getConfig(environment);
    lipConfig = getLipConfig(environment);
    if (groupOverride) {
      mfiConfig.groupPk = new PublicKey(groupOverride);
    }
    rpcEndpoint = rpcEndpointOverride || "https://devnet.rpcpool.com/";
    devFaucetAddress = new PublicKey("B87AhxX6BkBsj3hnyHzcerX2WxPoACC7ZyDr8E7H9geN");
    campaignWhitelist = [];
    break;
  default:
    mfiConfig = getConfig("dev");
    lipConfig = getLipConfig("dev");
    rpcEndpoint = rpcEndpointOverride || "https://devnet.rpcpool.com/";
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
  rpcEndpoint,
  devFaucetAddress,
  lipConfig,
  campaignWhitelist,
};

export default config;
const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");
const WALLET_BALANCE_MARGIN_SOL = 0.1;

const productConfig = {
  [ProductType.Lock]: {
    header: {
      colNames: ['APY', 'Deposits', 'Lockup', 'Capacity', 'Wallet'],
      cellStyling: "min-w-[12.5%]",
    },
    dataRow: {
      rowStyling: "min-w-[62.5%]",
      header: {
        cellStyling: "min-w-[12.5%] max-w-[12.5%]",
      },
      inner: {
        cellStyling: "max-w-[20%]",
      },
      ender: {
        cellStyling: "max-w-[25%]"
      },
    },
  },
  [ProductType.Lend]: {
    header: {
      colNames: ['APY', 'Deposits', 'Capacity', 'Wallet' ],
      cellStyling: "min-w-[14.28%]",
    },
    dataRow: {
      rowStyling: "min-w-[57.16%]",
      header: {
        cellStyling: "min-w-[14.28%] max-w-[14.28%]",
      },
      inner: {
        cellStyling: "max-w-[25%]",
      },
      ender: {
        cellStyling: "max-w-[28.56%]",
      }
    },
  },
  [ProductType.Borrow]: {
    header: {
      colNames: ['APY', 'Borrows', 'Available', 'Max LTV', 'Wallet'],
      cellStyling: "min-w-[12.5%]",
    },
    dataRow: {
      rowStyling: "min-w-[62.5%]",
      header: {
        cellStyling: "min-w-[12.5%] max-w-[12.5%]",
      },
      inner: {
        cellStyling: "max-w-[20%]",
      },
      ender: {
        cellStyling: "max-w-[25%]",
      }
    },
  },
  [ProductType.Superstake]: {
    header: {
      colNames: [],
      cellStyling: "",
    },
    dataRow: {
      rowStyling: "",
      header: {
        cellStyling: ""
      },
      ender: {
        cellStyling: "",
      }
    },
  }
};
const productTypes = Object.keys(productConfig) as ProductType[];

export {
  productConfig,
  productTypes,
  WSOL_MINT,
  WALLET_BALANCE_MARGIN_SOL
}
