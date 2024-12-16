import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { PublicKey } from "@solana/web3.js";
import { TokenData } from "~/types";

export type ArenaBank = ExtendedBankInfo & {
  tokenData?: {
    price: number;
    priceChange24hr: number;
    volume24hr: number;
    volumeChange24hr: number;
    marketCap: number;
  };
};

export type BankData = {
  totalDeposits: number;
  totalBorrows: number;
  totalDepositsUsd: number;
  totalBorrowsUsd: number;
  depositRate: number;
  borrowRate: number;
  availableLiquidity: number;
};

export type BankSummary = {
  bankPk: PublicKey;
  mint: PublicKey;
  tokenName: string;
  tokenSymbol: string;
  tokenLogoUri: string;
  tokenProgram: PublicKey;

  bankData: BankData;
  tokenData: TokenData;
};

export type ArenaPoolSummary = {
  groupPk: PublicKey;
  luts?: PublicKey[];
  quoteSummary: BankSummary;
  tokenSummary: BankSummary;
};

export enum GroupStatus {
  LP = "lp",
  LONG = "long",
  SHORT = "short",
  EMPTY = "empty",
}

export type ArenaPoolV2 = {
  groupPk: PublicKey;
  tokenBankPk: PublicKey;
  quoteBankPk: PublicKey;
};

export type ArenaPoolV2Extended = {
  groupPk: PublicKey;
  tokenBank: ArenaBank;
  quoteBank: ArenaBank;
  status: GroupStatus;
};

export type PositionBankData = {
  bankPk: PublicKey;
  startAmount: number;
  startUsdAmount: number;
  currentAmount: number;
  currentUsdAmount: number;
  pnl: number;
  interest: number;
};

export type PositionData = {
  groupPk: PublicKey;
  marginfiAccountPk: PublicKey;
  tokenBankPosition: PositionBankData;
  quoteBankPosition: PositionBankData;
  entryPrice: number;
  currentPositionValue: number;
  pnl: number;
};
