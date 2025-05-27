import { QuoteResponse } from "@jup-ag/api";

export enum LendSelectionGroups {
  WALLET,
  SUPPLYING,
  BORROWING,
  GLOBAL,
  ISOLATED,
  STAKED,
}

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
  E_MODE = "e_mode",
}

export type QuoteResponseMeta = {
  quoteResponse: QuoteResponse;
  original: any;
};
