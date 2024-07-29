import { ActionType, ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { QuoteResponseMeta } from "@jup-ag/react-hook";
import { QuoteResponse } from "@jup-ag/api";

// ----------------------------------------------------------------------------
// Mayan types
// ----------------------------------------------------------------------------

export type MayanWidgetChainName =
  | "solana"
  | "ethereum"
  | "bsc"
  | "polygon"
  | "avalanche"
  | "arbitrum"
  | "optimism"
  | "base";

// visit the Figma link below to see the color palette
// https://www.figma.com/community/file/1236300242311853150/Mayan-Widget
export type MayanWidgetColors = {
  N000?: string;
  N100?: string;
  N300?: string;
  N500?: string;
  N600?: string;
  N700?: string;
  N900?: string;
  tLightBlue?: string;
  green?: string;
  lightGreen?: string;
  red?: string;
  lightRed?: string;
  lightYellow?: string;
  primary?: string;
  primaryGradient?: string;
  tWhiteLight?: string;
  tWhiteBold?: string;
  tBlack?: string;
  mainBox?: string;
  background?: string;
  darkPrimary?: string;
  alwaysWhite?: string;
  tableBg?: string;
  transparentBg?: string;
  transparentBgDark?: string;
  buttonBackground?: string;
  toastBgRed?: string;
  toastBgNatural?: string;
  toastBgGreen?: string;
};
export type MayanWidgetConfigType = {
  // Constants
  enableSolanaPassThrough?: boolean;
  appIdentity: {
    uri: string;
    icon: string; //should be relative
    name: string;
  }; //use for  Wallet Adapter
  setDefaultToken?: boolean;

  // Init override
  rpcs?: { [index in MayanWidgetChainName]?: string };
  solanaExtraRpcs?: string[];
  defaultGasDrop?: { [index in MayanWidgetChainName]?: number };

  // Deeplink
  sourceChains?: MayanWidgetChainName[];
  destinationChains?: MayanWidgetChainName[];
  tokens?: {
    from?: { [index in MayanWidgetChainName]?: string[] };
    to?: { [index in MayanWidgetChainName]?: string[] };
    featured?: { [index in MayanWidgetChainName]?: string[] };
  };
  solanaReferrerAddress?: string;
  evmReferrerAddress?: string;
  referrerBps?: number;

  // Theme
  isNarrow?: boolean;
  colors?: MayanWidgetColors;
};

export type MayanSwapInfo = {
  hash: string;
  fromChain: MayanWidgetChainName;
  toChain: MayanWidgetChainName;
  fromToken: string;
  toToken: string;
  fromAmount: number;
};

export enum LendingModes {
  LEND = "lend",
  BORROW = "borrow",
}

export enum PoolTypes {
  ALL = "all",
  ISOLATED = "isolated",
  STABLE = "stable",
  LST = "lst",
}

export type SortAssetOption = {
  label: string;
  borrowLabel?: string;
  value: SortType;
  field: "APY" | "TVL";
  direction: sortDirection;
};

export enum sortDirection {
  ASC = "ASC",
  DESC = "DESC",
}

export enum SortType {
  APY_ASC = "APY_ASC",
  APY_DESC = "APY_DESC",
  TVL_ASC = "TVL_ASC",
  TVL_DESC = "TVL_DESC",
}

interface PreviousTxnLending {
  txn: string;
  txnType: "LEND";
  lendingOptions: {
    amount: number;
    type: ActionType;
    bank: ActiveBankInfo;
  };
}

interface PreviousTxnLst {
  txn: string;
  txnType: "LST";
  lstOptions: {
    amount: number;
    type: ActionType;
    bank: ActiveBankInfo;
    quote?: QuoteResponseMeta;
  };
}

interface PreviousTxnTrading {
  txn: string;
  txnType: "TRADING";
  tradingOptions: {
    initDepositAmount: string;
    depositAmount: number;
    depositBank: ActiveBankInfo;
    borrowAmount: number;
    borrowBank: ActiveBankInfo;
    leverage: number;
    quote: QuoteResponse;
    entryPrice: number;
    type: "long" | "short";
  };
}

export type PreviousTxn = PreviousTxnLending | PreviousTxnTrading | PreviousTxnLst;

export type TokenData = {
  address: string;
  name: string;
  symbol: string;
  imageUrl: string;
  decimals: number;
  price: number;
  priceChange24h: number;
  volume24h: number;
  volumeChange24h: number;
  volume4h: number;
  volumeChange4h: number;
  marketcap: number;
};
