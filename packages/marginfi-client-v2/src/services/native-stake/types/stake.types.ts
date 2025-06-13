import { PublicKey } from "@solana/web3.js";

// represents a group of stake accounts associated with a validator
export type ValidatorStakeGroup = {
  validator: PublicKey;
  poolKey: PublicKey;
  poolMintKey: PublicKey;
  totalStake: number;
  selectedAccount: {
    pubkey: PublicKey;
    amount: number;
  };
  accounts: {
    pubkey: PublicKey;
    amount: number;
  }[];
};

export type ValidatorStakeGroupDto = {
  validator: string;
  poolKey: string;
  poolMintKey: string;
  totalStake: number;
  selectedAccount: {
    pubkey: string;
    amount: number;
  };
  accounts: {
    pubkey: string;
    amount: number;
  }[];
};

export type StakeAccount = {
  discriminant: number;
  meta: {
    rentExemptReserve: bigint;
    authorized: {
      staker: PublicKey;
      withdrawer: PublicKey;
    };
    lockup: {
      unixTimestamp: bigint;
      epoch: bigint;
      custodian: PublicKey;
    };
  };
  stake: {
    delegation: {
      voterPubkey: PublicKey;
      stake: bigint;
      activationEpoch: bigint;
      deactivationEpoch: bigint;
    };
    creditsObserved: bigint;
  };
};
