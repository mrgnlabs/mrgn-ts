import { Bank, EmodeTag, OraclePrice } from "@mrgnlabs/marginfi-client-v2";
import { PublicKey } from "@solana/web3.js";

import { LendingPosition, UserInfo } from "./token.types";

interface StakePoolMetadata {
  validatorVoteAccount: PublicKey;
  validatorRewards: number;
  isActive: boolean;
  mev: {
    pool: number;
    onramp: number;
  };
}

interface ExtendedBankMetadata {
  address: PublicKey;
  tokenSymbol: string;
  tokenName: string;
  tokenLogoUri: string;
  stakePool?: StakePoolMetadata;
}

interface BankState {
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
  hasEmode: boolean;
}

interface BankInfo {
  rawBank: Bank;
  oraclePrice: OraclePrice;
  state: BankState;
}

interface InactiveBankInfo {
  address: PublicKey;
  meta: ExtendedBankMetadata;
  info: BankInfo;
  isActive: false;
  userInfo: UserInfo;
}

interface ActiveBankInfo {
  address: PublicKey;
  meta: ExtendedBankMetadata;
  info: BankInfo;
  isActive: true;
  userInfo: UserInfo;
  position: LendingPosition;
}

type ExtendedBankInfo = ActiveBankInfo | InactiveBankInfo;

enum Emissions {
  Inactive,
  Lending,
  Borrowing,
}

type EmodePair = {
  collateralBankTag: EmodeTag;
  liabilityBank: PublicKey;
  liabilityBankTag: EmodeTag;
  assetWeightMaint: number;
  assetWeightInt: number;
};

export { Emissions };
export type {
  ActiveBankInfo,
  ExtendedBankInfo,
  BankInfo,
  BankState,
  ExtendedBankMetadata,
  StakePoolMetadata,
  EmodePair,
};
