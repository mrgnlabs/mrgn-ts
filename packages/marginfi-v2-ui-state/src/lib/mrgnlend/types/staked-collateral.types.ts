import { PublicKey } from "@solana/web3.js";

// represents a group of stake accounts associated with a validator
type ValidatorStakeGroup = {
  validator: PublicKey;
  poolKey: PublicKey;
  poolMintKey: PublicKey;
  totalStake: number;
  largestAccount: {
    pubkey: PublicKey;
    amount: number;
  };
  accounts: {
    pubkey: PublicKey;
    amount: number;
  }[];
};

export type { ValidatorStakeGroup };
