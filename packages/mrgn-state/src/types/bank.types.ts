import { Bank, OraclePrice } from "@mrgnlabs/marginfi-client-v2";
import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";
import { UserInfo } from "./user.types";

export interface StakePoolMetadata {
  validatorVoteAccount: PublicKey;
  validatorRewards: number;
  isActive: boolean;
  mev: {
    pool: number;
    onramp: number;
  };
}
export interface ExtendedBankMetadata {
  address: PublicKey;
  tokenSymbol: string;
  tokenName: string;
  tokenLogoUri: string;
}

export interface BankState {
  mint: PublicKey;
  mintDecimals: number;
  price: number;
  lendingRate: number;
  borrowingRate: number;
  emissionsRate: number;
  emissions: Emissions;
  totalDeposits: number;
  depositCap: number;
  totalBorrows: number;
  borrowCap: number;
  availableLiquidity: number;
  utilizationRate: number;
  isIsolated: boolean;
  originalWeights: { assetWeightMaint: BigNumber; assetWeightInit: BigNumber };
  hasEmode: boolean;
}

export interface LendingPosition {
  isLending: boolean;
  emodeActive: boolean;
  amount: number;
  usdValue: number;
  weightedUSDValue: number;
  liquidationPrice: number | null;
  isDust: boolean;
}

export interface BankInfo {
  rawBank: Bank;
  oraclePrice: OraclePrice;
  state: BankState;
}

export interface InactiveBankInfo {
  address: PublicKey;
  meta: ExtendedBankMetadata;
  info: BankInfo;
  isActive: false;
  userInfo: UserInfo;
}

export interface ActiveBankInfo {
  address: PublicKey;
  meta: ExtendedBankMetadata;
  info: BankInfo;
  isActive: true;
  userInfo: UserInfo;
  position: LendingPosition;
}

export enum Emissions {
  Inactive,
  Lending,
  Borrowing,
}

export type ExtendedBankInfo = ActiveBankInfo | InactiveBankInfo;
