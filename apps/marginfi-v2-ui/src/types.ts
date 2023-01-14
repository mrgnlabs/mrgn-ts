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
  bankMetadata: BankMetadata;
}

interface BankMetadata {
  icon?: string;
}

export type { AccountSummary, UserPosition, BankMetadata };
