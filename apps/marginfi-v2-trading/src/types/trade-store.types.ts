import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { PublicKey } from "@solana/web3.js";

export type ArenaBank = ExtendedBankInfo & {
  tokenData?: {
    price: number;
    priceChange24hr: number;
    volume24hr: number;
    volumeChange24hr: number;
    marketCap: number;
  };
};

type ArenaPoolPositionBank = {
  bankPk: PublicKey;
  startAmount: number;
  startUsdAmount: number;
  currentAmount: number;
  currentUsdAmount: number;
  pnl: number;
  interest: number;
};

export type ArenaPoolPnl = {
  groupPk: PublicKey;
  realizedPnl: number;
  unrealizedPnl: number;
  totalPnl: number;
  currentPosition: number;
  markPrice: number;
  quotePriceUsd: number;
  entryPrices: number[] | null;
  realizedPnlUsd: number;
  unrealizedPnlUsd: number;
  totalPnlUsd: number;
};

export type ArenaPoolPositions = {
  groupPk: PublicKey;
  authorityPk: PublicKey;
  accountPk: PublicKey;
  direction: "long" | "short";
  entryPrice: number;
  currentPositionValue: number;
  pnl?: number;
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
  createdAt: string;
  createdBy: string;
  featured: boolean;
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
  lookupTables: PublicKey[];
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

export enum LendingModes {
  LEND = "lend",
  BORROW = "borrow",
}

export enum PoolTypes {
  ALL = "all",
  ISOLATED = "isolated",
  STABLE = "stable",
  LST = "lst",
}

export type TokenData = {
  address: string;
  name: string;
  symbol: string;
  imageUrl: string;
  decimals: number;
  price: number;
  priceChange24h: number;
  volume24h: number;
  volumeChange24h: number;
  volume4h: number;
  volumeChange4h: number;
  marketcap: number;
};
