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
