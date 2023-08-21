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

// ----------------------------------------------------------------------------
// Client types
// ----------------------------------------------------------------------------

interface MarginfiGroup {
  admin: PublicKey;
}

export type { MarginfiGroup };

// ----------------------------------------------------------------------------
// Factories
// ----------------------------------------------------------------------------

function parseMarginfiGroup(marginfiGroupRaw: MarginfiGroupRaw): MarginfiGroup {
  return {
    admin: marginfiGroupRaw.admin,
  };
}

export { parseMarginfiGroup };
