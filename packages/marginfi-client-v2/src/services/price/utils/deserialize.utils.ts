import BigNumber from "bignumber.js";
import { OraclePriceDto, OraclePrice } from "../types";

export function dtoToOraclePrice(dto: OraclePriceDto): OraclePrice {
  return {
    priceRealtime: {
      price: new BigNumber(dto.priceRealtime.price),
      confidence: new BigNumber(dto.priceRealtime.confidence),
      lowestPrice: new BigNumber(dto.priceRealtime.lowestPrice),
      highestPrice: new BigNumber(dto.priceRealtime.highestPrice),
    },
    priceWeighted: {
      price: new BigNumber(dto.priceWeighted.price),
      confidence: new BigNumber(dto.priceWeighted.confidence),
      lowestPrice: new BigNumber(dto.priceWeighted.lowestPrice),
      highestPrice: new BigNumber(dto.priceWeighted.highestPrice),
    },
    timestamp: new BigNumber(dto.timestamp),
    pythShardId: dto.pythShardId,
  };
}
