import { QuoteResponse } from "@jup-ag/api";
import { ActionType, ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { WalletToken } from "@mrgnlabs/mrgn-common";

export enum LendingModes {
  LEND = "lend",
  BORROW = "borrow",
}

export enum PoolTypes {
  ALL = "all",
  ISOLATED = "isolated",
  STABLE = "stable",
  LST = "lst",
  NATIVE_STAKE = "native_stake",
}

interface PreviousTxnLending {
  txn: string;
  txnType: "LEND";
  lendingOptions: {
    amount: number;
    type: ActionType;
    bank: ActiveBankInfo;
    collatRepay?: {
      borrowBank: ActiveBankInfo;
      withdrawBank: ActiveBankInfo;
      withdrawAmount: number;
    };
  };
}

interface PreviousTxnStake {
  txn: string;
  txnType: "STAKE" | "UNSTAKE";
  stakingOptions: {
    amount: number;
    type: ActionType;
    originDetails: {
      amount: number;
      bank: ExtendedBankInfo;
    };
  };
}

interface PreviousTxnLoop {
  txn: string;
  txnType: "LOOP";
  loopOptions: {
    depositBank: ActiveBankInfo;
    borrowBank: ActiveBankInfo;
    depositAmount: number;
    borrowAmount: number;
    leverage: number;
  };
}

interface PreviousTxnPositionClosed {
  txn: string;
  txnType: "CLOSE_POSITION";
  positionClosedOptions: {
    tokenBank: ExtendedBankInfo;
    collateralBank: ExtendedBankInfo;
    size: number;
    leverage: number;
    entryPrice: number;
    exitPrice: number;
    pnl: number;
  };
}

interface PreviousTxnDepositSwap {
  txn: string;
  txnType: "DEPOSIT_SWAP";
  depositSwapOptions: {
    depositBank: ActiveBankInfo;
    swapBank: ActiveBankInfo;
    depositAmount: number;
    swapAmount: number;
    walletToken?: WalletToken | null;
  };
}

export interface PreviousTxnTradingOptions {
  initDepositAmount: string;
  depositAmount: number;
  depositBank: ActiveBankInfo;
  borrowAmount: number;
  borrowBank: ActiveBankInfo;
  leverage: number;
  quote: QuoteResponse;
  entryPrice: number;
  type: "long" | "short";
}

interface PreviousTxnTrading {
  txn: string;
  txnType: "TRADING";
  tradingOptions: PreviousTxnTradingOptions;
}

interface PreviousTxnRepay {
  txn: string;
  txnType: "REPAY";
  repayOptions: {
    type: ActionType;
    selectedBank: ActiveBankInfo;
    selectedSecondaryBank: ActiveBankInfo;
    repayAmount: number;
    withdrawAmount: number;
  };
}

export type PreviousTxn =
  | PreviousTxnLoop
  | PreviousTxnLending
  | PreviousTxnTrading
  | PreviousTxnPositionClosed
  | PreviousTxnStake
  | PreviousTxnDepositSwap
  | PreviousTxnRepay;

export type QuoteResponseMeta = {
  quoteResponse: QuoteResponse;
  original: any;
};
