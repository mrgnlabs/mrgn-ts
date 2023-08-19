import { PublicKey } from "@solana/web3.js";
import { Bank } from "@mrgnlabs/marginfi-client-v2";
import BigNumber from "bignumber.js";
import { Transaction } from "@solana/web3.js";

export interface AccountSummary {
  balance: number;
  lendingAmount: number;
  borrowingAmount: number;
  apy: number;
  outstandingUxpEmissions: number;
  balanceUnbiased: number;
  lendingAmountUnbiased: number;
  borrowingAmountUnbiased: number;
  lendingAmountWithBiasAndWeighted: number;
  borrowingAmountWithBiasAndWeighted: number;
  signedFreeCollateral: number;
}

export interface BankInfo {
  address: PublicKey;
  tokenIcon?: string;
  tokenSymbol: string;
  tokenMint: PublicKey;
  tokenMintDecimals: number;
  tokenPrice: number;
  lendingRate: number;
  borrowingRate: number;
  emissionsRate: number;
  emissions: Emissions;
  totalPoolDeposits: number;
  totalPoolBorrows: number;
  availableLiquidity: number;
  utilizationRate: number;
  bank: Bank;
}

export interface UserPosition {
  isLending: boolean;
  amount: number;
  usdValue: number;
  weightedUSDValue: number;
}

export interface TokenMetadata {
  icon?: string;
  name: string;
  symbol: string;
}

export interface BankMetadata {
  tokenAddress: string;
  tokenName: string;
  tokenSymbol: string;
}

export interface TokenPriceMap {
  [key: string]: {
    price: BigNumber;
    decimals: number;
  };
}

export type TokenMetadataMap = { [symbol: string]: TokenMetadata };
export type BankMetadataMap = { [address: string]: BankMetadata };

export interface TokenAccount {
  mint: PublicKey;
  created: boolean;
  balance: number;
}

export type TokenAccountMap = Map<string, TokenAccount>;

export enum ActionType {
  Deposit = "Supply",
  Borrow = "Borrow",
  Repay = "Repay",
  Withdraw = "Withdraw",
}

export interface BankInfoForAccountBase extends BankInfo {
  tokenBalance: number;
  maxDeposit: number;
  maxRepay: number;
  maxWithdraw: number;
  maxBorrow: number;
}

export type ActiveBankInfo = BankInfoForAccountBase & { hasActivePosition: true; position: UserPosition };
export type InactiveBankInfo = BankInfoForAccountBase & { hasActivePosition: false };
export type ExtendedBankInfo = ActiveBankInfo | InactiveBankInfo;

export const isActiveBankInfo = (bankInfo: ExtendedBankInfo): bankInfo is ActiveBankInfo => bankInfo.hasActivePosition;

export enum Emissions {
  Inactive,
  Lending,
  Borrowing,
}

// ---------------------
// Mayan types
// ---------------------

export type MayanWidgetChainName = "solana" | "ethereum" | "bsc" | "polygon" | "avalanche" | "arbitrum" | "aptos";

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

export type TransactionSigner = (transaction: Transaction) => Promise<Transaction> | null | undefined;
export type SolanaWalletData = {
  publicKey?: string | null;
  signTransaction?: TransactionSigner | null;
  onClickOnConnect: () => void;
  onClickOnDisconnect: () => void;
};

export type MayanWidgetSolanaConfigType = MayanWidgetConfigType & {
  solanaWallet: SolanaWalletData;
};

export type MayanSwapInfo = {
  hash: string;
  fromChain: MayanWidgetChainName;
  toChain: MayanWidgetChainName;
  fromToken: string;
  toToken: string;
  fromAmount: number;
};

// ---------------------
// End mayan types
// ---------------------
