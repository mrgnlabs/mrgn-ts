import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

// ----------------------------------------------------------------------------
// On-chain types
// ----------------------------------------------------------------------------

interface MarginfiGroupRaw {
  admin: PublicKey;
  padding0: BN[];
  padding1: BN[];
}

export type { MarginfiGroupRaw };
