import {
  ActionEmodeImpact,
  Balance,
  Bank,
  MarginfiAccount,
  MarginfiAccountWrapper,
  OraclePrice,
} from "@mrgnlabs/marginfi-client-v2";
import { TokenAccount } from "./token.types";
import { BankState } from "./bank.types";

export interface UserInfo {
  tokenAccount: TokenAccount;
  maxDeposit: number;
  maxRepay: number;
  maxWithdraw: number;
  maxBorrow: number;
  emodeImpact?: ActionEmodeImpact;
}

export type UserDataProps = UserDataWrappedProps | UserDataRawProps;
export type UserDataWrappedProps = {
  nativeSolBalance: number;
  marginfiAccount: MarginfiAccountWrapper | null;
  tokenAccount: TokenAccount;
};
export type UserDataRawProps = {
  nativeSolBalance: number;
  marginfiAccount: MarginfiAccount | null;
  tokenAccount: TokenAccount;
  banks: Map<string, Bank>;
  oraclePrices: Map<string, OraclePrice>;
};

export type TokenAccountMap = Map<string, TokenAccount>;

export interface AccountSummary {
  healthFactor: number;
  balanceEquity: number;
  lendingAmountEquity: number;
  borrowingAmountEquity: number;
  apy: number;
  lendingAmountMaintenance: number;
  borrowingAmountMaintenance: number;
  signedFreeCollateral: number;
  healthSimFailed: boolean;
}

export type MakeLendingPositionProps = MakeLendingPositionWrappedProps | MakeLendingPositionRawProps;

export interface MakeLendingPositionWrappedProps {
  balance: Balance;
  bank: Bank;
  bankInfo: BankState;
  oraclePrice: OraclePrice;
  marginfiAccount: MarginfiAccountWrapper;
  emodeActive: boolean;
}
export interface MakeLendingPositionRawProps {
  balance: Balance;
  bank: Bank;
  bankInfo: BankState;
  oraclePrice: OraclePrice;
  marginfiAccount: MarginfiAccount;
  banks: Map<string, Bank>;
  oraclePrices: Map<string, OraclePrice>;
  emodeActive: boolean;
}
