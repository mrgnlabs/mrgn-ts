import { DefaultApi } from "@jup-ag/api";
import { Bank } from "@mrgnlabs/marginfi-client-v2";
import { TokenInfo } from "@solana/spl-token-registry";
import { PublicKey } from "@solana/web3.js";

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

type RouteMap = Map<string, string[]>;

interface JupiterParams {
  api: DefaultApi;
  tokenMap: Map<string, TokenInfo>;
  routeMap: RouteMap;
}

type DispatchAction = "deposit" | "borrow" | "stake" | "unstake";

export type { AccountSummary, BankInfo, UserPosition, JupiterParams, DispatchAction };
