import { PublicKey } from "@solana/web3.js";
import {
  PDA_BANK_FEE_VAULT_AUTH_SEED,
  PDA_BANK_FEE_VAULT_SEED,
  PDA_BANK_INSURANCE_VAULT_AUTH_SEED,
  PDA_BANK_INSURANCE_VAULT_SEED,
  PDA_BANK_LIQUIDITY_VAULT_AUTH_SEED,
  PDA_BANK_LIQUIDITY_VAULT_SEED,
} from "./constants";
import { BankVaultType } from "./types";

export function getBankVaultSeeds(type: BankVaultType): Buffer {
  switch (type) {
    case BankVaultType.LiquidityVault:
      return PDA_BANK_LIQUIDITY_VAULT_SEED;
    case BankVaultType.InsuranceVault:
      return PDA_BANK_INSURANCE_VAULT_SEED;
    case BankVaultType.FeeVault:
      return PDA_BANK_FEE_VAULT_SEED;
    default:
      throw Error(`Unknown vault type ${type}`);
  }
}

function getBankVaultAuthoritySeeds(type: BankVaultType): Buffer {
  switch (type) {
    case BankVaultType.LiquidityVault:
      return PDA_BANK_LIQUIDITY_VAULT_AUTH_SEED;
    case BankVaultType.InsuranceVault:
      return PDA_BANK_INSURANCE_VAULT_AUTH_SEED;
    case BankVaultType.FeeVault:
      return PDA_BANK_FEE_VAULT_AUTH_SEED;
    default:
      throw Error(`Unknown vault type ${type}`);
  }
}

/**
 * Compute authority PDA for a specific marginfi group bank vault
 */
export function getBankVaultAuthority(
  bankVaultType: BankVaultType,
  bankPk: PublicKey,
  programId: PublicKey,
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([getBankVaultAuthoritySeeds(bankVaultType), bankPk.toBuffer()], programId);
}
