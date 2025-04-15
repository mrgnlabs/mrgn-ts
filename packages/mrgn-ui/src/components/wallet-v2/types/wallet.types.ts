type WalletActivity = {
  id: string;
  type: "deposit" | "borrow" | "withdraw" | "repay" | "stake" | "unstake" | "loop" | "deposit-swap";
  timestamp: Date;
  txn: string;
  account: string;
  accountLabel: string;
  details: {
    amount: number;
    mint: string;
    symbol: string;
    secondaryAmount?: number;
    secondarySymbol?: string;
    secondaryMint?: string;
    secondaryImage?: string;
  };
};

export type { WalletActivity };
