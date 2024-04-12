import { Commitment, ConfirmOptions, PublicKey, SendOptions } from "@solana/web3.js";

export const DEFAULT_COMMITMENT: Commitment = "processed";

export const DEFAULT_SEND_OPTS: SendOptions = {
  skipPreflight: false,
  preflightCommitment: DEFAULT_COMMITMENT,
};

export const DEFAULT_CONFIRM_OPTS: ConfirmOptions = {
  commitment: DEFAULT_COMMITMENT,
  ...DEFAULT_SEND_OPTS,
};

export const USDC_DECIMALS = 6;

export const WSOL_MINT = new PublicKey("So11111111111111111111111111111111111111112");

export const LST_MINT = new PublicKey("LSTxxxnJzKDFSLr4dUkPcmCf5VyryEqzPLz5j4bpxFp");

export const HOURS_PER_YEAR = 365.25 * 24;
