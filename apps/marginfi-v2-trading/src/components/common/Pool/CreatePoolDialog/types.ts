import { PublicKey } from "@solana/web3.js";

export enum CreatePoolState {
  TOKEN = "token",
  QUOTE = "quote",
  FORM = "form",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}

export type PoolMintData = {
  mint: PublicKey;
  name: string;
  symbol: string;
  icon: string;
  decimals: number;
};

export type PoolData = {
  token: PoolMintData;
  quoteToken?: PoolMintData;
  group?: PublicKey;
};
