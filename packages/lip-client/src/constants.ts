import { Commitment, ConfirmOptions, SendOptions } from "@solana/web3.js";

export const DEFAULT_COMMITMENT: Commitment = "processed";
export const DEFAULT_SEND_OPTS: SendOptions = {
  skipPreflight: false,
  preflightCommitment: DEFAULT_COMMITMENT,
};

export const DEFAULT_CONFIRM_OPTS: ConfirmOptions = {
  commitment: DEFAULT_COMMITMENT,
  ...DEFAULT_SEND_OPTS,
};
