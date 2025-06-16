import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";

export interface TokenPriceMap {
  [key: string]: TokenPrice;
}

interface TokenPrice {
  price: BigNumber;
  decimals: number;
  tokenProgram: PublicKey;
}

export interface RawMintData {
  address: PublicKey;
  decimals: number;
  tokenProgram: PublicKey;
}
