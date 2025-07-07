import { ActionType } from "@mrgnlabs/mrgn-state";

type WalletActivity = {
  id: string;
  type: ActionType;
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
