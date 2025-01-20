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
