type WalletActivityBase = {
  id: string;
  type: "deposit" | "borrow";
  timestamp: Date;
  txn: string;
};

type WalletActivityDeposit = WalletActivityBase & {
  type: "deposit";
  details: {
    depositMint: string;
    depositSymbol: string;
    depositAmount: number;
  };
};

type WalletActivityBorrow = WalletActivityBase & {
  type: "borrow";
  details: {
    borrowMint: string;
    borrowSymbol: string;
    borrowAmount: number;
  };
};

type WalletActivity = WalletActivityDeposit | WalletActivityBorrow;

export type { WalletActivityBase, WalletActivityDeposit, WalletActivityBorrow, WalletActivity };
