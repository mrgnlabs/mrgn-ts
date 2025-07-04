import { PublicKey } from "@solana/web3.js";

import { ValidatorStakeGroup, ValidatorStakeGroupDto } from "../types";

export function dtoToValidatorStakeGroup(validatorStakeGroupDto: ValidatorStakeGroupDto): ValidatorStakeGroup {
  return {
    validator: new PublicKey(validatorStakeGroupDto.validator),
    poolKey: new PublicKey(validatorStakeGroupDto.poolKey),
    poolMintKey: new PublicKey(validatorStakeGroupDto.poolMintKey),
    totalStake: validatorStakeGroupDto.totalStake,
    selectedAccount: {
      pubkey: new PublicKey(validatorStakeGroupDto.selectedAccount.pubkey),
      amount: validatorStakeGroupDto.selectedAccount.amount,
    },
    accounts: validatorStakeGroupDto.accounts.map((account) => ({
      pubkey: new PublicKey(account.pubkey),
      amount: account.amount,
    })),
  };
}
