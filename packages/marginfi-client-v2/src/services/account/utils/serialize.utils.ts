import BN from "bn.js";
import { AccountFlags } from "../types";

/**
 * Convert numeric flag to BN for Solana compatibility
 */
export function accountFlagToBN(flag: AccountFlags): BN {
  return new BN(flag);
}
