import { PublicKey } from "@solana/web3.js";

export type MarginfiGroupType = {
  admin: PublicKey;
  address: PublicKey;
};

export type MarginfiGroupTypeDto = {
  admin: string;
  address: string;
};
