import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";

import { MarginfiAccountWrapper } from "@mrgnlabs/marginfi-client-v2";
import { ExtendedBankInfo } from "@mrgnlabs/marginfi-v2-ui-state";

export type TradeSide = "long" | "short";

export enum SimulationStatus {
  IDLE = "idle",
  PREPARING = "preparing",
  SIMULATING = "simulating",
  COMPLETE = "complete",
}

export interface SimulateActionProps {
  txns: (VersionedTransaction | Transaction)[];
  account: MarginfiAccountWrapper;
  bank: ExtendedBankInfo;
}

export const RANDOM_USDC_BANK = new PublicKey("9zSRNNU4oDE3CmaQcjZwnfrhUzxUuBP3o1grryu1oMan"); // Random USDC bank to refetch balances -> should replace this (because if the bank would be removed, we would not be refetching USDC balances), but not sure with what
