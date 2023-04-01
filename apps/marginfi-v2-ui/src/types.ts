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

enum ProductType {
  Superstake = "⚡️stake",
}

enum ActionType {
  Deposit = "Deposit",
  Borrow = "Borrow",
  Repay = "Repay",
  Withdraw = "Withdraw",
}

export interface BankInfoForAccountBase extends BankInfo {
  tokenBalance: number; // current user's token balance
  maxDeposit: number; // max amount user can deposit
  maxRepay: number; // max amount user can repay
  maxWithdraw: number; // max amount user can withdraw
  maxBorrow: number; // max amount user can borrow
  intrinsicColor?: string; // associated color for the token
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

export { ActionType, ProductType, isActiveBankInfo };
