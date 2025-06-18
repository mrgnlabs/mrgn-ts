import { ActionEmodeImpact } from "@mrgnlabs/marginfi-client-v2";
import { PublicKey } from "@solana/web3.js";
import BigNumber from "bignumber.js";

export interface TokenPriceMap {
  [key: string]: TokenPrice;
}

export interface TokenPrice {
  price: BigNumber;
  decimals: number;
  tokenProgram: PublicKey;
}

export interface RawMintData {
  mint: PublicKey;
  decimals: number;
  tokenProgram: PublicKey;
}

export interface TokenAccount {
  mint: PublicKey;
  created: boolean;
  balance: number;
}

export interface TokenAccountDto {
  mint: string;
  created: boolean;
  balance: number;
}
