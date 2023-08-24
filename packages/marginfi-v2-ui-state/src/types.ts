import { PublicKey } from "@solana/web3.js";
import { Bank, OraclePrice } from "@mrgnlabs/marginfi-client-v2";
import BigNumber from "bignumber.js";
import { Transaction } from "@solana/web3.js";

// ----------------------------------------------------------------------------
// Mrgnlend state types
// ----------------------------------------------------------------------------

interface AccountSummary {
  healthFactor: number;
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

interface UserPosition {
  isLending: boolean;
  amount: number;
  usdValue: number;
  weightedUSDValue: number;
}

interface TokenPriceMap {
  [key: string]: TokenPrice;
}

interface TokenPrice {
  price: BigNumber;
  decimals: number;
}

interface TokenAccount {
  mint: PublicKey;
  created: boolean;
  balance: number;
}

type TokenAccountMap = Map<string, TokenAccount>;

interface BankInfo {
  bank: Bank;
  oraclePrice: OraclePrice;

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
}

interface BankInfoForAccountBase {
  tokenAccount: TokenAccount;
  maxDeposit: number;
  maxRepay: number;
  maxWithdraw: number;
  maxBorrow: number;
}

type ActiveBankInfo = BankInfo & BankInfoForAccountBase & { hasActivePosition: true; position: UserPosition };
type InactiveBankInfo = BankInfo & BankInfoForAccountBase & { hasActivePosition: false };
type ExtendedBankInfo = ActiveBankInfo | InactiveBankInfo;

const isActiveBankInfo = (bankInfo: ExtendedBankInfo): bankInfo is ActiveBankInfo => bankInfo.hasActivePosition;

enum Emissions {
  Inactive,
  Lending,
  Borrowing,
}

enum ActionType {
  Deposit = "Supply",
  Borrow = "Borrow",
  Repay = "Repay",
  Withdraw = "Withdraw",
}

export { isActiveBankInfo, Emissions, ActionType };
export type {
  AccountSummary,
  UserPosition,
  TokenPriceMap,
  TokenPrice,
  TokenAccount,
  TokenAccountMap,
  BankInfo,
  BankInfoForAccountBase,
  ActiveBankInfo,
  InactiveBankInfo,
  ExtendedBankInfo,
};

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
