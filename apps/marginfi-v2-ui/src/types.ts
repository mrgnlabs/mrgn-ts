import Bank from "@mrgnlabs/marginfi-client-v2/src/bank";
import { PublicKey } from "@solana/web3.js";

interface AccountSummary {
  balance: number;
  lendingAmount: number;
  borrowingAmount: number;
  apy: number;
  positions: UserPosition[];
}

interface UserPosition {
  assetName: string;
  assetMint: PublicKey;
  amount: number;
  usdValue: number;
  isLending: boolean;
  apy: number;
  bank: Bank;
  tokenMetadata: TokenMetadata;
}

interface TokenMetadata {
  icon?: string;
}

type TokenMetadataMap = { [symbol: string]: TokenMetadata };

enum ActionType {
  Deposit = "Deposit",
  Borrow = "Borrow",
  Repay = "Repay",
  Withdraw = "Withdraw",
}

export type { AccountSummary, UserPosition, TokenMetadata, TokenMetadataMap };

export { ActionType };
