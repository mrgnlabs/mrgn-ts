import { PublicKey } from "@solana/web3.js";
import { ValidatorStakeGroup, ValidatorStakeGroupDto } from "../types";

export function validatorStakeGroupToDto(validatorStakeGroup: ValidatorStakeGroup): ValidatorStakeGroupDto {
  return {
    validator: validatorStakeGroup.validator.toBase58(),
    poolKey: validatorStakeGroup.poolKey.toBase58(),
    poolMintKey: validatorStakeGroup.poolMintKey.toBase58(),
    totalStake: validatorStakeGroup.totalStake,
    selectedAccount: {
      pubkey: validatorStakeGroup.selectedAccount.pubkey.toBase58(),
      amount: validatorStakeGroup.selectedAccount.amount,
    },
    accounts: validatorStakeGroup.accounts.map((account) => ({
      pubkey: account.pubkey.toBase58(),
      amount: account.amount,
    })),
  };
}
