import BigNumber from "bignumber.js";

export interface PriceWithConfidence {
  price: BigNumber;
  confidence: BigNumber;
  lowestPrice: BigNumber;
  highestPrice: BigNumber;
}

export interface OraclePrice {
  priceRealtime: PriceWithConfidence;
  priceWeighted: PriceWithConfidence;
  timestamp: BigNumber;
  pythShardId?: number;
}

export enum PriceBias {
  Lowest = 0,
  None = 1,
  Highest = 2,
}
