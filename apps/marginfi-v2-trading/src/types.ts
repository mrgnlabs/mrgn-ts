import { ActionType, ActiveBankInfo, ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";
import { QuoteResponse } from "@jup-ag/api";

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

export type TokenData = {
  address: string;
  name: string;
  symbol: string;
  imageUrl: string;
  decimals: number;
  price: number;
  priceChange24h: number;
  volume24h: number;
  volumeChange24h: number;
  volume4h: number;
  volumeChange4h: number;
  marketcap: number;
};
