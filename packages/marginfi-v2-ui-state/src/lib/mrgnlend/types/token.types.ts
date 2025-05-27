import { ActionEmodeImpact, Balance, MarginfiAccountWrapper, OraclePrice } from "@mrgnlabs/marginfi-client-v2";
import { MarginfiAccount } from "@mrgnlabs/marginfi-client-v2";
import { Bank } from "@mrgnlabs/marginfi-client-v2";
import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { BankState } from "./bank.types";

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
  healthFactor: { riskEngineHealth: number; computedHealth: number };
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
  emodeActive: boolean;
  amount: number;
  usdValue: number;
  weightedUSDValue: number;
  liquidationPrice: number | null;
  isDust: boolean;
}

type MakeLendingPositionProps = MakeLendingPositionWrappedProps | MakeLendingPositionRawProps;
interface MakeLendingPositionWrappedProps {
  balance: Balance;
  bank: Bank;
  bankInfo: BankState;
  oraclePrice: OraclePrice;
  marginfiAccount: MarginfiAccountWrapper;
  emodeActive: boolean;
}
interface MakeLendingPositionRawProps {
  balance: Balance;
  bank: Bank;
  bankInfo: BankState;
  oraclePrice: OraclePrice;
  marginfiAccount: MarginfiAccount;
  banks: Map<string, Bank>;
  oraclePrices: Map<string, OraclePrice>;
  emodeActive: boolean;
}

interface UserInfo {
  tokenAccount: TokenAccount;
  maxDeposit: number;
  maxRepay: number;
  maxWithdraw: number;
  maxBorrow: number;
  emodeImpact?: ActionEmodeImpact;
}

type UserDataProps = UserDataWrappedProps | UserDataRawProps;
type UserDataWrappedProps = {
  nativeSolBalance: number;
  marginfiAccount: MarginfiAccountWrapper | null;
  tokenAccount: TokenAccount;
};
type UserDataRawProps = {
  nativeSolBalance: number;
  marginfiAccount: MarginfiAccount | null;
  tokenAccount: TokenAccount;
  banks: Map<string, Bank>;
  oraclePrices: Map<string, OraclePrice>;
};

type TokenAccountMap = Map<string, TokenAccount>;

export type {
  TokenPriceMap,
  TokenPrice,
  TokenAccount,
  TokenAccountMap,
  AccountSummary,
  LendingPosition,
  MakeLendingPositionProps,
  MakeLendingPositionWrappedProps,
  MakeLendingPositionRawProps,
  UserInfo,
  UserDataProps,
  UserDataWrappedProps,
  UserDataRawProps,
};
