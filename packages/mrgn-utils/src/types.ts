import { QuoteResponse } from "@jup-ag/api";
import { ActionType, ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

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

interface PreviousTxnLending {
  txn: string;
  txnType: "LEND";
  lendingOptions: {
    amount: number;
    type: ActionType;
    bank: ActiveBankInfo;
  };
}

interface PreviousTxnPositionClosed {
  txn: string;
  txnType: "CLOSE_POSITION";
  positionClosedOptions: {
    tokenBank: ExtendedBankInfo;
    collateralBank: ExtendedBankInfo;
  };
}

interface PreviousTxnTrading {
  txn: string;
  txnType: "TRADING";
  tradingOptions: {
    initDepositAmount: string;
    depositAmount: number;
    depositBank: ActiveBankInfo;
    borrowAmount: number;
    borrowBank: ActiveBankInfo;
    leverage: number;
    quote: QuoteResponse;
    entryPrice: number;
    type: "long" | "short";
  };
}

export type PreviousTxn = PreviousTxnLending | PreviousTxnTrading | PreviousTxnPositionClosed;
