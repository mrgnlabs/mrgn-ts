type WalletActivity = {
  id: string;
  type: "deposit" | "borrow" | "withdraw" | "repay";
  timestamp: Date;
  txn: string;
  details: {
    amount: number;
    mint: string;
    symbol: string;
  };
};

export type { WalletActivity };
