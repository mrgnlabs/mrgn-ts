import { QuoteResponse } from "@jup-ag/api";

export enum LendingModes {
  LEND = "lend",
  BORROW = "borrow",
}

export enum PoolTypes {
  ALL = "all",
  GLOBAL = "global",
  ISOLATED = "isolated",
  STABLE = "stable",
  LST = "lst",
  NATIVE_STAKE = "native_stake",
}

export type QuoteResponseMeta = {
  quoteResponse: QuoteResponse;
  original: any;
};
