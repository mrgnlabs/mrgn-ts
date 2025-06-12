import BigNumber from "bignumber.js";

export interface TokenPriceMap {
  [key: string]: TokenPrice;
}

interface TokenPrice {
  price: BigNumber;
  decimals: number;
}
