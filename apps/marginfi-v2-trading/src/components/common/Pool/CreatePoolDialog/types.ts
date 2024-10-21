import { PublicKey } from "@solana/web3.js";

export enum CreatePoolState {
  MINT = "mint",
  FORM = "form",
  LOADING = "loading",
  SUCCESS = "success",
  ERROR = "error",
}

export type PoolData = {
  mint: PublicKey;
  name: string;
  symbol: string;
  icon: string;
  decimals: number;
  quoteBank: "USDC" | "LST";
  group?: PublicKey;
};
