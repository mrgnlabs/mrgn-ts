type WalletActivity = {
  id: string;
  type: "deposit" | "borrow" | "withdraw" | "repay";
  timestamp: Date;
  txn: string;
  details: {
    amount: number;
    mint: string;
    symbol: string;
    secondaryAmount?: number;
    secondarySymbol?: string;
    secondaryMint?: string;
  };
};

export type { WalletActivity };
