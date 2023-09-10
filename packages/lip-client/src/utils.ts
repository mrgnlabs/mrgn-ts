import { calculateApyFromInterest } from "@mrgnlabs/mrgn-common";
import { PublicKey } from "@solana/web3.js";
import {
  CAMPAIGN_AUTH_SEED,
  CAMPAIGN_SEED,
  DEPOSIT_MFI_AUTH_SIGNER_SEED,
  MARGINFI_ACCOUNT_SEED,
  TEMP_TOKEN_ACCOUNT_AUTH_SEED,
} from "./constants";

export function computeGuaranteedApy(duration: number, principal: number, interest: number): number {
  const durationInYears = duration / 365 / 24 / 60 / 60;
  // @todo this needs to be cleaned up, works cleanly when there is no effective compounding right now
  return calculateApyFromInterest(principal, durationInYears, interest);
}

export function getCampaignRewardVault(campaignPk: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CAMPAIGN_SEED, campaignPk.toBuffer()], programId);
}

export function getCampaignRewardVaultAuthority(campaignPk: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([CAMPAIGN_AUTH_SEED, campaignPk.toBuffer()], programId);
}

export function getMfiPdaSigner(depositPk: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([DEPOSIT_MFI_AUTH_SIGNER_SEED, depositPk.toBuffer()], programId);
}

export function getTempTokenAccountAuthority(depositPk: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([TEMP_TOKEN_ACCOUNT_AUTH_SEED, depositPk.toBuffer()], programId);
}

export function getMarginfiAccount(depositPk: PublicKey, programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([MARGINFI_ACCOUNT_SEED, depositPk.toBuffer()], programId);
}
