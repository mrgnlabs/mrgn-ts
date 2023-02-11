import { Commitment, ConfirmOptions, SendOptions } from "@solana/web3.js";

export const PDA_BANK_LIQUIDITY_VAULT_AUTH_SEED = Buffer.from("liquidity_vault_auth");

export const CAMPAIGN_SEED = Buffer.from("campaign");
export const CAMPAIGN_AUTH_SEED = Buffer.from("campaign_auth");
export const DEPOSIT_MFI_AUTH_SIGNER_SEED = Buffer.from("deposit_mfi_auth");
export const TEMP_TOKEN_ACCOUNT_AUTH_SEED = Buffer.from("ephemeral_token_account_auth");
export const MARGINFI_ACCOUNT_SEED = Buffer.from("marginfi_account");

export const DEFAULT_COMMITMENT: Commitment = "processed";
export const DEFAULT_SEND_OPTS: SendOptions = {
  skipPreflight: false,
  preflightCommitment: DEFAULT_COMMITMENT,
};

export const DEFAULT_CONFIRM_OPTS: ConfirmOptions = {
  commitment: DEFAULT_COMMITMENT,
  ...DEFAULT_SEND_OPTS,
};
