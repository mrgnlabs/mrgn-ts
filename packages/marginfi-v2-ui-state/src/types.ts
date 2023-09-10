import { Transaction } from "@solana/web3.js";

// ----------------------------------------------------------------------------
// Mayan types
// ----------------------------------------------------------------------------

type MayanWidgetChainName = "solana" | "ethereum" | "bsc" | "polygon" | "avalanche" | "arbitrum" | "aptos";

// visit the Figma link below to see the color palette
// https://www.figma.com/community/file/1236300242311853150/Mayan-Widget
type MayanWidgetColors = {
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
type MayanWidgetConfigType = {
  appIdentity: {
    uri: string;
    icon: string; //should be relative
    name: string;
  }; //use for  Wallet Adapter
  rpcs?: { [index in MayanWidgetChainName]?: string };
  sourceChains?: MayanWidgetChainName[];
  destinationChains?: MayanWidgetChainName[];
  tokens?: {
    from?: { [index in MayanWidgetChainName]?: string[] };
    to?: { [index in MayanWidgetChainName]?: string[] };
    featured?: { [index in MayanWidgetChainName]?: string[] };
  };
  defaultGasDrop?: { [index in MayanWidgetChainName]?: number };
  referrerAddress?: string;
  colors?: MayanWidgetColors;
};

type TransactionSigner = (transaction: Transaction) => Promise<Transaction> | null | undefined;
type SolanaWalletData = {
  publicKey?: string | null;
  signTransaction?: TransactionSigner | null;
  onClickOnConnect: () => void;
  onClickOnDisconnect: () => void;
};

type MayanWidgetSolanaConfigType = MayanWidgetConfigType & {
  solanaWallet: SolanaWalletData;
};

type MayanSwapInfo = {
  hash: string;
  fromChain: MayanWidgetChainName;
  toChain: MayanWidgetChainName;
  fromToken: string;
  toToken: string;
  fromAmount: number;
};

export type { MayanWidgetChainName, MayanWidgetConfigType, MayanWidgetSolanaConfigType, MayanSwapInfo };

// ----------------------------------------------------------------------------
// Points API types
// ----------------------------------------------------------------------------

type SigningMethod = "memo" | "tx";

export type { SigningMethod };
