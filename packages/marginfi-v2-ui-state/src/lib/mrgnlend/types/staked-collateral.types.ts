import { PublicKey } from "@solana/web3.js";

// represents a group of stake accounts associated with a validator
type ValidatorStakeGroup = {
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

type StakeAccount = {
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

export type { ValidatorStakeGroup, StakeAccount };
