import { PublicKey } from "@solana/web3.js";
import { Bank } from "@mrgnlabs/marginfi-client-v2";

interface AccountSummary {
  balance: number;
  lendingAmount: number;
  borrowingAmount: number;
  apy: number;
}

interface BankInfo {
  address: PublicKey;
  tokenIcon?: string;
  tokenName: string;
  tokenMint: PublicKey;
  tokenMintDecimals: number;
  tokenPrice: number;
  lendingRate: number;
  borrowingRate: number;
  totalPoolDeposits: number;
  totalPoolBorrows: number;
  availableLiquidity: number;
  utilizationRate: number;
  bank: Bank;
}

interface UserPosition {
  isLending: boolean;
  amount: number;
  usdValue: number;
}

interface TokenMetadata {
  icon?: string;
}

type TokenMetadataMap = { [symbol: string]: TokenMetadata };

interface TokenAccount {
  mint: PublicKey;
  created: boolean;
  balance: number;
}

type TokenAccountMap = Map<string, TokenAccount>;

interface Product {
  name: string;
  icon: React.ReactElement;
}

enum ProductType {
  Lend = "Lend",
  Borrow = "Borrow",
  Short = "Short",
  Superstake = '⚡️stake',
  // Lock = "Lock",
}

enum ActionType {
  Deposit = "Deposit",
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

type ActiveBankInfo = BankInfoForAccountBase & { hasActivePosition: true; position: UserPosition };
type InactiveBankInfo = BankInfoForAccountBase & { hasActivePosition: false };
type ExtendedBankInfo = ActiveBankInfo | InactiveBankInfo;

const isActiveBankInfo = (bankInfo: ExtendedBankInfo): bankInfo is ActiveBankInfo => bankInfo.hasActivePosition;

export type {
  AccountSummary,
  BankInfo,
  UserPosition,
  TokenMetadata,
  TokenMetadataMap,
  TokenAccount,
  TokenAccountMap,
  ActiveBankInfo,
  InactiveBankInfo,
  ExtendedBankInfo,
};

export { ActionType, Product, ProductType, isActiveBankInfo };
