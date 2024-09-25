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
