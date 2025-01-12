import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";

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

interface LendingPosition {
  isLending: boolean;
  amount: number;
  usdValue: number;
  weightedUSDValue: number;
  liquidationPrice: number | null;
  isDust: boolean;
}

interface UserInfo {
  tokenAccount: TokenAccount;
  maxDeposit: number;
  maxRepay: number;
  maxWithdraw: number;
  maxBorrow: number;
}

type TokenAccountMap = Map<string, TokenAccount>;

export type { TokenPriceMap, TokenPrice, TokenAccount, TokenAccountMap, AccountSummary, LendingPosition, UserInfo };
